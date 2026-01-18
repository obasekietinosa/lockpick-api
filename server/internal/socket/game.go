package socket

import (
	"log"
)

// GameMessage represents the structure of messages sent over the websocket
type GameMessage struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
}

// GuessPayload represents the payload for a guess message
type GuessPayload struct {
	RoomID   string `json:"room_id"`
	PlayerID string `json:"player_id"`
	Guess    string `json:"guess"`
	Round    int    `json:"round"`
}

// PlayerReadyPayload represents the payload for a player ready message
type PlayerReadyPayload struct {
	RoomID   string `json:"room_id"`
	PlayerID string `json:"player_id"`
}

// GameLogic handles the core rules of the game
type GameLogic struct{}

// NewGameLogic creates a new game logic handler
func NewGameLogic() *GameLogic {
	return &GameLogic{}
}

// GenerateHints compares the guess against the correct pin and returns the feedback
// 0 = Grey (Incorrect)
// 1 = Orange (Correct digit, wrong position)
// 2 = Green (Correct digit, correct position)
// Returns a slice of integers representing the hint for each position
func (g *GameLogic) GenerateHints(guess, correctPin string) []int {
	length := len(guess)
	if len(correctPin) != length {
		log.Printf("Error: Guess length %d does not match Pin length %d", length, len(correctPin))
		return make([]int, length)
	}

	hints := make([]int, length)
	guessUsed := make([]bool, length)
	pinUsed := make([]bool, length)

	// First pass: Check for Green (Correct digit, correct position)
	for i := 0; i < length; i++ {
		if guess[i] == correctPin[i] {
			hints[i] = 2
			guessUsed[i] = true
			pinUsed[i] = true
		}
	}

	// Second pass: Check for Orange (Correct digit, wrong position)
	for i := 0; i < length; i++ {
		if hints[i] == 2 {
			continue // Already handled
		}

		for j := 0; j < length; j++ {
			if !pinUsed[j] && !guessUsed[i] && guess[i] == correctPin[j] {
				hints[i] = 1
				pinUsed[j] = true
				break
			}
		}
	}

	return hints
}

// IsWin checks if the guess is exactly the correct pin
func (g *GameLogic) IsWin(guess, correctPin string) bool {
	return guess == correctPin
}
