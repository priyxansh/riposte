package services

import (
	"log"
	"slices"
	"sync"

	"riposte-backend/src/constants"
	"riposte-backend/src/types/errors"
	eventpayloads "riposte-backend/src/types/event_payloads"
	gametypes "riposte-backend/src/types/game_types"
	"riposte-backend/src/utils"

	"github.com/gofiber/websocket/v2"
	"github.com/google/uuid"
)

var (
	rooms = make(map[string]*gametypes.Room)
	mu    sync.Mutex
)

// CreateRoom generates a roomID and creates a room with the host as the first player
func CreateRoom(payload eventpayloads.CreateRoomPayload, hostConn *websocket.Conn) (*gametypes.Room, error) {
	mu.Lock()
	defer mu.Unlock()

	mode := payload.Mode
	roomName := payload.RoomName
	hostID := payload.HostID
	hostName := payload.HostName

	if mode != "1v1" && mode != "2v2" {
		return nil, errors.NewGameError(errors.ErrInvalidMode, "invalid game mode")
	}

	roomID := uuid.NewString()

	playerMetadata := &gametypes.PlayerMetadata{
		ID:    hostID,
		Name:  hostName,
		IsBot: false,
	}

	player := &gametypes.Player{
		Conn:     hostConn,
		Metadata: playerMetadata,
	}

	rooms[roomID] = &gametypes.Room{
		Name:    roomName,
		RoomID:  roomID,
		Players: []*gametypes.Player{player},
		Mode:    mode,
		HostID:  hostID,
	}

	return rooms[roomID], nil
}

// JoinRoom adds a player with an ID and connection to a room
func JoinRoom(payload eventpayloads.JoinRoomPayload, conn *websocket.Conn) (*gametypes.Room, error) {
	mu.Lock()
	defer mu.Unlock()

	roomID := payload.RoomID
	playerID := payload.JoinerID
	playerName := payload.JoinerName

	room, exists := rooms[roomID]

	if !exists {
		return nil, errors.NewGameError(errors.ErrRoomNotFound, "room not found")
	}

	playerMetadata := &gametypes.PlayerMetadata{
		ID:    playerID,
		Name:  playerName,
		IsBot: false,
	}

	player := &gametypes.Player{
		Conn:     conn,
		Metadata: playerMetadata,
	}

	return room.AddPlayer(player)
}

// LeaveRoom removes the player connection from the room and deletes room if empty
func LeaveRoom(roomID string, playerId string) (*gametypes.PlayerMetadata, error) {
	mu.Lock()
	room, exists := rooms[roomID]
	mu.Unlock()

	if !exists {
		return nil, errors.NewGameError(errors.ErrRoomNotFound, "room not found")
	}

	playerMetadata := room.RemovePlayerByID(playerId)

	// Use room.ConnCount() inside room's lock to avoid race
	shouldDelete := false
	room.DoLocked(func() {
		if room.ConnCount() == 0 {
			shouldDelete = true
		}
	})

	if shouldDelete {
		mu.Lock()
		delete(rooms, roomID)
		mu.Unlock()
		log.Printf("Room %s deleted after player %s left", roomID, playerId)
	} else {
		log.Printf("Player %s left room %s", playerId, roomID)
	}

	return playerMetadata, nil
}

// BroadcastToRoom sends a message to all players in a room, except specified players
func BroadcastToRoom[T any](roomID string, event string, payload *T, exceptedPlayerIDs ...string) error {
	mu.Lock()
	room, exists := rooms[roomID]
	mu.Unlock()

	if !exists {
		return errors.NewGameError(errors.ErrRoomNotFound, "room not found")
	}

	room.DoLocked(func() {
		if len(room.Players) == 0 {
			log.Println("No players in room to broadcast message")
			return
		}

		for _, player := range room.Players {
			if player.Conn != nil {
				if len(exceptedPlayerIDs) == 0 || !slices.Contains(exceptedPlayerIDs, player.Metadata.ID) {
					err := utils.SendBroadcast(player.Conn, event, payload)
					if err != nil {
						log.Printf("Error sending message to player %s: %v", player.Metadata.ID, err)
					}
				}
			} else if !player.IsBot {
				log.Printf("Player %s has no connection", player.Metadata.ID)
			}
		}
	})

	return nil
}

// GetRoom returns a pointer to a room if it exists
func GetRoom(roomID string) (*gametypes.Room, error) {
	mu.Lock()
	defer mu.Unlock()

	room, exists := rooms[roomID]

	if !exists {
		return nil, errors.NewGameError(errors.ErrRoomNotFound, "room not found")
	}

	return room, nil
}

// AddBot creates a server-controlled dummy player and injects it into the room.
// The bot is assigned an initial state immediately so it can participate in the
// physics loop as soon as the game starts (or immediately if already running).
func AddBot(roomID string, botName string, botBehavior string) (*gametypes.Player, error) {
	mu.Lock()
	room, exists := rooms[roomID]
	mu.Unlock()

	if !exists {
		return nil, errors.NewGameError(errors.ErrRoomNotFound, "room not found")
	}

	botID := "bot-" + uuid.NewString()

	botMetadata := &gametypes.PlayerMetadata{
		ID:    botID,
		Name:  botName,
		IsBot: true,
	}

	// Derive initial state index based on current player count
	var botState *gametypes.PlayerState
	room.DoLocked(func() {
		idx := len(room.Players)
		var initialStates []*gametypes.PlayerState
		if room.Mode == "2v2" {
			initialStates = constants.NewInitialStates2v2()
		} else {
			initialStates = constants.NewInitialStates1v1()
		}
		if idx < len(initialStates) {
			s := *initialStates[idx] // copy to avoid aliasing
			botState = &s
		} else {
			botState = &gametypes.PlayerState{
				X:               300,
				Y:               300,
				FacingDirection: -1,
				HasAirDash:      true,
				Health:          constants.MaxHealth,
			}
		}
	})

	bot := &gametypes.Player{
		Conn:        nil,
		Metadata:    botMetadata,
		State:       botState,
		IsBot:       true,
		BotBehavior: botBehavior,
	}

	var err error
	room.DoLocked(func() {
		room.Players = append(room.Players, bot)
	})

	if err != nil {
		return nil, err
	}

	log.Printf("Bot %s (%s) added to room %s with behavior %q", botName, botID, roomID, botBehavior)
	return bot, nil
}

// SetBotBehavior updates the active AI routine for a bot in the given room.
func SetBotBehavior(roomID string, botID string, behavior string) error {
	mu.Lock()
	room, exists := rooms[roomID]
	mu.Unlock()

	if !exists {
		return errors.NewGameError(errors.ErrRoomNotFound, "room not found")
	}

	found := false
	room.DoLocked(func() {
		for _, player := range room.Players {
			if player.IsBot && player.Metadata.ID == botID {
				player.BotBehavior = behavior
				found = true
				break
			}
		}
	})

	if !found {
		return errors.NewGameError(errors.ErrPlayerNotFound, "bot not found in room")
	}

	log.Printf("Bot %s in room %s behavior set to %q", botID, roomID, behavior)
	return nil
}

