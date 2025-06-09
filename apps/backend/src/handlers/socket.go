package handlers

import (
	"encoding/json"
	"log"

	"riposte-backend/src/events"
	"riposte-backend/src/services"
	"riposte-backend/src/types"
	"riposte-backend/src/types/errors"

	"github.com/gofiber/websocket/v2"
)

func makeErrorPayload(err error) map[string]string {
	if ge, ok := err.(*errors.GameError); ok {
		return map[string]string{
			"type":    string(ge.Type),
			"message": ge.Message,
		}
	}
	return map[string]string{
		"type":    "internal_error",
		"message": err.Error(),
	}
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

				// Notify other players in the room
				var broadcastPayload types.PlayerLeftPayload

				broadcastPayload.RoomID = joinedRoomID
				broadcastPayload.PlayerID = playerID

				if err := services.BroadcastToRoom(joinedRoomID, events.PlayerLeft, broadcastPayload, playerID); err != nil {
					log.Println("Error broadcasting player left:", err)
				}
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

		var incoming types.IncomingMessage
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
			response := types.OutgoingMessage{Event: events.CreateRoom}

			if err != nil {
				log.Println("create room error:", err)
				response.Data = makeErrorPayload(err)
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
			response := types.OutgoingMessage{Event: events.JoinRoom}

			if err != nil {
				log.Println("join room error:", err)
				response.Data = makeErrorPayload(err)
			} else {
				joinedRoomID = payload.RoomID
				playerID = payload.JoinerID
				response.Data = map[string]string{"status": "joined"}
			}

			c.WriteJSON(response)

			// Notify other players in the room
			if err == nil {
				var broadcastPayload types.PlayerJoinedPayload
				broadcastPayload.RoomID = joinedRoomID
				broadcastPayload.JoinerID = playerID

				err = services.BroadcastToRoom(joinedRoomID, events.PlayerJoined, broadcastPayload, playerID)

				if err != nil {
					log.Println("broadcast player joined error:", err)
				}
			}

		case events.LeaveRoom:
			var payload types.LeaveRoomPayload

			if err := json.Unmarshal(incoming.Data, &payload); err != nil {
				log.Println("leave room payload error:", err)
				break
			}

			log.Printf("Leaving room: %+v\n", payload)

			err := services.LeaveRoom(payload.RoomID, playerID)
			response := types.OutgoingMessage{Event: events.LeaveRoom}

			if err != nil {
				log.Println("leave room error:", err)
				response.Data = makeErrorPayload(err)
			} else {
				joinedRoomID = ""
				response.Data = map[string]string{"status": "left"}
			}

			c.WriteJSON(response)

			// Notify other players in the room
			if err == nil {
				var broadcastPayload types.PlayerLeftPayload

				broadcastPayload.RoomID = payload.RoomID
				broadcastPayload.PlayerID = playerID

				err = services.BroadcastToRoom(payload.RoomID, events.PlayerLeft, broadcastPayload, playerID)

				if err != nil {
					log.Println("broadcast player left error:", err)
				}
			}

		case events.RoomState:
			var payload types.RoomStatePayload
			if err := json.Unmarshal(incoming.Data, &payload); err != nil {
				log.Println("room state payload error:", err)
				break
			}

			log.Printf("Fetching room state for: %+v\n", payload)

			room, err := services.GetRoom(payload.RoomID)
			response := types.OutgoingMessage{Event: events.RoomState}

			if err != nil {
				log.Println("get room error:", err)
				response.Data = makeErrorPayload(err)
			} else {
				playerIDs := make([]string, len(room.Players))
				for i, player := range room.Players {
					playerIDs[i] = player.ID
				}

				response.Data = map[string]any{
					"roomId":    room.RoomID,
					"hostId":    room.HostID,
					"playerIds": playerIDs,
					"mode":      room.Mode,
				}
			}

			c.WriteJSON(response)

		default:
			log.Println("Unhandled event:", incoming.Event)
		}
	}
}
