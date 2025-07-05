package eventpayloads

import (
	"riposte-backend/src/types/errors"
	gametypes "riposte-backend/src/types/game_types"
)

type BaseResponse[T any] struct {
	Success bool              `json:"success"`
	Data    *T                `json:"data,omitempty"`
	Error   *errors.GameError `json:"error,omitempty"`
}

type BaseBroadcastResponse[T any] struct {
	Data        *T   `json:"data"`
	IsBroadcast bool `json:"isBroadcast"`
}

type CreateRoomResponse struct {
	RoomID   string `json:"roomId"`
	RoomName string `json:"roomName"`
	HostID   string `json:"hostId"`
	Mode     string `json:"mode"`
}

type JoinRoomResponse struct {
	RoomID   string                      `json:"roomId"`
	RoomName string                      `json:"roomName"`
	HostID   string                      `json:"hostId"`
	Mode     string                      `json:"mode"`
	Players  []*gametypes.PlayerMetadata `json:"players"`
}

type LeaveRoomResponse struct{}

type RoomStateResponse struct {
	RoomID   string                      `json:"roomId"`
	RoomName string                      `json:"roomName"`
	HostID   string                      `json:"hostId"`
	Mode     string                      `json:"mode"`
	Players  []*gametypes.PlayerMetadata `json:"players"`
}

type PlayerLeftResponse struct {
	RoomID     string `json:"roomId"`
	PlayerID   string `json:"playerId"`
	PlayerName string `json:"playerName"`
}

type PlayerJoinedResponse struct {
	RoomID     string `json:"roomId"`
	JoinerID   string `json:"joinerId"`
	JoinerName string `json:"joinerName"`
}

type GameLoopResponse struct {
	RoomID       string                   `json:"roomId"`
	PlayerStates []*gametypes.PlayerState `json:"playerStates"`
}

type StartGameResponse struct{}
