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

func handleAddBot(c *websocket.Conn, rawPayload json.RawMessage) {
	var payload eventpayloads.AddBotPayload
	if err := json.Unmarshal(rawPayload, &payload); err != nil {
		log.Println("add bot payload error:", err)
		return
	}

	behavior := payload.BotBehavior
	if behavior == "" {
		behavior = "idle"
	}

	botName := payload.BotName
	if botName == "" {
		botName = "Bot"
	}

	log.Printf("Spawning bot %q with behavior %q in room %s", botName, behavior, payload.RoomID)

	bot, err := services.AddBot(payload.RoomID, botName, behavior)
	if err != nil {
		log.Println("add bot error:", err)
		utils.SendResponse[*eventpayloads.AddBotResponse](c, events.AddBot, nil, errors.WrapError(err))
		return
	}

	utils.SendResponse(c, events.AddBot, &eventpayloads.AddBotResponse{
		BotID:   bot.Metadata.ID,
		BotName: bot.Metadata.Name,
	}, nil)

	// Notify all players in the room that a bot has joined
	broadcastPayload := &eventpayloads.PlayerJoinedResponse{
		RoomID:     payload.RoomID,
		JoinerID:   bot.Metadata.ID,
		JoinerName: bot.Metadata.Name,
	}

	if err := services.BroadcastToRoom(payload.RoomID, events.PlayerJoined, broadcastPayload); err != nil {
		log.Println("broadcast bot joined error:", err)
	}
}

func handleSetBotBehavior(c *websocket.Conn, rawPayload json.RawMessage) {
	var payload eventpayloads.SetBotBehaviorPayload
	if err := json.Unmarshal(rawPayload, &payload); err != nil {
		log.Println("set bot behavior payload error:", err)
		return
	}

	log.Printf("Setting bot %s behavior to %q in room %s", payload.BotID, payload.BotBehavior, payload.RoomID)

	if err := services.SetBotBehavior(payload.RoomID, payload.BotID, payload.BotBehavior); err != nil {
		log.Println("set bot behavior error:", err)
		utils.SendResponse[*eventpayloads.SetBotBehaviorResponse](c, events.SetBotBehavior, nil, errors.WrapError(err))
		return
	}

	utils.SendResponse(c, events.SetBotBehavior, &eventpayloads.SetBotBehaviorResponse{}, nil)
}
