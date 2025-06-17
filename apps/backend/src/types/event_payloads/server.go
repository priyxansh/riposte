package eventpayloads

import "riposte-backend/src/types/errors"

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
	RoomID string `json:"roomId"`
}

type JoinRoomResponse struct{}

type LeaveRoomResponse struct{}

type RoomStateResponse struct {
	RoomID    string   `json:"roomId"`
	HostID    string   `json:"hostId"`
	Mode      string   `json:"mode"`
	PlayerIDs []string `json:"playerIds"`
}

type PlayerLeftResponse struct {
	RoomID   string `json:"roomId"`
	PlayerID string `json:"playerId"`
}

type PlayerJoinedResponse struct {
	RoomID   string `json:"roomId"`
	JoinerID string `json:"joinerId"`
}
