package services

import (
	"sync"

	"riposte-backend/src/types"

	"github.com/gofiber/websocket/v2"
	"github.com/google/uuid"
)

var (
	rooms = make(map[string]*types.Room)
	mu    sync.Mutex
)

// CreateRoom generates a roomID and creates a room with the host as first player
func CreateRoom(mode, hostID string, hostConn *websocket.Conn) (string, bool) {
	mu.Lock()
	defer mu.Unlock()

	roomID := uuid.NewString()

	if _, exists := rooms[roomID]; exists {
		return "", false
	}

	rooms[roomID] = &types.Room{
		RoomID: roomID,
		Players: []*types.Player{
			{ID: hostID, Conn: hostConn},
		},
		Mode:   mode,
		HostID: hostID,
	}

	return roomID, true
}

// JoinRoom adds a player with an ID and connection to a room
func JoinRoom(roomID string, playerID string, conn *websocket.Conn) bool {
	mu.Lock()
	room, exists := rooms[roomID]
	mu.Unlock()

	if !exists {
		return false
	}

	player := &types.Player{
		ID:   playerID,
		Conn: conn,
	}

	room.AddPlayer(player)

	return true
}

// LeaveRoom removes the player connection from the room by conn and deletes room if empty
func LeaveRoom(roomID string, conn *websocket.Conn) bool {
	mu.Lock()
	room, exists := rooms[roomID]
	mu.Unlock()

	if !exists {
		return false
	}

	room.RemovePlayerByConn(conn)

	if room.ConnCount() == 0 {
		mu.Lock()
		delete(rooms, roomID)
		mu.Unlock()
	}

	return true
}

func BroadcastToRoom(roomID string, msgType int, msg []byte) {
	mu.Lock()
	room, exists := rooms[roomID]
	mu.Unlock()

	if !exists {
		return
	}

	room.Broadcast(msgType, msg)
}

func GetRoom(roomID string) *types.Room {
	mu.Lock()
	defer mu.Unlock()

	room, exists := rooms[roomID]
	if !exists {
		return nil
	}
	return room
}
