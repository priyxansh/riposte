package handlers

import (
	"encoding/json"
	"log"

	"riposte-backend/src/events"
	"riposte-backend/src/services"
	"riposte-backend/src/types"
	"riposte-backend/src/types/errors"
	eventpayloads "riposte-backend/src/types/event_payloads"
	gametypes "riposte-backend/src/types/game_types"
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

			if playerMetadata, err := services.LeaveRoom(joinedRoomID, playerID); err != nil {
				log.Println("Error leaving room:", err)
			} else {
				log.Printf("Player %s successfully removed from room %s\n", playerID, joinedRoomID)

				// Notify other players in the room
				broadcastPayload := &eventpayloads.PlayerLeftResponse{
					RoomID:   joinedRoomID,
					PlayerID: playerMetadata.ID,
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

			room, err := services.CreateRoom(payload, c)

			if err != nil {
				log.Println("create room error:", err)

				utils.SendResponse[*eventpayloads.CreateRoomResponse](c, events.CreateRoom, nil, errors.WrapError(err))

				continue
			}

			joinedRoomID = room.RoomID
			playerID = payload.HostID

			utils.SendResponse(c, events.CreateRoom, &eventpayloads.CreateRoomResponse{
				RoomID:   room.RoomID,
				RoomName: room.Name,
			}, nil)

		case events.JoinRoom:
			var payload eventpayloads.JoinRoomPayload

			if err := json.Unmarshal(incoming.Payload, &payload); err != nil {
				log.Println("join room payload error:", err)
				break
			}

			log.Printf("Joining room: %+v\n", payload)

			room, err := services.JoinRoom(payload, c)

			if err != nil {
				log.Println("join room error:", err)

				utils.SendResponse[*eventpayloads.JoinRoomResponse](c, events.JoinRoom, nil, errors.WrapError(err))

				continue
			}

			joinedRoomID = payload.RoomID
			playerID = payload.JoinerID

			playerMetadataList := make([]*gametypes.PlayerMetadata, len(room.Players))

			for i, player := range room.Players {
				playerMetadataList[i] = &gametypes.PlayerMetadata{
					ID:   player.Metadata.ID,
					Name: player.Metadata.Name,
				}
			}

			utils.SendResponse(c, events.JoinRoom, &eventpayloads.JoinRoomResponse{
				RoomID:   room.RoomID,
				RoomName: room.Name,
				HostID:   room.HostID,
				Mode:     room.Mode,
				Players:  playerMetadataList,
			}, nil)

			// Notify other players in the room
			broadcastPayload := &eventpayloads.PlayerJoinedResponse{
				RoomID:     payload.RoomID,
				JoinerID:   playerID,
				JoinerName: payload.JoinerName,
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

			playerMetadata, err := services.LeaveRoom(payload.RoomID, playerID)

			if err != nil {
				log.Println("leave room error:", err)
				utils.SendResponse[*eventpayloads.LeaveRoomResponse](c, events.LeaveRoom, nil, errors.WrapError(err))

				continue
			}

			joinedRoomID = ""

			utils.SendResponse(c, events.LeaveRoom, &eventpayloads.LeaveRoomResponse{}, nil)

			// Notify other players in the room
			broadcastPayload := &eventpayloads.PlayerLeftResponse{
				RoomID:     payload.RoomID,
				PlayerID:   playerMetadata.ID,
				PlayerName: playerMetadata.Name,
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

			playerMetadataList := make([]*gametypes.PlayerMetadata, len(room.Players))

			for i, player := range room.Players {
				playerMetadataList[i] = player.Metadata
			}

			utils.SendResponse(c, events.RoomState, &eventpayloads.RoomStateResponse{
				RoomID:   room.RoomID,
				RoomName: room.Name,
				HostID:   room.HostID,
				Mode:     room.Mode,
				Players:  playerMetadataList,
			}, nil)

		default:
			log.Println("Unhandled event:", incoming.Event)
		}
	}
}
