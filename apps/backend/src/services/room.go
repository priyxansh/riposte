package services

import (
	"log"
	"slices"
	"sync"

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
func CreateRoom(payload eventpayloads.CreateRoomPayload, hostConn *websocket.Conn) (string, error) {
	mu.Lock()
	defer mu.Unlock()

	mode := payload.Mode
	roomName := payload.RoomName
	hostID := payload.HostID
	hostName := payload.HostName

	if mode != "1v1" && mode != "2v2" {
		return "", errors.NewGameError(errors.ErrInvalidMode, "invalid game mode")
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

	return roomID, nil
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
