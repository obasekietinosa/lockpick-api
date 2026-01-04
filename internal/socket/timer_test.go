package socket

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/obasekietinosa/lockpick-api/internal/config"
	"github.com/obasekietinosa/lockpick-api/internal/store"
)

func TestHub_StartRoundTimer_RoundEnd(t *testing.T) {
	// Setup
	mockStore := NewMockStore()
	cfg := &config.Config{}
	hub := NewHub(cfg, mockStore)

	go hub.Run()

	roomID := "room1"
	room := &store.Room{
		ID:           roomID,
		Config:       &store.GameConfig{TimerDuration: 1}, // 1 second timer
		CurrentRound: 1,
	}
	mockStore.SaveRoom(nil, room)

	// Create a client to listen
	client := &Client{
		Hub:  hub,
		Send: make(chan []byte, 10),
	}
	hub.Register <- client

	// Allow registration to process
	time.Sleep(100 * time.Millisecond)

	// Start Timer
	hub.StartRoundTimer(roomID)

	// Wait for round_end message
	select {
	case msgBytes := <-client.Send:
		var msg GameMessage
		if err := json.Unmarshal(msgBytes, &msg); err != nil {
			t.Fatalf("Failed to unmarshal message: %v", err)
		}
		if msg.Type != "round_end" {
			t.Errorf("Expected round_end, got %s", msg.Type)
		}
		// Verify round number logic if needed
		// payload round should be 1
		payload := msg.Payload.(map[string]interface{})
		if r, ok := payload["round"].(float64); ok {
			if int(r) != 1 {
				t.Errorf("Expected round 1, got %d", int(r))
			}
		}
	case <-time.After(2 * time.Second):
		t.Fatal("Timeout waiting for round_end message")
	}

	// Verify room round incremented
	updatedRoom, _ := mockStore.GetRoom(nil, roomID)
	if updatedRoom.CurrentRound != 2 {
		t.Errorf("Expected room round to be 2, got %d", updatedRoom.CurrentRound)
	}
}

func TestHub_Round0_Bug(t *testing.T) {
	// Setup
	mockStore := NewMockStore()
	cfg := &config.Config{}
	hub := NewHub(cfg, mockStore)

	go hub.Run()

	roomID := "room0"
	room := &store.Room{
		ID:           roomID,
		Config:       &store.GameConfig{TimerDuration: 1}, // 1 second timer
		CurrentRound: 0, // Uninitialized
	}
	mockStore.SaveRoom(nil, room)

	client := &Client{Hub: hub, Send: make(chan []byte, 10)}
	hub.Register <- client
	time.Sleep(50 * time.Millisecond)

	// Start Timer (Simulating HandleSelectPin calling StartRoundTimer)
	hub.StartRoundTimer(roomID)

	// Wait for round_end
	select {
	case msgBytes := <-client.Send:
		var msg GameMessage
		json.Unmarshal(msgBytes, &msg)
		if msg.Type == "round_end" {
			payload := msg.Payload.(map[string]interface{})
			r := int(payload["round"].(float64))
			if r != 0 {
				t.Logf("Round ended with round number: %d", r)
			} else {
				t.Log("Round ended with round number: 0. This confirms the bug if expected behavior was 1.")
			}
		}
	case <-time.After(2 * time.Second):
		t.Fatal("Timeout")
	}

	updatedRoom, _ := mockStore.GetRoom(nil, roomID)
	if updatedRoom.CurrentRound == 1 {
		t.Log("Room round incremented to 1.")
	} else {
		t.Errorf("Room round is %d", updatedRoom.CurrentRound)
	}
}
