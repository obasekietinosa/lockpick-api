package socket

import (
	"context"
	"encoding/json"
	"log"

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
	}
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
	ctx := context.Background()

	// Prepare Round End Message
	msg := GameMessage{
		Type: "round_end",
		Payload: map[string]interface{}{
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

	// Notify Start of New Round
	startMsg := GameMessage{
		Type: "round_start",
		Payload: map[string]interface{}{
			"round": room.CurrentRound,
		},
	}
	startBytes, _ := json.Marshal(startMsg)
	h.Broadcast <- startBytes
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
			"winner_id": winnerID,
			"scores":    room.Scores,
			"is_draw":   isDraw,
		},
	}

	responseBytes, _ := json.Marshal(msg)
	h.Broadcast <- responseBytes
}
