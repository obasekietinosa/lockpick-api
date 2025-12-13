package store

import (
	"context"
	"time"
)

// GameConfig holds the configuration for a game session
type GameConfig struct {
	PlayerName    string `json:"player_name"`
	HintsEnabled  bool   `json:"hints_enabled"`
	PinLength     int    `json:"pin_length"`
	TimerDuration int    `json:"timer_duration"` // 0 means no timer
	IsPrivate     bool   `json:"is_private"`
}

// Player represents a participant in the game
type Player struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	RoomID string `json:"room_id"`
}

// Room represents a game room
type Room struct {
	ID        string      `json:"id"`
	HostID    string      `json:"host_id"`
	Status    string      `json:"status"` // e.g., "waiting", "playing", "finished"
	Config    *GameConfig `json:"config"`
	CreatedAt time.Time   `json:"created_at"`
}

// Store defines the interface for data persistence
type Store interface {
	SaveRoom(ctx context.Context, room *Room) error
	GetRoom(ctx context.Context, roomID string) (*Room, error)
	SavePlayer(ctx context.Context, player *Player) error
	GetPlayer(ctx context.Context, playerID string) (*Player, error)
	AddPlayerToRoom(ctx context.Context, roomID, playerID string) error
	GetRoomPlayers(ctx context.Context, roomID string) ([]string, error)
}
