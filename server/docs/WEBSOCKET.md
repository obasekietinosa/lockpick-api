# Lockpick Game WebSocket Protocol

This document details the WebSocket protocol used for real-time communication in the Lockpick game.

## Connection

**Endpoint:** `ws://<host>:<port>/ws`
**Example (Local):** `ws://localhost:8080/ws`

The connection is established using a standard WebSocket upgrade request. No authentication headers are required for the initial connection, but game actions presume the client has received a valid `player_id` and `room_id` from the HTTP API (Create/Join Game).

## Message Format

All messages sent and received are JSON objects with the following structure:

```json
{
  "type": "string",
  "payload": { ... }
}
```

- **type**: A string identifying the event.
- **payload**: An object containing data relevant to the event.

---

## Client -> Server Messages

### 1. Make a Guess
Sent when a player submits a guess for the current round.

- **Type**: `guess`
- **Payload**:
  - `room_id` (string): The ID of the game room.
  - `player_id` (string): The ID of the player making the guess.
  - `guess` (string): The pin guess (e.g., "123"). Length depends on game config.

**Example:**
```json
{
  "type": "guess",
  "payload": {
    "room_id": "room-123",
    "player_id": "player-abc",
    "guess": "456"
  }
}
```

---

## Server -> Client Messages

### 1. Game Start
Broadcast when all players have joined and selected their pins.

- **Type**: `game_start`
- **Payload**:
  - `room_id` (string): The ID of the game room.
  - `status` (string): Current status of the room (e.g., "playing").

**Example:**
```json
{
  "type": "game_start",
  "payload": {
    "room_id": "room-123",
    "status": "playing"
  }
}
```

### 2. Guess Result
Broadcast after a player makes a valid guess. Contains the hints generated for that guess.

- **Type**: `guess_result`
- **Payload**:
  - `room_id` (string): The ID of the game room.
  - `player_id` (string): The ID of the player who made the guess.
  - `guess` (string): The guess that was made.
  - `hints` (array of integers): Feedback for each digit.
    - `0`: Grey (Incorrect digit)
    - `1`: Orange (Correct digit, wrong position)
    - `2`: Green (Correct digit, correct position)

**Example:**
```json
{
  "type": "guess_result",
  "payload": {
    "room_id": "room-123",
    "player_id": "player-abc",
    "guess": "456",
    "hints": [0, 2, 1]
  }
}
```

### 3. Round End
Broadcast when a player wins a round.

- **Type**: `round_end`
- **Payload**:
  - `room_id` (string): The ID of the game room.
  - `winner_id` (string): The ID of the player who won the round.
  - `round` (integer): The round number that just ended.
  - `scores` (map[string]int): Updated scores for all players.

**Example:**
```json
{
  "type": "round_end",
  "payload": {
    "room_id": "room-123",
    "winner_id": "player-abc",
    "round": 1,
    "scores": {
      "player-abc": 1,
      "player-xyz": 0
    }
  }
}
```

### 4. Round Start
Broadcast immediately after a round ends, if the game is still ongoing.

- **Type**: `round_start`
- **Payload**:
  - `room_id` (string): The ID of the game room.
  - `round` (integer): The new round number.

**Example:**
```json
{
  "type": "round_start",
  "payload": {
    "room_id": "room-123",
    "round": 2
  }
}
```

### 5. Game End
Broadcast when the final round (Round 3) is completed.

- **Type**: `game_end`
- **Payload**:
  - `room_id` (string): The ID of the game room.
  - `winner_id` (string): The overall winner's ID. Empty if it's a draw.
  - `scores` (map[string]int): Final scores.
  - `is_draw` (boolean): True if the game ended in a draw.

**Example:**
```json
{
  "type": "game_end",
  "payload": {
    "room_id": "room-123",
    "winner_id": "player-abc",
    "scores": {
      "player-abc": 2,
      "player-xyz": 1
    },
    "is_draw": false
  }
}
```

## Client Implementation Notes

1.  **Filtering**: All messages are broadcast to the entire hub. **Clients MUST accept all messages but process ONLY those where `payload.room_id` matches their current `room_id`.**
2.  **State Management**: Clients should maintain local state for scores and current round, updating them based on `round_end` and `game_end` events.
3.  **Visuals**: Use the `hints` array from `guess_result` to color-code the UI (Grey/Orange/Green).
