package handlers

import (
	"encoding/json"
	"log"

	"riposte-backend/src/events"
	"riposte-backend/src/services"
	"riposte-backend/src/types"
	eventpayloads "riposte-backend/src/types/event_payloads"

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
			handleCreateRoom(c, incoming.Payload, &joinedRoomID, &playerID)

		case events.JoinRoom:
			handleJoinRoom(c, incoming.Payload, &joinedRoomID, &playerID)

		case events.LeaveRoom:
			handleLeaveRoom(c, incoming.Payload, &joinedRoomID, playerID)

		case events.GetRoomState:
			handleGetRoomState(c, incoming.Payload)

		case events.StartGame:
			handleStartGame(c, incoming.Payload, playerID)

		case events.MovePlayer:
			handleMovePlayer(c, incoming.Payload, joinedRoomID)

		case events.AddBot:
			handleAddBot(c, incoming.Payload)

		case events.SetBotBehavior:
			handleSetBotBehavior(c, incoming.Payload)

		default:
			log.Println("Unhandled event:", incoming.Event)
		}
	}
}
