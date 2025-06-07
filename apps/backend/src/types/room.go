package types

import (
	"errors"
	"log"
	"sync"

	"slices"

	"github.com/gofiber/websocket/v2"
)

type Room struct {
	RoomID  string
	Name    string
	Players []*Player
	Mode    string
	HostID  string
	mu      sync.Mutex
}

func (r *Room) AddPlayer(player *Player) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	// Limit players to 2 for 1v1 or 4 for 2v2
	if (r.Mode == "1v1" && len(r.Players) >= 2) ||
		(r.Mode == "2v2" && len(r.Players) >= 4) {
		return errors.New("room is full")
	}

	// Prevent duplicate joins
	for _, p := range r.Players {
		if p.ID == player.ID {
			return errors.New("player already in room")
		}
	}

	r.Players = append(r.Players, player)
	return nil
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

	var alivePlayers []*Player

	for _, player := range r.Players {
		err := player.Conn.WriteMessage(msgType, msg)
		if err != nil {
			log.Printf("Failed to send message to player %s: %v", player.ID, err)

			// Close the broken connection
			_ = player.Conn.Close()

			// Don’t add this player to the new slice
			continue
		}

		alivePlayers = append(alivePlayers, player)
	}

	// Remove dead players
	r.Players = alivePlayers
}
