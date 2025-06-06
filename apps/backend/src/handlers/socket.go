package handlers

import (
	"encoding/json"
	"log"

	"riposte-backend/src/events"
	"riposte-backend/src/services"
	"riposte-backend/src/types"

	"github.com/gofiber/websocket/v2"
)

type IncomingMessage struct {
	Event string          `json:"event"`
	Data  json.RawMessage `json:"payload"`
}

type OutgoingMessage struct {
	Event string `json:"event"`
	Data  any    `json:"payload"`
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

		var incoming IncomingMessage
		if err := json.Unmarshal(msg, &incoming); err != nil {
			log.Println("unmarshal error:", err)
			continue
		}

		switch incoming.Event {
		case events.CreateRoom:
			var payload types.CreateRoomPayload

			if err := json.Unmarshal(incoming.Data, &payload); err != nil {
				log.Println("create room payload error:", err)
				break
			}

			log.Printf("Creating room: %+v\n", payload)

			roomID, ok := services.CreateRoom(payload.Mode, payload.HostID, c)
			response := OutgoingMessage{Event: events.CreateRoom}

			if ok {
				response.Data = map[string]string{"roomId": roomID}
			} else {
				response.Data = map[string]string{"error": "Failed to create room"}
			}

			c.WriteJSON(response)

		case events.JoinRoom:
			var payload types.JoinRoomPayload

			if err := json.Unmarshal(incoming.Data, &payload); err != nil {
				log.Println("join room payload error:", err)
				break
			}

			log.Printf("Joining room: %+v\n", payload)

			ok := services.JoinRoom(payload.RoomID, payload.JoinerID, c)
			response := OutgoingMessage{Event: events.JoinRoom}

			if ok {
				response.Data = map[string]string{"status": "joined"}
			} else {
				response.Data = map[string]string{"error": "Failed to join room"}
			}

			c.WriteJSON(response)

		case events.LeaveRoom:
			var payload types.LeaveRoomPayload

			if err := json.Unmarshal(incoming.Data, &payload); err != nil {
				log.Println("leave room payload error:", err)
				break
			}

			log.Printf("Leaving room: %+v\n", payload)

			ok := services.LeaveRoom(payload.RoomID, c)
			response := OutgoingMessage{Event: events.LeaveRoom}

			if ok {
				response.Data = map[string]string{"status": "left"}
			} else {
				response.Data = map[string]string{"error": "Failed to leave room"}
			}

			c.WriteJSON(response)

		default:
			log.Println("Unhandled event:", incoming.Event)
		}
	}
}
