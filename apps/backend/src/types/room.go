package types

import (
	"log"
	"riposte-backend/src/types/errors"
	"slices"
	"sync"
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

	if (r.Mode == "1v1" && len(r.Players) >= 2) || (r.Mode == "2v2" && len(r.Players) >= 4) {
		return errors.NewGameError(errors.ErrRoomFull, "room is full")
	}

	for _, p := range r.Players {
		if p.ID == player.ID {
			return errors.NewGameError(errors.ErrAlreadyInRoom, "player already in room")
		}
	}

	r.Players = append(r.Players, player)
	return nil
}

func (r *Room) RemovePlayerByID(playerID string) {
	r.mu.Lock()
	defer r.mu.Unlock()

	for i, p := range r.Players {
		if p.ID == playerID {
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

func (r *Room) Broadcast(event string, payload any, exceptedPlayerIDs ...string) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if r.ConnCount() == 0 {
		log.Println("No players in room to broadcast message")
		return
	}

	for _, player := range r.Players {
		if player.Conn != nil && (len(exceptedPlayerIDs) == 0 || !slices.Contains(exceptedPlayerIDs, player.ID)) {
			err := player.Conn.WriteJSON(OutgoingMessage{
				Event: event,
				Data:  payload,
			})
			if err != nil {
				log.Printf("Error sending message to player %s: %v", player.ID, err)
			}
		} else {
			log.Printf("Player %s has no connection", player.ID)
		}
	}
}
