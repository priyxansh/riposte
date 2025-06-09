package types

import "encoding/json"

type IncomingMessage struct {
	Event string          `json:"event"`
	Data  json.RawMessage `json:"payload"`
}

type OutgoingMessage struct {
	Event string `json:"event"`
	Data  any    `json:"payload"`
}
