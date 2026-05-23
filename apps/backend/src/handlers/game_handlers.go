package handlers

import (
	"encoding/json"
	"log"

	"riposte-backend/src/events"
	"riposte-backend/src/services"
	"riposte-backend/src/types/errors"
	eventpayloads "riposte-backend/src/types/event_payloads"
	"riposte-backend/src/utils"

	"github.com/gofiber/websocket/v2"
)

func handleStartGame(c *websocket.Conn, rawPayload json.RawMessage, playerID string) {
	var payload eventpayloads.StartGamePayload
	if err := json.Unmarshal(rawPayload, &payload); err != nil {
		log.Println("start game payload error:", err)
		return
	}

	log.Printf("Starting game in room: %+v\n", payload)

	if err := services.StartGameLoop(payload.RoomID); err != nil {
		log.Println("start game error:", err)
		utils.SendResponse[*eventpayloads.StartGameResponse](c, events.StartGame, nil, errors.WrapError(err))
		return
	}

	utils.SendResponse(c, events.StartGame, &eventpayloads.StartGameResponse{}, nil)

	// Notify all players in the room
	broadcastPayload := &eventpayloads.GameStartedResponse{
		RoomID: payload.RoomID,
	}

	err := services.BroadcastToRoom(payload.RoomID, events.GameStarted, broadcastPayload, playerID)
	if err != nil {
		log.Println("broadcast game started error:", err)
	}
}

func handleMovePlayer(c *websocket.Conn, rawPayload json.RawMessage, joinedRoomID string) {
	var payload eventpayloads.MovePlayerPayload
	if err := json.Unmarshal(rawPayload, &payload); err != nil {
		log.Println("move player payload error:", err)
		return
	}

	log.Printf("Moving player: %+v\n", payload)

	if err := services.MovePlayer(joinedRoomID, payload); err != nil {
		log.Println("move player error:", err)
		utils.SendResponse[*eventpayloads.MovePlayerResponse](c, events.MovePlayer, nil, errors.WrapError(err))
		return
	}

	// No success response needed, since the game loop will handle broadcasting player states each tick
}
