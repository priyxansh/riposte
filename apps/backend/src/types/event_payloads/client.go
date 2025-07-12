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

type GetRoomStatePayload struct {
	RoomID string `json:"roomId"`
}

type StartGamePayload struct {
	RoomID string `json:"roomId"`
}

// ToDo: Something like KeyState: "pressed" | "released" in ts. Doesn't seem worth it for now, maybe later tho.
type MovePlayerPayload struct {
	PlayerID  string `json:"playerId"`
	Direction string `json:"direction"` // e.g., "left", "right"
	KeyState  string `json:"keyState"`  // e.g., "pressed", "released"
}
