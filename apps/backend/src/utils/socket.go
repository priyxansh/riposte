package utils

import (
	"riposte-backend/src/types"
	"riposte-backend/src/types/errors"
	eventpayloads "riposte-backend/src/types/event_payloads"

	"github.com/gofiber/websocket/v2"
)

func SendResponse[T any](conn *websocket.Conn, event string, data *T, errObj *errors.GameError) error {
	response := types.SocketResponse[T]{
		Event: event,
		Payload: eventpayloads.BaseResponse[T]{
			Success: errObj == nil,
			Data:    data,
			Error:   errObj,
		},
	}

	return conn.WriteJSON(response)
}

func SendBroadcast[T any](conn *websocket.Conn, event string, data *T) error {
	response := types.BroadcastResponse[T]{
		Event: event,
		Payload: eventpayloads.BaseBroadcastResponse[T]{
			Data:        data,
			IsBroadcast: true,
		},
	}

	return conn.WriteJSON(response)
}
