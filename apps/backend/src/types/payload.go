package types

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
