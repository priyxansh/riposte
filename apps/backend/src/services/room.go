package services

import (
	"log"
	"slices"
	"sync"
	"time"

	"riposte-backend/src/constants"
	"riposte-backend/src/events"
	"riposte-backend/src/types/errors"
	eventpayloads "riposte-backend/src/types/event_payloads"
	gametypes "riposte-backend/src/types/game_types"
	"riposte-backend/src/utils"

	"github.com/gofiber/websocket/v2"
	"github.com/google/uuid"
)

var (
	rooms = make(map[string]*gametypes.Room)
	mu    sync.Mutex
)

// CreateRoom generates a roomID and creates a room with the host as the first player
func CreateRoom(payload eventpayloads.CreateRoomPayload, hostConn *websocket.Conn) (*gametypes.Room, error) {
	mu.Lock()
	defer mu.Unlock()

	mode := payload.Mode
	roomName := payload.RoomName
	hostID := payload.HostID
	hostName := payload.HostName

	if mode != "1v1" && mode != "2v2" {
		return nil, errors.NewGameError(errors.ErrInvalidMode, "invalid game mode")
	}

	roomID := uuid.NewString()

	playerMetadata := &gametypes.PlayerMetadata{
		ID:   hostID,
		Name: hostName,
	}

	player := &gametypes.Player{
		Conn:     hostConn,
		Metadata: playerMetadata,
	}

	rooms[roomID] = &gametypes.Room{
		Name:    roomName,
		RoomID:  roomID,
		Players: []*gametypes.Player{player},
		Mode:    mode,
		HostID:  hostID,
	}

	return rooms[roomID], nil
}

// JoinRoom adds a player with an ID and connection to a room
func JoinRoom(payload eventpayloads.JoinRoomPayload, conn *websocket.Conn) (*gametypes.Room, error) {
	mu.Lock()
	defer mu.Unlock()

	roomID := payload.RoomID
	playerID := payload.JoinerID
	playerName := payload.JoinerName

	room, exists := rooms[roomID]

	if !exists {
		return nil, errors.NewGameError(errors.ErrRoomNotFound, "room not found")
	}

	playerMetadata := &gametypes.PlayerMetadata{
		ID:   playerID,
		Name: playerName,
	}

	player := &gametypes.Player{
		Conn:     conn,
		Metadata: playerMetadata,
	}

	return room.AddPlayer(player)
}

// LeaveRoom removes the player connection from the room and deletes room if empty
func LeaveRoom(roomID string, playerId string) (*gametypes.PlayerMetadata, error) {
	mu.Lock()
	room, exists := rooms[roomID]
	mu.Unlock()

	if !exists {
		return nil, errors.NewGameError(errors.ErrRoomNotFound, "room not found")
	}

	playerMetadata := room.RemovePlayerByID(playerId)

	// Use room.ConnCount() inside room's lock to avoid race
	shouldDelete := false
	room.DoLocked(func() {
		if room.ConnCount() == 0 {
			shouldDelete = true
		}
	})

	if shouldDelete {
		mu.Lock()
		delete(rooms, roomID)
		mu.Unlock()
		log.Printf("Room %s deleted after player %s left", roomID, playerId)
	} else {
		log.Printf("Player %s left room %s", playerId, roomID)
	}

	return playerMetadata, nil
}

// BroadcastToRoom sends a message to all players in a room, except specified players
func BroadcastToRoom[T any](roomID string, event string, payload *T, exceptedPlayerIDs ...string) error {
	mu.Lock()
	room, exists := rooms[roomID]
	mu.Unlock()

	if !exists {
		return errors.NewGameError(errors.ErrRoomNotFound, "room not found")
	}

	room.DoLocked(func() {
		if len(room.Players) == 0 {
			log.Println("No players in room to broadcast message")
			return
		}

		for _, player := range room.Players {
			if player.Conn != nil {
				if len(exceptedPlayerIDs) == 0 || !slices.Contains(exceptedPlayerIDs, player.Metadata.ID) {
					err := utils.SendBroadcast(player.Conn, event, payload)
					if err != nil {
						log.Printf("Error sending message to player %s: %v", player.Metadata.ID, err)
					}
				}
			} else {
				log.Printf("Player %s has no connection", player.Metadata.ID)
			}
		}
	})

	return nil
}

// GetRoom returns a pointer to a room if it exists
func GetRoom(roomID string) (*gametypes.Room, error) {
	mu.Lock()
	defer mu.Unlock()

	room, exists := rooms[roomID]

	if !exists {
		return nil, errors.NewGameError(errors.ErrRoomNotFound, "room not found")
	}

	return room, nil
}

func StartGameLoop(roomID string) error {
	mu.Lock()
	room, exists := rooms[roomID]
	mu.Unlock()

	if !exists {
		log.Printf("StartGameLoop: room %s not found\n", roomID)
		return errors.NewGameError(errors.ErrRoomNotFound, "room not found")
	}

	maxPlayers := 2
	if room.Mode == "2v2" {
		maxPlayers = 4
	}

	// Check if room has enough players to start
	if len(room.Players) < maxPlayers {
		log.Printf("StartGameLoop: not enough players in room %s for %s\n", roomID, room.Mode)
		return errors.NewGameError(errors.ErrNotEnoughPlayers, "not enough players to start")
	}

	// Assign initial states to players before starting the game loop
	AssignInitialStates(room)

	ticker := time.NewTicker(16 * time.Millisecond) // ~60Hz

	go func() {
		defer ticker.Stop()
		log.Printf("Game loop started for room %s", roomID)

		// Preallocate the player states slice once
		states := make([]*gametypes.PlayerSnapshot, 0, maxPlayers)

		previousTime := time.Now()

		for range ticker.C {
			currentTime := time.Now()
			deltaTime := currentTime.Sub(previousTime).Seconds() // in seconds (float64)
			previousTime = currentTime

			// Reset slice length, keep capacity
			states = states[:0]

			room.DoLocked(func() {
				// Update player positions based on velocity and deltaTime
				for _, player := range room.Players {
					if player.Conn == nil || player.State == nil {
						continue
					}

					player.State.X += player.State.VX * deltaTime
					player.State.Y += player.State.VY * deltaTime

					states = append(states, &gametypes.PlayerSnapshot{
						PlayerMetadata: *player.Metadata,
						State:          player.State,
					})
				}
			})

			payload := &eventpayloads.GameLoopResponse{
				RoomID:       roomID,
				PlayerStates: states,
			}

			if err := BroadcastToRoom(roomID, events.GameLoop, payload); err != nil {
				log.Printf("BroadcastToRoom error: %v", err)
			}
		}
	}()

	return nil
}

func AssignInitialStates(room *gametypes.Room) {
	var initialStates []*gametypes.PlayerState

	switch room.Mode {
	case "1v1":
		initialStates = constants.InitialStates1v1
	case "2v2":
		initialStates = constants.InitialStates2v2
	}

	for i, player := range room.Players {
		if i < len(initialStates) {
			player.State = initialStates[i]
		} else {
			player.State = &gametypes.PlayerState{X: 0, Y: 0, VX: 0, VY: 0}
		}
	}
}
