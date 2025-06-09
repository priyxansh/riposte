package services

import (
	"sync"

	"riposte-backend/src/types"
	"riposte-backend/src/types/errors"

	"github.com/gofiber/websocket/v2"
	"github.com/google/uuid"
)

var (
	rooms = make(map[string]*types.Room)
	mu    sync.Mutex
)

// CreateRoom generates a roomID and creates a room with the host as the first player
func CreateRoom(roomName, mode, hostID string, hostConn *websocket.Conn) (string, error) {
	mu.Lock()
	defer mu.Unlock()

	if mode != "1v1" && mode != "2v2" {
		return "", errors.NewGameError(errors.ErrInvalidMode, "invalid game mode")
	}

	roomID := uuid.NewString()

	rooms[roomID] = &types.Room{
		Name:   roomName,
		RoomID: roomID,
		Players: []*types.Player{
			{ID: hostID, Conn: hostConn},
		},
		Mode:   mode,
		HostID: hostID,
	}

	return roomID, nil
}

// JoinRoom adds a player with an ID and connection to a room
func JoinRoom(roomID string, playerID string, conn *websocket.Conn) error {
	mu.Lock()
	room, exists := rooms[roomID]
	mu.Unlock()

	if !exists {
		return errors.NewGameError(errors.ErrRoomNotFound, "room not found")
	}

	player := &types.Player{
		ID:   playerID,
		Conn: conn,
	}

	return room.AddPlayer(player)
}

// LeaveRoom removes the player connection from the room and deletes room if empty
func LeaveRoom(roomID string, playerId string) error {
	mu.Lock()
	room, exists := rooms[roomID]
	mu.Unlock()

	if !exists {
		return errors.NewGameError(errors.ErrRoomNotFound, "room not found")
	}

	room.RemovePlayerByID(playerId)

	if room.ConnCount() == 0 {
		mu.Lock()
		delete(rooms, roomID)
		mu.Unlock()
	}

	return nil
}

// BroadcastToRoom sends a message to all connections in a room
func BroadcastToRoom(roomID string, msgType int, msg []byte) {
	mu.Lock()
	room, exists := rooms[roomID]
	mu.Unlock()

	if !exists {
		return
	}

	room.Broadcast(msgType, msg)
}

// GetRoom returns a pointer to a room if it exists
func GetRoom(roomID string) (*types.Room, error) {
	mu.Lock()
	defer mu.Unlock()

	room, exists := rooms[roomID]

	if !exists {
		return nil, errors.NewGameError(errors.ErrRoomNotFound, "room not found")
	}

	return room, nil
}
