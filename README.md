# lockpick
Multiplayer number guessing game

## Overview
This is a multiplayer, realtime guessing game. The premise is simple. The opponent chooses a sequence of numbers of length n (e.g 1, 2, 9, 0, 5) and then the player tries to guess each number until they get all the numbers correctly and in the right sequence.

This is the API for the game. It is a backend only service that handles the game logic and provides a REST API and socket connection for the frontend to interact with.

## Game Mechanics
The game can be played in single player or multiplayer mode. It can also be played with multiple different rulesets.

### Rules
#### 1. Length of Pins
Minimum length of pins is 5. There can also be pins of length 7 and 10. Whatever length is chosen must be the same for both players in multiplayer mode.

#### 2. Hint mode
There are different hint modes. To begin, every guess shows an indicator. green 🟩 if correct and grey ⬜️ if incorrect.

As an example, lets say there are 5 digits to guess: [] [] [] [] [] when the player makes no correct guesses, the feedback will show as ⬜️ ⬜️ ⬜️ ⬜️ ⬜️. If they make a correct guess at the third position with all the others wrong, the feedback becomes ⬜️ ⬜️ 🟩 ⬜️ ⬜️. If they had multiple correct guesses (e.g third and fifth) it will show as ⬜️ ⬜️ 🟩 ⬜️ 🟩

With hints enabled, the difference would be that incorrect guesses which would be correct in a different position show as orange 🟧. So, following the previous example if they make a guess with two correct digits and a digit in the first position which is wrong but would be correct in the fourth position, it shows up as 🟧 ⬜️ 🟩 ⬜️ 🟩

#### 4. Timers
Timers can be enabled for each round. The round can last for up to 3 minutes, but can also have timers of 30 secs, 1 minute and 3 minutes.

#### 5. Rounds
Each game will have 3 rounds. A round ends when the timer goes off (if timers are enabled) or when either player correctly guesses the others pin. In multiplayer mode, if the timer ends before either player has made a successful guess, then it ends in a draw. In single player mode, if the player runs out of time, they have lost

A player wins when they win the most rounds. A draw occurs if both players win the same number of rounds.

### Single Player Mode
In single player mode, the player guesses against a set of randomly generated numbers.
They select the length of pins, whether to enable hints or not and how much time per round.

### Multiplayer Mode
In multiplayer mode, there will be two options, playing against a random player and starting a private room that can be joined by someone else (ie with a shared link).

The players need to select the settings they would like and then if a random matchup or a private room. If its a private room, then we start the room and generate the invite link so that they can send it to their desired player. If it is a random matchup, then we generate the room and find another player with the same or similar game settings and pair them up.

Both players need to input their digits (or click a button to allow us randomly generate it for them) and then say they are ready so that the game can start.

## Application flow and User journeys
These are the user flow steps from the API perspective.

### Game configuration
Game config page which allows choosing rules and settings before starting the game. 
The configuration includes:
- name of the player (we'll use this to refer to them throughout the game)
- whether hints are enabled or disabled (will default to enabled)
- pin lengths, with the default of 5 selected and also containing 7 and 10
- timer selection, with options from no timer up to 3 minutes as defined in the rules (will default to having the 30 second timer selected)
- whether to play against a random player or start a private room

We should persist this config to the Redis store so that we can retrieve it when the game starts.

### Join game
Players can join an existing game either joining a private room or joining a random game. If joining a private room, they will need to enter the room code. If joining a random game, they will need to enter their name as well as the configuration of their choice and we will match them up with another player.

Allow a maximum of 2 players to join a game.

We should persist this config to the Redis store so that we can retrieve it when the game starts.

### Select pin
Once all players have joined the game, they will be taken to the select pin screen. This screen allows players choose their pins ahead of the game starting. Players pick pins for all 3 rounds. The length of the pins is determined by the length selected in the game configuration.

We will also store the selected pins in the store as we will need to retrieve them and use them to confirm correct guesses.

### Gameplay
These screens relate to actual gameplay.

#### Rounds
During an active round, we will keep track of:
- the scores
- the amount of time left in a round
- the players guesses (we will send the most recent of these to the other player)
- the guesses a player has made with hints if turned on or only correct values if turned off

#### End of round
When the round comes to an end, either via a player guessing the correct pin or time running out we will need to send each client the outcome of the round.

#### End of game
When all rounds have been concluded, we will need to send each client the outcome of the game.

## Technology Stack
The backend will be built in Golang and will use Redis for persistence.

## Environment configuration
- **Backend**: configure `PORT` to choose the server port (defaults to `8103`).

### Backend
Modular architecture, keep concerns seperate and small.
