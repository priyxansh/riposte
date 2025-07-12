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
				HostID:   room.HostID,
				Mode:     room.Mode,
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

		case events.GetRoomState:
			var payload eventpayloads.GetRoomStatePayload
			if err := json.Unmarshal(incoming.Payload, &payload); err != nil {
				log.Println("room state payload error:", err)
				break
			}

			log.Printf("Fetching room state for: %+v\n", payload)

			room, err := services.GetRoom(payload.RoomID)

			if err != nil {
				log.Println("get room error:", err)
				utils.SendResponse[*eventpayloads.GetRoomStateResponse](c, events.GetRoomState, nil, errors.WrapError(err))

				continue
			}

			playerMetadataList := make([]*gametypes.PlayerMetadata, len(room.Players))

			for i, player := range room.Players {
				playerMetadataList[i] = player.Metadata
			}

			utils.SendResponse(c, events.GetRoomState, &eventpayloads.GetRoomStateResponse{
				RoomID:   room.RoomID,
				RoomName: room.Name,
				HostID:   room.HostID,
				Mode:     room.Mode,
				Players:  playerMetadataList,
			}, nil)

		case events.StartGame:
			var payload eventpayloads.StartGamePayload
			if err := json.Unmarshal(incoming.Payload, &payload); err != nil {
				log.Println("start game payload error:", err)
				break
			}

			log.Printf("Starting game in room: %+v\n", payload)

			if err := services.StartGameLoop(payload.RoomID); err != nil {
				log.Println("start game error:", err)
				utils.SendResponse[*eventpayloads.StartGameResponse](c, events.StartGame, nil, errors.WrapError(err))

				continue
			}

			utils.SendResponse(c, events.StartGame, &eventpayloads.StartGameResponse{}, nil)

			// Notify all players in the room
			broadcastPayload := &eventpayloads.GameStartedResponse{
				RoomID: payload.RoomID,
			}

			err = services.BroadcastToRoom(payload.RoomID, events.GameStarted, broadcastPayload, playerID)

			if err != nil {
				log.Println("broadcast game started error:", err)
			}

		case events.MovePlayer:
			var payload eventpayloads.MovePlayerPayload
			if err := json.Unmarshal(incoming.Payload, &payload); err != nil {
				log.Println("move player payload error:", err)
				break
			}

			log.Printf("Moving player: %+v\n", payload)

			if err := services.MovePlayer(joinedRoomID, payload); err != nil {
				log.Println("move player error:", err)
				utils.SendResponse[*eventpayloads.MovePlayerResponse](c, events.MovePlayer, nil, errors.WrapError(err))
				continue
			}

			// No success response needed, since the game loop will handle broadcasting player states each tick

		default:
			log.Println("Unhandled event:", incoming.Event)
		}
	}
}
