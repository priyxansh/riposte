package gametypes

import (
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

func (r *Room) AddPlayer(player *Player) (*Room, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if (r.Mode == "1v1" && len(r.Players) >= 2) || (r.Mode == "2v2" && len(r.Players) >= 4) {
		return nil, errors.NewGameError(errors.ErrRoomFull, "room is full")
	}

	for _, p := range r.Players {
		if p.Metadata.ID == player.Metadata.ID {
			return nil, errors.NewGameError(errors.ErrAlreadyInRoom, "player already in room")
		}
	}

	r.Players = append(r.Players, player)
	return r, nil
}

func (r *Room) RemovePlayerByID(playerID string) *PlayerMetadata {
	r.mu.Lock()
	defer r.mu.Unlock()

	var metadata *PlayerMetadata

	for i, p := range r.Players {
		if p.Metadata.ID == playerID {
			metadata = p.Metadata
			r.Players = slices.Delete(r.Players, i, i+1)
			break
		}
	}

	return metadata
}

func (r *Room) ConnCount() int {
	r.mu.Lock()
	defer r.mu.Unlock()
	return len(r.Players)
}

func (r *Room) DoLocked(fn func()) {
	r.mu.Lock()
	defer r.mu.Unlock()
	fn()
}
