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
	var joinedRoomID string
	var playerID string

	defer func() {
		log.Println("Client disconnected")

		if joinedRoomID != "" && playerID != "" {
			log.Printf("Removing player %s from room %s\n", playerID, joinedRoomID)

			if err := services.LeaveRoom(joinedRoomID, playerID); err != nil {
				log.Println("Error leaving room:", err)
			} else {
				log.Printf("Player %s successfully removed from room %s\n", playerID, joinedRoomID)
			}
		}

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

			roomID, err := services.CreateRoom(payload.RoomName, payload.Mode, payload.HostID, c)
			response := OutgoingMessage{Event: events.CreateRoom}

			if err != nil {
				log.Println("create room error:", err)
				response.Data = map[string]string{"error": err.Error()}
			} else {
				joinedRoomID = roomID
				playerID = payload.HostID
				response.Data = map[string]string{"roomId": roomID}
			}

			c.WriteJSON(response)

		case events.JoinRoom:
			var payload types.JoinRoomPayload

			if err := json.Unmarshal(incoming.Data, &payload); err != nil {
				log.Println("join room payload error:", err)
				break
			}

			log.Printf("Joining room: %+v\n", payload)

			err := services.JoinRoom(payload.RoomID, payload.JoinerID, c)
			response := OutgoingMessage{Event: events.JoinRoom}

			if err != nil {
				log.Println("join room error:", err)
				response.Data = map[string]string{"error": err.Error()}
			} else {
				joinedRoomID = payload.RoomID
				playerID = payload.JoinerID
				response.Data = map[string]string{"status": "joined"}
			}

			c.WriteJSON(response)

		case events.LeaveRoom:
			var payload types.LeaveRoomPayload

			if err := json.Unmarshal(incoming.Data, &payload); err != nil {
				log.Println("leave room payload error:", err)
				break
			}

			log.Printf("Leaving room: %+v\n", payload)

			err := services.LeaveRoom(payload.RoomID, playerID)
			response := OutgoingMessage{Event: events.LeaveRoom}

			if err != nil {
				log.Println("leave room error:", err)
				response.Data = map[string]string{"error": err.Error()}
			} else {
				response.Data = map[string]string{"status": "left"}
			}

			c.WriteJSON(response)

		default:
			log.Println("Unhandled event:", incoming.Event)
		}
	}
}
