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
		want       []int
	}{
		{
			name:       "All Correct",
			guess:      "123",
			correctPin: "123",
			want:       []int{2, 2, 2},
		},
		{
			name:       "All Wrong",
			guess:      "456",
			correctPin: "123",
			want:       []int{0, 0, 0},
		},
		{
			name:       "One Green, One Orange",
			guess:      "135",
			correctPin: "123",
			want:       []int{2, 1, 0},
		},
		{
			name:       "Duplicate Guess Digits - Single Match",
			guess:      "112",
			correctPin: "123",
			want:       []int{2, 0, 1},
		},
		{
			name:       "Duplicate Guess Digits - Two Matches in Target",
			guess:      "112",
			correctPin: "121",
			want:       []int{2, 1, 1}, // 1(green), 1(orange), 2(orange)
		},
		{
			name:       "Duplicate Target Digits - Single Match in Guess",
			guess:      "123",
			correctPin: "111",
			want:       []int{2, 0, 0},
		},
		{
			name:       "Orange Only",
			guess:      "312",
			correctPin: "123",
			want:       []int{1, 1, 1},
		},
		{
			name:       "Complex Case 1",
			guess:      "1122",
			correctPin: "1212",
			want:       []int{2, 1, 1, 2},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := logic.GenerateHints(tt.guess, tt.correctPin); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("GameLogic.GenerateHints() = %v, want %v", got, tt.want)
			}
		})
	}
}
