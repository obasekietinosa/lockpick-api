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
	return nil, nil
}
func (m *MockStore) AddPlayerToRoom(ctx context.Context, roomID, playerID string) error {
	return nil
}
func (m *MockStore) GetRoomPlayers(ctx context.Context, roomID string) ([]string, error) {
	return []string{}, nil
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
	hub := socket.NewHub(&config.Config{})
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
