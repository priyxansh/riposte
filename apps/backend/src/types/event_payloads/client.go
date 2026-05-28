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


type MovePlayerPayload struct {
	PlayerID       string `json:"playerId"`
	Direction      string `json:"direction"`      // e.g., "left", "right", "jump"
	KeyState       string `json:"keyState"`       // e.g., "pressed", "released"
	SequenceNumber int    `json:"sequenceNumber"` // Client input sequence number for reconciliation
}

type AddBotPayload struct {
	RoomID      string `json:"roomId"`
	BotName     string `json:"botName"`
	BotBehavior string `json:"botBehavior"` // "idle" | "attack_spam" | "block" | "auto_parry"
}

type SetBotBehaviorPayload struct {
	RoomID      string `json:"roomId"`
	BotID       string `json:"botId"`
	BotBehavior string `json:"botBehavior"` // "idle" | "attack_spam" | "block" | "auto_parry"
}
