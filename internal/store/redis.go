package store

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/redis/go-redis/v9"
)

type RedisStore struct {
	client *redis.Client
}

func NewRedisStore(addr, password string) (*RedisStore, error) {
	client := redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: password,
	})

	ctx := context.Background()
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to redis: %w", err)
	}

	return &RedisStore{client: client}, nil
}

func (s *RedisStore) SaveRoom(ctx context.Context, room *Room) error {
	data, err := json.Marshal(room)
	if err != nil {
		return fmt.Errorf("failed to marshal room: %w", err)
	}

	key := fmt.Sprintf("room:%s", room.ID)
	return s.client.Set(ctx, key, data, 0).Err()
}

func (s *RedisStore) GetRoom(ctx context.Context, roomID string) (*Room, error) {
	key := fmt.Sprintf("room:%s", roomID)
	data, err := s.client.Get(ctx, key).Bytes()
	if err != nil {
		if err == redis.Nil {
			return nil, fmt.Errorf("room not found")
		}
		return nil, fmt.Errorf("failed to get room: %w", err)
	}

	var room Room
	if err := json.Unmarshal(data, &room); err != nil {
		return nil, fmt.Errorf("failed to unmarshal room: %w", err)
	}

	return &room, nil
}

func (s *RedisStore) SavePlayer(ctx context.Context, player *Player) error {
	data, err := json.Marshal(player)
	if err != nil {
		return fmt.Errorf("failed to marshal player: %w", err)
	}

	key := fmt.Sprintf("player:%s", player.ID)
	return s.client.Set(ctx, key, data, 0).Err()
}

func (s *RedisStore) GetPlayer(ctx context.Context, playerID string) (*Player, error) {
	key := fmt.Sprintf("player:%s", playerID)
	data, err := s.client.Get(ctx, key).Bytes()
	if err != nil {
		if err == redis.Nil {
			return nil, fmt.Errorf("player not found")
		}
		return nil, fmt.Errorf("failed to get player: %w", err)
	}

	var player Player
	if err := json.Unmarshal(data, &player); err != nil {
		return nil, fmt.Errorf("failed to unmarshal player: %w", err)
	}

	return &player, nil
}

func (s *RedisStore) AddPlayerToRoom(ctx context.Context, roomID, playerID string) error {
	key := fmt.Sprintf("room:%s:players", roomID)
	return s.client.SAdd(ctx, key, playerID).Err()
}

func (s *RedisStore) GetRoomPlayers(ctx context.Context, roomID string) ([]string, error) {
	key := fmt.Sprintf("room:%s:players", roomID)
	return s.client.SMembers(ctx, key).Result()
}

func (s *RedisStore) FindMatchingRoom(ctx context.Context, config *GameConfig) (*Room, error) {
	key := fmt.Sprintf("waiting:%d:%v:%d", config.PinLength, config.HintsEnabled, config.TimerDuration)
	roomID, err := s.client.SPop(ctx, key).Result()
	if err != nil {
		if err == redis.Nil {
			return nil, nil // No matching room found
		}
		return nil, fmt.Errorf("failed to find matching room: %w", err)
	}

	return s.GetRoom(ctx, roomID)
}

func (s *RedisStore) AddWaitingRoom(ctx context.Context, room *Room) error {
	if room.Config == nil {
		return fmt.Errorf("room config is nil")
	}
	key := fmt.Sprintf("waiting:%d:%v:%d", room.Config.PinLength, room.Config.HintsEnabled, room.Config.TimerDuration)
	return s.client.SAdd(ctx, key, room.ID).Err()
}

func (s *RedisStore) RemoveWaitingRoom(ctx context.Context, roomID string) error {
	// This is a bit inefficient as we don't know the config just from ID.
	// But in the "Join" flow we usually have the room object or at least we can fetch it.
	// For now, let's assume we might need to fetch the room first if we want to remove it from waiting list.
	// However, the interface asks for roomID.

	// Optimization: If we fetch the room, we can construct the key.
	room, err := s.GetRoom(ctx, roomID)
	if err != nil {
		return err
	}
	if room.Config == nil {
		return nil // Should be an error?
	}

	key := fmt.Sprintf("waiting:%d:%v:%d", room.Config.PinLength, room.Config.HintsEnabled, room.Config.TimerDuration)
	return s.client.SRem(ctx, key, roomID).Err()
}
