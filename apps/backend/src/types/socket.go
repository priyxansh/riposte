package types

import eventpayloads "riposte-backend/src/types/event_payloads"

type SocketRequest[T any] struct {
	Event   string `json:"event"`
	Payload T      `json:"payload"`
}

type SocketResponse[T any] struct {
	Event   string                        `json:"event"`
	Payload eventpayloads.BaseResponse[T] `json:"payload"`
}

type BroadcastResponse[T any] struct {
	Event   string                                 `json:"event"`
	Payload eventpayloads.BaseBroadcastResponse[T] `json:"payload"`
}
