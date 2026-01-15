package socket

import (
	"context"
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/obasekietinosa/lockpick-api/internal/config"
	"github.com/obasekietinosa/lockpick-api/internal/store"
)

type Hub struct {
	// Store for game state persistence
	store store.Store

	// Game logic helper
	gameLogic *GameLogic

	// Registered clients.
	Clients map[*Client]bool

	// Room timers
	timers map[string]context.CancelFunc
	mu     sync.Mutex

	// Inbound messages from the clients.
	Broadcast chan []byte

	// Register requests from the clients.
	Register chan *Client

	// Unregister requests from clients.
	Unregister chan *Client
}

func NewHub(cfg *config.Config, store store.Store) *Hub {
	return &Hub{
		Broadcast:  make(chan []byte),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
		Clients:    make(map[*Client]bool),
		timers:     make(map[string]context.CancelFunc),
		store:      store,
		gameLogic:  NewGameLogic(),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			h.Clients[client] = true
		case client := <-h.Unregister:
			if _, ok := h.Clients[client]; ok {
				delete(h.Clients, client)
				close(client.Send)
			}
		case message := <-h.Broadcast:
			log.Printf("Hub received broadcast message. Active clients: %d", len(h.Clients))
			for client := range h.Clients {
				select {
				case client.Send <- message:
				default:
					close(client.Send)
					delete(h.Clients, client)
				}
			}
		}
	}
}

func (h *Hub) HandleMessage(client *Client, msg GameMessage) {
	switch msg.Type {
	case "guess":
		// Payload is map[string]interface{}
		// Roundtrip via JSON to decode into struct safely
		payloadBytes, err := json.Marshal(msg.Payload)
		if err != nil {
			log.Printf("Error marshaling payload: %v", err)
			return
		}
		var payload GuessPayload
		if err := json.Unmarshal(payloadBytes, &payload); err != nil {
			log.Printf("Error unmarshaling payload: %v", err)
			return
		}
		h.handleGuess(client, payload)
	case "player_ready":
		payloadBytes, err := json.Marshal(msg.Payload)
		if err != nil {
			log.Printf("Error marshaling payload: %v", err)
			return
		}
		var payload PlayerReadyPayload
		if err := json.Unmarshal(payloadBytes, &payload); err != nil {
			log.Printf("Error unmarshaling payload: %v", err)
			return
		}
		h.handlePlayerReady(client, payload)
	}
}

func (h *Hub) handlePlayerReady(client *Client, payload PlayerReadyPayload) {
	// Lock critical section to prevent race conditions on Room updates
	h.mu.Lock()
	defer h.mu.Unlock()

	// Check if round is already active (timer running)
	if _, active := h.timers[payload.RoomID]; active {
		log.Printf("Player %s tried to ready up, but round is already active", payload.PlayerID)
		return
	}

	ctx := context.Background()

	room, err := h.store.GetRoom(ctx, payload.RoomID)
	if err != nil {
		log.Printf("Error getting room: %v", err)
		return
	}

	// Add player to ReadyPlayers if not already present
	alreadyReady := false
	for _, pid := range room.ReadyPlayers {
		if pid == payload.PlayerID {
			alreadyReady = true
			break
		}
	}

	if !alreadyReady {
		room.ReadyPlayers = append(room.ReadyPlayers, payload.PlayerID)
		if err := h.store.SaveRoom(ctx, room); err != nil {
			log.Printf("Error saving room: %v", err)
			return
		}
	}

	// Check if both players are ready
	players, err := h.store.GetRoomPlayers(ctx, room.ID)
	if err != nil {
		log.Printf("Error getting players: %v", err)
		return
	}

	if len(room.ReadyPlayers) >= len(players) {
		// All players ready, start the round

		// Start Round
		startMsg := GameMessage{
			Type: "round_start",
			Payload: map[string]interface{}{
				"room_id": room.ID,
				"round":   room.CurrentRound,
			},
		}
		startBytes, _ := json.Marshal(startMsg)
		h.Broadcast <- startBytes

		// Reset ReadyPlayers
		room.ReadyPlayers = []string{}
		if err := h.store.SaveRoom(ctx, room); err != nil {
			log.Printf("Error saving room: %v", err)
		}

		h.startRoundTimerLocked(room.ID)
	}
}

func (h *Hub) StartRoundTimer(roomID string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.startRoundTimerLocked(roomID)
}

func (h *Hub) startRoundTimerLocked(roomID string) {
	ctx := context.Background()
	room, err := h.store.GetRoom(ctx, roomID)
	if err != nil {
		log.Printf("Error getting room for timer: %v", err)
		return
	}

	if room.Config.TimerDuration <= 0 {
		return
	}

	// Set RoundStartTime
	now := time.Now()
	room.RoundStartTime = &now
	if err := h.store.SaveRoom(ctx, room); err != nil {
		log.Printf("Error saving room start time: %v", err)
	}

	// Cancel existing timer if any
	if cancel, ok := h.timers[roomID]; ok {
		cancel()
	}

	// Create new timer context
	timerCtx, cancel := context.WithCancel(context.Background())
	h.timers[roomID] = cancel

	go func() {
		select {
		case <-time.After(time.Duration(room.Config.TimerDuration) * time.Second):
			// Timeout occurred
			h.handleRoundTimeout(roomID, room.CurrentRound)
		case <-timerCtx.Done():
			// Timer cancelled (round ended)
			return
		}
	}()
}

func (h *Hub) handleRoundTimeout(roomID string, roundNumber int) {
	ctx := context.Background()
	room, err := h.store.GetRoom(ctx, roomID)
	if err != nil {
		log.Printf("Error getting room for timeout: %v", err)
		return
	}

	// Check if round is still the same (race condition check)
	if room.CurrentRound != roundNumber {
		return
	}

	log.Printf("Round %d timed out for room %s", roundNumber, roomID)

	// Trigger Draw
	h.handleRoundEnd(room, "")
}

func (h *Hub) handleGuess(client *Client, payload GuessPayload) {
	log.Printf("Handling guess from room %s: %s", payload.RoomID, payload.Guess)

	ctx := context.Background()

	// 1. Fetch Room
	room, err := h.store.GetRoom(ctx, payload.RoomID)
	if err != nil {
		log.Printf("Error getting room: %v", err)
		return
	}

	// Validate Round
	if payload.Round != 0 && payload.Round != room.CurrentRound {
		log.Printf("Ignored guess from %s: round mismatch (client: %d, server: %d)", payload.PlayerID, payload.Round, room.CurrentRound)
		return
	}

	// Validate Round Active (Timer check)
	h.mu.Lock()
	_, timerActive := h.timers[payload.RoomID]
	h.mu.Unlock()

	if !timerActive {
		log.Printf("Ignored guess from %s: round not active (no timer)", payload.PlayerID)
		return
	}

	// 2. Identify Current Player and Opponent
	players, err := h.store.GetRoomPlayers(ctx, payload.RoomID)
	if err != nil {
		log.Printf("Error getting players: %v", err)
		return
	}

	var opponentID string
	var playerID string

	playerID = payload.PlayerID // Validated below

	if len(players) != 2 {
		log.Printf("Room %s does not have 2 players", payload.RoomID)
		return
	}

	for _, pid := range players {
		if pid != playerID {
			opponentID = pid
		}
	}

	// 3. Get Opponent's Pin
	opponent, err := h.store.GetPlayer(ctx, opponentID)
	if err != nil {
		log.Printf("Error getting opponent: %v", err)
		return
	}

	if room.CurrentRound < 1 || room.CurrentRound > 3 {
		// Auto-correct if 0
		if room.CurrentRound == 0 {
			room.CurrentRound = 1
			// Save the correction to prevent future issues
			if err := h.store.SaveRoom(ctx, room); err != nil {
				log.Printf("Error saving room correction: %v", err)
			}
		} else {
			log.Printf("Invalid round number: %d", room.CurrentRound)
			return
		}
	}

	// Pins are 0-indexed, so round 1 is index 0
	if len(opponent.Pins) < room.CurrentRound {
		log.Printf("Opponent does not have enough pins for round %d", room.CurrentRound)
		return
	}
	targetPin := opponent.Pins[room.CurrentRound-1]

	// 4. Generate Hints
	hints := h.gameLogic.GenerateHints(payload.Guess, targetPin)

	// 5. Broadcast Result
	response := GameMessage{
		Type: "guess_result",
		Payload: map[string]interface{}{
			"room_id":   payload.RoomID,
			"player_id": playerID,
			"guess":     payload.Guess,
			"hints":     hints,
		},
	}

	responseBytes, _ := json.Marshal(response)
	h.Broadcast <- responseBytes

	// 6. Check Win
	if h.gameLogic.IsWin(payload.Guess, targetPin) {
		// Calculate Score
		if room.Scores == nil {
			room.Scores = make(map[string]int)
		}
		room.Scores[playerID]++

		// End Round
		h.handleRoundEnd(room, playerID)
	}
}

func (h *Hub) handleRoundEnd(room *store.Room, winnerID string) {
	// Cancel timer for this room
	h.mu.Lock()
	if cancel, ok := h.timers[room.ID]; ok {
		cancel()
		delete(h.timers, room.ID)
	}
	h.mu.Unlock()

	ctx := context.Background()

	// Prepare Round End Message
	msg := GameMessage{
		Type: "round_end",
		Payload: map[string]interface{}{
			"room_id":   room.ID,
			"winner_id": winnerID,
			"round":     room.CurrentRound,
			"scores":    room.Scores,
		},
	}

	// Broadcast
	responseBytes, _ := json.Marshal(msg)
	h.Broadcast <- responseBytes

	// Check for Game End
	if room.CurrentRound >= 3 {
		// Game Over
		h.handleGameEnd(room)
		return
	}

	// Advance Round
	room.CurrentRound++
	if err := h.store.SaveRoom(ctx, room); err != nil {
		log.Printf("Error saving room state: %v", err)
	}

	// Wait for players to be ready before starting the next round
	// We do NOT send round_start here anymore.
}

func (h *Hub) handleGameEnd(room *store.Room) {
	// Determine Overall Winner
	var winnerID string
	maxScore := -1
	isDraw := false

	for pid, score := range room.Scores {
		if score > maxScore {
			maxScore = score
			winnerID = pid
			isDraw = false
		} else if score == maxScore {
			isDraw = true
		}
	}

	status := "finished"
	if isDraw {
		winnerID = "" // No winner
	}

	room.Status = status
	h.store.SaveRoom(context.Background(), room)

	msg := GameMessage{
		Type: "game_end",
		Payload: map[string]interface{}{
			"room_id":   room.ID,
			"winner_id": winnerID,
			"scores":    room.Scores,
			"is_draw":   isDraw,
		},
	}

	responseBytes, _ := json.Marshal(msg)
	h.Broadcast <- responseBytes
}
