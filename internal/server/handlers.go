package server

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/google/uuid"
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

// @Summary Create a new game
// @Description Create a new game room, optionally private or public for matchmaking
// @Tags games
// @Accept json
// @Produce json
// @Param request body CreateGameRequest true "Game configuration"
// @Success 200 {object} map[string]interface{}
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
			json.NewEncoder(w).Encode(map[string]interface{}{
				"room_id":   room.ID,
				"player_id": playerID,
				"status":    "matched",
				"config":    room.Config,
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
		ID:        roomID,
		HostID:    playerID,
		Status:    "waiting",
		Config:    req.Config,
		CreatedAt: time.Now(),
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
	json.NewEncoder(w).Encode(map[string]interface{}{
		"room_id":   room.ID,
		"player_id": playerID,
		"status":    "waiting",
	})
}

// @Summary Join an existing game
// @Description Join a game by room ID
// @Tags games
// @Accept json
// @Produce json
// @Param request body JoinGameRequest true "Join parameters"
// @Success 200 {object} map[string]interface{}
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
	json.NewEncoder(w).Encode(map[string]interface{}{
		"room_id":   room.ID,
		"player_id": playerID,
		"status":    "joined",
		"config":    room.Config,
	})
}
