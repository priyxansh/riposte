package handlers

import (
	"encoding/json"
	"log"

	"riposte-backend/src/events"
	"riposte-backend/src/services"
	"riposte-backend/src/types/errors"
	eventpayloads "riposte-backend/src/types/event_payloads"
	gametypes "riposte-backend/src/types/game_types"
	"riposte-backend/src/utils"

	"github.com/gofiber/websocket/v2"
)

func handleCreateRoom(c *websocket.Conn, rawPayload json.RawMessage, joinedRoomID *string, playerID *string) {
	var payload eventpayloads.CreateRoomPayload

	if err := json.Unmarshal(rawPayload, &payload); err != nil {
		log.Println("create room payload error:", err)
		return
	}

	log.Printf("Creating room: %+v\n", payload)

	room, err := services.CreateRoom(payload, c)
	if err != nil {
		log.Println("create room error:", err)
		utils.SendResponse[*eventpayloads.CreateRoomResponse](c, events.CreateRoom, nil, errors.WrapError(err))
		return
	}

	*joinedRoomID = room.RoomID
	*playerID = payload.HostID

	utils.SendResponse(c, events.CreateRoom, &eventpayloads.CreateRoomResponse{
		RoomID:   room.RoomID,
		RoomName: room.Name,
		HostID:   room.HostID,
		Mode:     room.Mode,
	}, nil)
}

func handleJoinRoom(c *websocket.Conn, rawPayload json.RawMessage, joinedRoomID *string, playerID *string) {
	var payload eventpayloads.JoinRoomPayload

	if err := json.Unmarshal(rawPayload, &payload); err != nil {
		log.Println("join room payload error:", err)
		return
	}

	log.Printf("Joining room: %+v\n", payload)

	room, err := services.JoinRoom(payload, c)
	if err != nil {
		log.Println("join room error:", err)
		utils.SendResponse[*eventpayloads.JoinRoomResponse](c, events.JoinRoom, nil, errors.WrapError(err))
		return
	}

	*joinedRoomID = payload.RoomID
	*playerID = payload.JoinerID

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
		JoinerID:   *playerID,
		JoinerName: payload.JoinerName,
	}

	err = services.BroadcastToRoom(*joinedRoomID, events.PlayerJoined, broadcastPayload, *playerID)
	if err != nil {
		log.Println("broadcast player joined error:", err)
	}
}

func handleLeaveRoom(c *websocket.Conn, rawPayload json.RawMessage, joinedRoomID *string, playerID string) {
	var payload eventpayloads.LeaveRoomPayload

	if err := json.Unmarshal(rawPayload, &payload); err != nil {
		log.Println("leave room payload error:", err)
		return
	}

	log.Printf("Leaving room: %+v\n", payload)

	playerMetadata, err := services.LeaveRoom(payload.RoomID, playerID)
	if err != nil {
		log.Println("leave room error:", err)
		utils.SendResponse[*eventpayloads.LeaveRoomResponse](c, events.LeaveRoom, nil, errors.WrapError(err))
		return
	}

	*joinedRoomID = ""

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
}

func handleGetRoomState(c *websocket.Conn, rawPayload json.RawMessage) {
	var payload eventpayloads.GetRoomStatePayload
	if err := json.Unmarshal(rawPayload, &payload); err != nil {
		log.Println("room state payload error:", err)
		return
	}

	log.Printf("Fetching room state for: %+v\n", payload)

	room, err := services.GetRoom(payload.RoomID)
	if err != nil {
		log.Println("get room error:", err)
		utils.SendResponse[*eventpayloads.GetRoomStateResponse](c, events.GetRoomState, nil, errors.WrapError(err))
		return
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
}
