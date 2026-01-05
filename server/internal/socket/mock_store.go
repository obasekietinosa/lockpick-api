package socket

import (
	"context"
	"github.com/obasekietinosa/lockpick-api/internal/store"
)

type MockStore struct {
	Rooms   map[string]*store.Room
	Players map[string]*store.Player
}

func NewMockStore() *MockStore {
	return &MockStore{
		Rooms:   make(map[string]*store.Room),
		Players: make(map[string]*store.Player),
	}
}

func (m *MockStore) SaveRoom(ctx context.Context, room *store.Room) error {
	m.Rooms[room.ID] = room
	return nil
}

func (m *MockStore) GetRoom(ctx context.Context, roomID string) (*store.Room, error) {
	if r, ok := m.Rooms[roomID]; ok {
		return r, nil
	}
	// Return error or nil? Real redis returns error if not found.
	return nil, nil
}

func (m *MockStore) SavePlayer(ctx context.Context, player *store.Player) error {
	m.Players[player.ID] = player
	return nil
}

func (m *MockStore) GetPlayer(ctx context.Context, playerID string) (*store.Player, error) {
	if p, ok := m.Players[playerID]; ok {
		return p, nil
	}
	return nil, nil
}

func (m *MockStore) AddPlayerToRoom(ctx context.Context, roomID, playerID string) error {
	return nil // Simplified
}

func (m *MockStore) GetRoomPlayers(ctx context.Context, roomID string) ([]string, error) {
	var pids []string
	for _, p := range m.Players {
		if p.RoomID == roomID {
			pids = append(pids, p.ID)
		}
	}
	return pids, nil
}

func (m *MockStore) FindMatchingRoom(ctx context.Context, config *store.GameConfig) (*store.Room, error) {
	return nil, nil
}

func (m *MockStore) AddWaitingRoom(ctx context.Context, room *store.Room) error {
	return nil
}

func (m *MockStore) RemoveWaitingRoom(ctx context.Context, roomID string) error {
	return nil
}
