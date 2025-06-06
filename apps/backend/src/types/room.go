package types

import (
	"sync"

	"slices"

	"github.com/gofiber/websocket/v2"
)

type Room struct {
	RoomID  string
	Players []*Player
	Mode    string
	HostID  string
	mu      sync.Mutex
}

func (r *Room) AddPlayer(player *Player) {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.Players = append(r.Players, player)
}

func (r *Room) RemovePlayerByConn(conn *websocket.Conn) {
	r.mu.Lock()
	defer r.mu.Unlock()

	for i, p := range r.Players {
		if p.Conn == conn {
			r.Players = slices.Delete(r.Players, i, i+1)
			break
		}
	}
}

func (r *Room) ConnCount() int {
	r.mu.Lock()
	defer r.mu.Unlock()
	return len(r.Players)
}

func (r *Room) Broadcast(msgType int, msg []byte) {
	r.mu.Lock()
	defer r.mu.Unlock()
	for _, player := range r.Players {
		player.Conn.WriteMessage(msgType, msg)
	}
}
