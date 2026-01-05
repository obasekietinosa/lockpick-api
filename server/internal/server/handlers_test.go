package server

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/obasekietinosa/lockpick-api/internal/config"
	"github.com/obasekietinosa/lockpick-api/internal/socket"
	"github.com/obasekietinosa/lockpick-api/internal/store"
)

// MockStore
type MockStore struct {
	rooms   map[string]*store.Room
	players map[string]*store.Player
	waiting map[string]string // simplified: key -> roomID
}

func NewMockStore() *MockStore {
	return &MockStore{
		rooms:   make(map[string]*store.Room),
		players: make(map[string]*store.Player),
		waiting: make(map[string]string),
	}
}

func (m *MockStore) SaveRoom(ctx context.Context, room *store.Room) error {
	m.rooms[room.ID] = room
	return nil
}
func (m *MockStore) GetRoom(ctx context.Context, roomID string) (*store.Room, error) {
	if r, ok := m.rooms[roomID]; ok {
		return r, nil
	}
	return nil, nil // error handling simplified
}
func (m *MockStore) SavePlayer(ctx context.Context, player *store.Player) error {
	m.players[player.ID] = player
	return nil
}
func (m *MockStore) GetPlayer(ctx context.Context, playerID string) (*store.Player, error) {
	if p, ok := m.players[playerID]; ok {
		return p, nil
	}
	return nil, nil
}
func (m *MockStore) AddPlayerToRoom(ctx context.Context, roomID, playerID string) error {
	return nil
}
func (m *MockStore) GetRoomPlayers(ctx context.Context, roomID string) ([]string, error) {
	var players []string
	for _, p := range m.players {
		if p.RoomID == roomID {
			players = append(players, p.ID)
		}
	}
	return players, nil
}
func (m *MockStore) FindMatchingRoom(ctx context.Context, config *store.GameConfig) (*store.Room, error) {
	// Simple key generation for mock
	key := "mock_key"
	if id, ok := m.waiting[key]; ok {
		delete(m.waiting, key) // Remove (pop)
		return m.rooms[id], nil
	}
	return nil, nil
}
func (m *MockStore) AddWaitingRoom(ctx context.Context, room *store.Room) error {
	m.waiting["mock_key"] = room.ID
	return nil
}
func (m *MockStore) RemoveWaitingRoom(ctx context.Context, roomID string) error {
	return nil
}

func TestHandleCreateGame(t *testing.T) {
	mockStore := NewMockStore()
	hub := socket.NewHub(&config.Config{}, mockStore)
	srv := NewServer(&config.Config{}, hub, mockStore)

	// Test Case 1: Private Game
	config := &store.GameConfig{
		PlayerName:    "Player1",
		HintsEnabled:  true,
		PinLength:     5,
		TimerDuration: 30,
		IsPrivate:     true,
	}
	reqBody, _ := json.Marshal(CreateGameRequest{
		PlayerName: "Host",
		Config:     config,
	})

	req := httptest.NewRequest("POST", "/games", bytes.NewBuffer(reqBody))
	w := httptest.NewRecorder()

	srv.Handler.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}
}

func TestHandleSelectPin(t *testing.T) {
	mockStore := NewMockStore()
	hub := socket.NewHub(&config.Config{}, mockStore)
	srv := NewServer(&config.Config{}, hub, mockStore)

	// Setup: Create Room and Player
	roomID := "room1"
	playerID := "player1"

	room := &store.Room{
		ID: roomID,
		Config: &store.GameConfig{
			PinLength: 5,
		},
	}
	player := &store.Player{
		ID:     playerID,
		RoomID: roomID,
	}

	mockStore.SaveRoom(context.Background(), room)
	mockStore.SavePlayer(context.Background(), player)

	// Test Case: Valid Pin Selection
	reqBody, _ := json.Marshal(SelectPinRequest{
		Pins: []string{"12345", "67890", "54321"},
	})

	req := httptest.NewRequest("POST", "/games/"+roomID+"/players/"+playerID+"/pin", bytes.NewBuffer(reqBody))
	req.SetPathValue("gameID", roomID)
	req.SetPathValue("playerID", playerID)

	w := httptest.NewRecorder()

	srv.Handler.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d. Body: %s", w.Code, w.Body.String())
	}

	// Verify pins in store
	updatedPlayer, _ := mockStore.GetPlayer(context.Background(), playerID)
	if len(updatedPlayer.Pins) != 3 {
		t.Errorf("Expected 3 pins, got %d", len(updatedPlayer.Pins))
	}
}

func TestHandleSelectPin_GameStart(t *testing.T) {
	mockStore := NewMockStore()
	hub := socket.NewHub(&config.Config{}, mockStore)

	// Start Hub to prevent blocking on Broadcast channel
	go hub.Run()

	srv := NewServer(&config.Config{}, hub, mockStore)

	// Setup: Create Room and 2 Players
	roomID := "room_start_test"
	room := &store.Room{
		ID:     roomID,
		Status: "waiting",
		Config: &store.GameConfig{PinLength: 4},
	}
	mockStore.SaveRoom(context.Background(), room)

	player1 := &store.Player{ID: "p1", RoomID: roomID}
	player2 := &store.Player{ID: "p2", RoomID: roomID}
	mockStore.SavePlayer(context.Background(), player1)
	mockStore.SavePlayer(context.Background(), player2)

	// Player 1 submits pins
	pins1 := []string{"1111", "2222", "3333"}
	body1, _ := json.Marshal(SelectPinRequest{Pins: pins1})
	req1 := httptest.NewRequest("POST", "/games/"+roomID+"/players/p1/pin", bytes.NewBuffer(body1))
	req1.SetPathValue("gameID", roomID)
	req1.SetPathValue("playerID", "p1")
	w1 := httptest.NewRecorder()
	srv.Handler.ServeHTTP(w1, req1)

	if w1.Code != http.StatusOK {
		t.Errorf("Player 1 failed: %d", w1.Code)
	}

	// Verify Room Status still "waiting"
	updatedRoom, _ := mockStore.GetRoom(context.Background(), roomID)
	if updatedRoom.Status != "waiting" {
		t.Errorf("Room status should be waiting, got %s", updatedRoom.Status)
	}

	// Player 2 submits pins -> Should trigger start
	pins2 := []string{"4444", "5555", "6666"}
	body2, _ := json.Marshal(SelectPinRequest{Pins: pins2})
	req2 := httptest.NewRequest("POST", "/games/"+roomID+"/players/p2/pin", bytes.NewBuffer(body2))
	req2.SetPathValue("gameID", roomID)
	req2.SetPathValue("playerID", "p2")
	w2 := httptest.NewRecorder()
	srv.Handler.ServeHTTP(w2, req2)

	if w2.Code != http.StatusOK {
		t.Errorf("Player 2 failed: %d", w2.Code)
	}

	// Verify Room Status is "playing"
	updatedRoom, _ = mockStore.GetRoom(context.Background(), roomID)
	if updatedRoom.Status != "playing" {
		t.Errorf("Room status should be playing, got %s", updatedRoom.Status)
	}
}
