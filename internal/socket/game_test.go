package socket

import (
	"reflect"
	"testing"
)

func TestGenerateHints(t *testing.T) {
	logic := NewGameLogic()

	tests := []struct {
		name       string
		guess      string
		correctPin string
		expected   []int
	}{
		{
			name:       "All Correct",
			guess:      "12345",
			correctPin: "12345",
			expected:   []int{2, 2, 2, 2, 2},
		},
		{
			name:       "All Wrong",
			guess:      "67890",
			correctPin: "12345",
			expected:   []int{0, 0, 0, 0, 0},
		},
		{
			name:       "Wrong Positions",
			guess:      "54321",
			correctPin: "12345",
			expected:   []int{1, 1, 2, 1, 1}, // 3 matches 3 (Green 2), others Orange 1
		},
		{
			name:       "Partial Match",
			guess:      "12000",
			correctPin: "12345",
			expected:   []int{2, 2, 0, 0, 0},
		},
		{
			name:       "Double Digits in Guess",
			guess:      "11000",
			correctPin: "12345",
			expected:   []int{2, 0, 0, 0, 0}, // First 1 matches, second 1 is extra (Grey) because Pin has only one 1
		},
		{
			name:       "Double Digits in Pin",
			guess:      "10000",
			correctPin: "11234",
			expected:   []int{2, 0, 0, 0, 0}, // Guess 1 matches first 1.
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := logic.GenerateHints(tt.guess, tt.correctPin)
			if !reflect.DeepEqual(got, tt.expected) {
				t.Errorf("GenerateHints() = %v, want %v", got, tt.expected)
			}
		})
	}
}
