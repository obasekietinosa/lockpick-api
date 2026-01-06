# lockpick
Multiplayer number guessing game

## Overview
This is a multiplayer, realtime guessing game. The premise is simple. The opponent chooses a sequence of numbers of length n (e.g 1, 2, 9, 0, 5) and then the player tries to guess each number until they get all the numbers correctly and in the right sequence.

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

## Wireframes and User journeys
Wireframes are desktop style, but don't need to be adapted 1-to-1 and must work perfectly on mobile since most of the game will be played on mobile. The overall design will be quite whimsical and gamified, generally going for a fun look rather than anything too functional and serious.

These are the most important pages, but as we go along, we might find others of importance as well.

### Landing page
Landing page talks about the game and allows players view the rules in a modal. It also allows them start a game, either against a human or against the computer.

<img width="702" height="376" alt="image" src="https://github.com/user-attachments/assets/cfa460f1-41b7-4d83-9c62-8b65a5b19508" />

### Game configuration
Game config page which allows choosing rules and settings before starting the game.
The configuration includes:
- name of the player (we'll use this to refer to them throughout the game)
- whether hints are enabled or disabled (will default to enabled)
- pin lengths, with the default of 5 selected and also containing 7 and 10
- timer selection, with options from no timer up to 3 minutes as defined in the rules (will default to having the 30 min timer selected)

Player can click the "Start new game" button to kick things off. Or they can select "Join an existing game" which would give the join game screen.

<img width="702" height="415" alt="image" src="https://github.com/user-attachments/assets/0a909019-9431-4b57-851a-62c02c5418c2" />

### Join game
This screen allows players join an existing game (ie one that has been shared with a url). The name field will have the same value that has been entered (if any) from the configuration screen.
<img width="702" height="415" alt="image" src="https://github.com/user-attachments/assets/df3255ed-fc66-4b57-bf56-a5b591ec325f" />

### Select pin
This screen allows players choose their pins ahead of the game starting. Players pick pins for all 3 rounds. The length of the pin is determined by the length selected in the game configuration.

<img width="702" height="415" alt="image" src="https://github.com/user-attachments/assets/57e65fb8-a712-4a0b-b45d-b336c2e7a220" />

### Gameplay
These screens relate to actual gameplay.

#### Rounds
During an active round, we will show:
- the scores (with padlocks to indicate won rounds, opaque ones show unwon rounds)
- the amount of time left in a round
- the opposing players most recent guess (to show how close the other player is to winning)
- input boxes corresponding to each digit of the pin the player needs to guess
  - these inputs should move to the next once a single digit is typed into them.
  - a backspace should clear them, a second backspace goes to the previous box.
- the guesses a player has made (with hints if turned on or only correct values if turned off)
  - show each guess attempt indicator on a new line
- a submit guess buton (they can also submit by hitting enter.

<img width="702" height="415" alt="image" src="https://github.com/user-attachments/assets/6dfa2801-fb35-4d2b-90b9-4cf48db542bd" />

#### End of round
When the round comes to an end, either via a player guessing the correct pin or time running out, we will should the end of round screen which can be dismissed to start the next round. It should tell the player the outcome of the round, ie whether they won or lost or drew.

<img width="702" height="415" alt="image" src="https://github.com/user-attachments/assets/835198d1-f7e5-4b35-baef-37e0787fd1fc" />
<img width="702" height="415" alt="image" src="https://github.com/user-attachments/assets/5ba52754-c31b-4a8b-a328-b6d8be6db5a8" />
<img width="702" height="415" alt="image" src="https://github.com/user-attachments/assets/5383c1be-ff97-4dcc-b1cd-029550a8d1ff" />

#### End of game
When all rounds have been concluded, there will be a game end state similar to the round end state, telling the player if they won or lost or drew.

<img width="702" height="415" alt="image" src="https://github.com/user-attachments/assets/644ed1ba-1785-442f-9ac6-1b7195f82098" />

## Technology Stack
The entire project will be built on a monorepo with the frontend and backend together. The entire project will use TypeScript end to end. The frontend will be in React + Vite and the backend with be in ExpressJS with Socket.io

## Environment configuration
- **Frontend**: set `VITE_API_BASE_URL` in `client/.env` to the deployed API origin (defaults to `http://localhost:3001` for local development).
- **Backend**: configure `PORT` to choose the server port (defaults to `3001`).

### Frontend
#### Components
Use composition for component architecture where possible

#### Routing
Use React Router 7 for routing.

#### Styling
Styling will use Tailwind v4. Keep styles contained in components to promote reuse where possible.

### Backend
Modular architecture, keep concerns seperate and small.

## Attribution
### Icons
- <a href="https://www.flaticon.com/free-icons/open-lock" title="open lock icons">Open lock icons created by Freepik - Flaticon</a>
- <a href="https://www.flaticon.com/free-icons/padlock" title="padlock icons">Padlock icons created by Freepik - Flaticon</a>
