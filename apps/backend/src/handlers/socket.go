package handlers

import (
	"encoding/json"
	"log"

	"riposte-backend/src/events"
	"riposte-backend/src/services"
	"riposte-backend/src/types"
	"riposte-backend/src/types/errors"
	eventpayloads "riposte-backend/src/types/event_payloads"
	"riposte-backend/src/utils"

	"github.com/gofiber/websocket/v2"
)

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
				broadcastPayload := &eventpayloads.PlayerLeftResponse{
					RoomID:   joinedRoomID,
					PlayerID: playerID,
				}

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

		var incoming types.SocketRequest[json.RawMessage]
		if err := json.Unmarshal(msg, &incoming); err != nil {
			log.Println("unmarshal error:", err)
			continue
		}

		switch incoming.Event {
		case events.CreateRoom:
			var payload eventpayloads.CreateRoomPayload

			if err := json.Unmarshal(incoming.Payload, &payload); err != nil {
				log.Println("create room payload error:", err)
				break
			}

			log.Printf("Creating room: %+v\n", payload)

			roomID, err := services.CreateRoom(payload.RoomName, payload.Mode, payload.HostID, c)

			if err != nil {
				log.Println("create room error:", err)

				utils.SendResponse[*eventpayloads.CreateRoomResponse](c, events.CreateRoom, nil, errors.WrapError(err))

				continue
			}

			joinedRoomID = roomID
			playerID = payload.HostID

			utils.SendResponse(c, events.CreateRoom, &eventpayloads.CreateRoomResponse{RoomID: roomID}, nil)

		case events.JoinRoom:
			var payload eventpayloads.JoinRoomPayload

			if err := json.Unmarshal(incoming.Payload, &payload); err != nil {
				log.Println("join room payload error:", err)
				break
			}

			log.Printf("Joining room: %+v\n", payload)

			err := services.JoinRoom(payload.RoomID, payload.JoinerID, c)

			if err != nil {
				log.Println("join room error:", err)

				utils.SendResponse[*eventpayloads.JoinRoomResponse](c, events.JoinRoom, nil, errors.WrapError(err))

				continue
			}

			joinedRoomID = payload.RoomID
			playerID = payload.JoinerID

			utils.SendResponse(c, events.JoinRoom, &eventpayloads.JoinRoomResponse{}, nil)

			// Notify other players in the room
			broadcastPayload := &eventpayloads.PlayerJoinedResponse{
				RoomID:   joinedRoomID,
				JoinerID: playerID,
			}

			err = services.BroadcastToRoom(joinedRoomID, events.PlayerJoined, broadcastPayload, playerID)

			if err != nil {
				log.Println("broadcast player joined error:", err)
			}

		case events.LeaveRoom:
			var payload eventpayloads.LeaveRoomPayload

			if err := json.Unmarshal(incoming.Payload, &payload); err != nil {
				log.Println("leave room payload error:", err)
				break
			}

			log.Printf("Leaving room: %+v\n", payload)

			err := services.LeaveRoom(payload.RoomID, playerID)

			if err != nil {
				log.Println("leave room error:", err)
				utils.SendResponse[*eventpayloads.LeaveRoomResponse](c, events.LeaveRoom, nil, errors.WrapError(err))

				continue
			}

			joinedRoomID = ""

			utils.SendResponse(c, events.LeaveRoom, &eventpayloads.LeaveRoomResponse{}, nil)

			// Notify other players in the room
			broadcastPayload := &eventpayloads.PlayerLeftResponse{
				RoomID:   payload.RoomID,
				PlayerID: playerID,
			}

			err = services.BroadcastToRoom(payload.RoomID, events.PlayerLeft, broadcastPayload, playerID)

			if err != nil {
				log.Println("broadcast player left error:", err)
			}

		case events.RoomState:
			var payload eventpayloads.RoomStatePayload
			if err := json.Unmarshal(incoming.Payload, &payload); err != nil {
				log.Println("room state payload error:", err)
				break
			}

			log.Printf("Fetching room state for: %+v\n", payload)

			room, err := services.GetRoom(payload.RoomID)

			if err != nil {
				log.Println("get room error:", err)
				utils.SendResponse[*eventpayloads.RoomStateResponse](c, events.RoomState, nil, errors.WrapError(err))

				continue
			}

			playerIDs := make([]string, len(room.Players))

			for i, player := range room.Players {
				playerIDs[i] = player.ID
			}

			utils.SendResponse(c, events.RoomState, &eventpayloads.RoomStateResponse{
				RoomID:    room.RoomID,
				HostID:    room.HostID,
				Mode:      room.Mode,
				PlayerIDs: playerIDs,
			}, nil)

		default:
			log.Println("Unhandled event:", incoming.Event)
		}
	}
}
