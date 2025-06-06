package handlers

import (
	"encoding/json"
	"log"
	"riposte-backend/src/events"
	"riposte-backend/src/types"

	"github.com/gofiber/websocket/v2"
)

type IncomingMessage struct {
	Event string          `json:"event"`
	Data  json.RawMessage `json:"payload"`
}

func SocketHandler(c *websocket.Conn) {
	defer func() {
		log.Println("Client disconnected")
		c.Close()
	}()

	log.Println("Client connected")

	for {
		_, msg, err := c.ReadMessage()
		if err != nil {
			log.Println("read error:", err)
			break
		}

		// Unmarshal the incoming message
		// This assumes the message is in the format: {"event": "event_name", "payload": {...}}
		// where "event_name" is one of the defined events in the events package
		// and "payload" is the associated data for that event.
		var incoming IncomingMessage
		if err := json.Unmarshal(msg, &incoming); err != nil {
			log.Println("unmarshal error:", err)
			continue
		}

		// Check if the event is recognized and handle it accordingly
		switch incoming.Event {
		case events.CreateRoom:
			var payload types.CreateRoomPayload
			if err := json.Unmarshal(incoming.Data, &payload); err != nil {
				log.Println("create room payload error:", err)
				break
			}
			log.Printf("Creating room: %+v\n", payload)
			// TODO: Handle room creation

		case events.JoinRoom:
			var payload types.JoinRoomPayload
			if err := json.Unmarshal(incoming.Data, &payload); err != nil {
				log.Println("join room payload error:", err)
				break
			}
			log.Printf("Joining room: %+v\n", payload)
			// TODO: Handle room join

		default:
			log.Println("Unhandled event:", incoming.Event)
		}
	}
}
