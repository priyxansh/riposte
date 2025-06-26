package eventpayloads

type CreateRoomPayload struct {
	RoomName string `json:"roomName"`
	Mode     string `json:"mode"`
	HostID   string `json:"hostId"`
	HostName string `json:"hostName"`
}

type JoinRoomPayload struct {
	RoomID     string `json:"roomId"`
	JoinerID   string `json:"joinerId"`
	JoinerName string `json:"joinerName"`
}

type LeaveRoomPayload struct {
	RoomID string `json:"roomId"`
}

type RoomStatePayload struct {
	RoomID string `json:"roomId"`
}
