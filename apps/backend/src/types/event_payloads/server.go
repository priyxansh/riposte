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

type GetRoomStateResponse struct {
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
	RoomID            string                      `json:"roomId"`
	PlayerStates      []*gametypes.PlayerSnapshot `json:"playerStates"`
	LastProcessedInput map[string]int              `json:"lastProcessedInput"` // playerID -> last processed sequence number
}

type StartGameResponse struct{}

type GameStartedResponse struct {
	RoomID string `json:"roomId"`
}

type MovePlayerResponse struct{}

type AddBotResponse struct {
	BotID   string `json:"botId"`
	BotName string `json:"botName"`
}

type SetBotBehaviorResponse struct{}
