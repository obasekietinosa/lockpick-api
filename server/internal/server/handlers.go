package server

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/obasekietinosa/lockpick-api/internal/socket"
	"github.com/obasekietinosa/lockpick-api/internal/store"
)

type CreateGameRequest struct {
	PlayerName string            `json:"player_name"`
	Config     *store.GameConfig `json:"config"`
}

type JoinGameRequest struct {
	PlayerName string `json:"player_name"`
	RoomID     string `json:"room_id"`
}

type CreateGameResponse struct {
	RoomID   string            `json:"room_id"`
	PlayerID string            `json:"player_id"`
	Status   string            `json:"status"`
	Config   *store.GameConfig `json:"config,omitempty"`
}

type JoinGameResponse struct {
	RoomID   string            `json:"room_id"`
	PlayerID string            `json:"player_id"`
	Status   string            `json:"status"`
	Config   *store.GameConfig `json:"config"`
}

// @Summary Create a new game
// @Description Create a new game room, optionally private or public for matchmaking
// @Tags games
// @Accept json
// @Produce json
// @Param request body CreateGameRequest true "Game configuration"
// @Success 200 {object} CreateGameResponse
// @Router /games [post]
func (s *Server) HandleCreateGame(w http.ResponseWriter, r *http.Request) {
	var req CreateGameRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.PlayerName == "" || req.Config == nil {
		http.Error(w, "Player name and config are required", http.StatusBadRequest)
		return
	}

	// Logic for Random Matchmaking
	if !req.Config.IsPrivate {
		// Try to find a matching room
		room, err := s.store.FindMatchingRoom(r.Context(), req.Config)
		if err != nil {
			http.Error(w, "Error finding matching room", http.StatusInternalServerError)
			return
		}

		if room != nil {
			// Match found! Join this room.
			// Create Player ID
			playerID := uuid.New().String()
			player := &store.Player{
				ID:     playerID,
				Name:   req.PlayerName,
				RoomID: room.ID,
			}

			if err := s.store.SavePlayer(r.Context(), player); err != nil {
				http.Error(w, "Failed to create player", http.StatusInternalServerError)
				return
			}

			if err := s.store.AddPlayerToRoom(r.Context(), room.ID, player.ID); err != nil {
				http.Error(w, "Failed to join room", http.StatusInternalServerError)
				return
			}

			// Remove from waiting list
			if err := s.store.RemoveWaitingRoom(r.Context(), room.ID); err != nil {
				// Log error but proceed?
			}

			// Update room status? Ideally we set it to something else, but for now "waiting" -> "matched" on client side
			// Or we update room.Status = "playing"
			room.Status = "playing"
			if err := s.store.SaveRoom(r.Context(), room); err != nil {
				// Non-critical if fails, but good to have
			}

			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(CreateGameResponse{
				RoomID:   room.ID,
				PlayerID: playerID,
				Status:   "matched",
				Config:   room.Config,
			})
			return
		}
	}

	// Create new room (Private or No Match Found)
	roomID := uuid.New().String()
	playerID := uuid.New().String()

	player := &store.Player{
		ID:     playerID,
		Name:   req.PlayerName,
		RoomID: roomID,
	}

	room := &store.Room{
		ID:           roomID,
		HostID:       playerID,
		Status:       "waiting",
		Config:       req.Config,
		CurrentRound: 1,
		CreatedAt:    time.Now(),
	}

	if err := s.store.SaveRoom(r.Context(), room); err != nil {
		http.Error(w, "Failed to create room", http.StatusInternalServerError)
		return
	}

	if err := s.store.SavePlayer(r.Context(), player); err != nil {
		http.Error(w, "Failed to create player", http.StatusInternalServerError)
		return
	}

	if err := s.store.AddPlayerToRoom(r.Context(), roomID, playerID); err != nil {
		http.Error(w, "Failed to add player to room", http.StatusInternalServerError)
		return
	}

	// Add to waiting list if it's a random search game
	if !req.Config.IsPrivate {
		if err := s.store.AddWaitingRoom(r.Context(), room); err != nil {
			http.Error(w, "Failed to add to matchmaking", http.StatusInternalServerError)
			return
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(CreateGameResponse{
		RoomID:   room.ID,
		PlayerID: playerID,
		Status:   "waiting",
	})
}

// @Summary Join an existing game
// @Description Join a game by room ID
// @Tags games
// @Accept json
// @Produce json
// @Param request body JoinGameRequest true "Join parameters"
// @Success 200 {object} JoinGameResponse
// @Router /games/join [post]
func (s *Server) HandleJoinGame(w http.ResponseWriter, r *http.Request) {
	var req JoinGameRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.PlayerName == "" || req.RoomID == "" {
		http.Error(w, "Player name and Room ID are required", http.StatusBadRequest)
		return
	}

	// Check if room exists
	room, err := s.store.GetRoom(r.Context(), req.RoomID)
	if err != nil {
		http.Error(w, "Room not found", http.StatusNotFound)
		return
	}

	// Check if room is full (optional, for now we just add)
	players, err := s.store.GetRoomPlayers(r.Context(), req.RoomID)
	if err != nil {
		http.Error(w, "Failed to check room players", http.StatusInternalServerError)
		return
	}

	if len(players) >= 2 {
		http.Error(w, "Room is full", http.StatusConflict) // 409 Conflict
		return
	}

	playerID := uuid.New().String()
	player := &store.Player{
		ID:     playerID,
		Name:   req.PlayerName,
		RoomID: req.RoomID,
	}

	if err := s.store.SavePlayer(r.Context(), player); err != nil {
		http.Error(w, "Failed to create player", http.StatusInternalServerError)
		return
	}

	if err := s.store.AddPlayerToRoom(r.Context(), req.RoomID, playerID); err != nil {
		http.Error(w, "Failed to join room", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(JoinGameResponse{
		RoomID:   room.ID,
		PlayerID: playerID,
		Status:   "joined",
		Config:   room.Config,
	})
}

type SelectPinRequest struct {
	Pins []string `json:"pins"`
}

type SelectPinResponse struct {
	Status string `json:"status"`
}

// @Summary Select pins for the game
// @Description Select pins for all rounds of the game
// @Tags games
// @Accept json
// @Produce json
// @Param gameID path string true "Game ID (Room ID)"
// @Param playerID path string true "Player ID"
// @Param request body SelectPinRequest true "Selected pins"
// @Success 200 {object} SelectPinResponse
// @Router /games/{gameID}/players/{playerID}/pin [post]
func (s *Server) HandleSelectPin(w http.ResponseWriter, r *http.Request) {
	roomID := r.PathValue("gameID")
	playerID := r.PathValue("playerID")

	var req SelectPinRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate number of pins (should be 3 for 3 rounds)
	if len(req.Pins) != 3 {
		http.Error(w, "Exactly 3 pins are required", http.StatusBadRequest)
		return
	}

	// Fetch room to check config
	room, err := s.store.GetRoom(r.Context(), roomID)
	if err != nil {
		http.Error(w, "Room not found", http.StatusNotFound)
		return
	}

	// Validate pin length
	for _, pin := range req.Pins {
		if len(pin) != room.Config.PinLength {
			http.Error(w, fmt.Sprintf("All pins must be of length %d", room.Config.PinLength), http.StatusBadRequest)
			return
		}
		// Validate numeric
		for _, char := range pin {
			if char < '0' || char > '9' {
				http.Error(w, "Pins must contain only digits", http.StatusBadRequest)
				return
			}
		}
	}

	// Fetch Player
	player, err := s.store.GetPlayer(r.Context(), playerID)
	if err != nil {
		http.Error(w, "Player not found", http.StatusNotFound)
		return
	}

	// Verify player belongs to room
	if player.RoomID != roomID {
		http.Error(w, "Player does not belong to this room", http.StatusForbidden)
		return
	}

	// Generate hints if hints are enabled? No, hints are generated during gameplay.
	// But we might want to validate something else? No.

	// Save pins
	player.Pins = req.Pins
	if err := s.store.SavePlayer(r.Context(), player); err != nil {
		http.Error(w, "Failed to save pins", http.StatusInternalServerError)
		return
	}

	// Check if all players have selected pins
	roomPlayers, err := s.store.GetRoomPlayers(r.Context(), roomID)
	if err != nil {
		// Log error but don't fail the request? Or maybe fail?
		// Stick to success for now, but logged.
		fmt.Printf("Error getting room players: %v\n", err)
	} else {
		log.Printf("Checking if all players ready. Player count: %d", len(roomPlayers))
		if len(roomPlayers) == 2 {
			allReady := true
			for _, pid := range roomPlayers {
				p, err := s.store.GetPlayer(r.Context(), pid)
				if err != nil || len(p.Pins) != 3 {
					allReady = false
					break
				}
			}

			log.Printf("All players found: %v, All Ready: %v", roomPlayers, allReady)

			if allReady {
				log.Println("All players ready. Starting game...")
				// Update room status
				room.Status = "playing"
				if err := s.store.SaveRoom(r.Context(), room); err != nil {
					fmt.Printf("Error saving room status: %v\n", err)
				}

				// Broadcast Game Start
				msg := socket.GameMessage{
					Type: "game_start",
					Payload: map[string]interface{}{
						"room_id": room.ID,
						"status":  "playing",
					},
				}
				msgBytes, _ := json.Marshal(msg)
				log.Printf("Broadcasting game_start message to room %s", room.ID)
				s.hub.Broadcast <- msgBytes

				// Start the timer for Round 1
				s.hub.StartRoundTimer(room.ID)
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(SelectPinResponse{
		Status: "pins_selected",
	})
}

// @Summary Get game state
// @Description Get current game state
// @Tags games
// @Accept json
// @Produce json
// @Param gameID path string true "Game ID (Room ID)"
// @Success 200 {object} store.Room
// @Router /games/{gameID} [get]
func (s *Server) HandleGetGame(w http.ResponseWriter, r *http.Request) {
	roomID := r.PathValue("gameID")

	room, err := s.store.GetRoom(r.Context(), roomID)
	if err != nil {
		http.Error(w, "Room not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(room)
}
