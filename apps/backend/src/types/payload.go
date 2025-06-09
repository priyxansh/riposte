package types

// Client emitted events

type CreateRoomPayload struct {
	RoomName string `json:"roomName"`
	Mode     string `json:"mode"`
	HostID   string `json:"hostId"`
}

type JoinRoomPayload struct {
	RoomID   string `json:"roomId"`
	JoinerID string `json:"joinerId"`
}

type LeaveRoomPayload struct {
	RoomID string `json:"roomId"`
}

type StartGamePayload struct {
	RoomID string `json:"roomId"`
	HostID string `json:"hostId"`
}

type RoomStatePayload struct {
	RoomID    string   `json:"roomId"`
	Mode      string   `json:"mode"`
	HostID    string   `json:"hostId"`
	PlayerIDs []string `json:"playerIds"`
}

// Server emitted events

type PlayerJoinedPayload struct {
	RoomID   string `json:"roomId"`
	JoinerID string `json:"joinerId"`
}

type PlayerLeftPayload struct {
	RoomID   string `json:"roomId"`
	PlayerID string `json:"playerId"`
}
