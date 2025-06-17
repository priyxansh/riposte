package eventpayloads

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

type RoomStatePayload struct {
	RoomID    string   `json:"roomId"`
	Mode      string   `json:"mode"`
	HostID    string   `json:"hostId"`
	PlayerIDs []string `json:"playerIds"`
}
