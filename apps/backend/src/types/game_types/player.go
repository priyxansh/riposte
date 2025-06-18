package gametypes

import (
	"github.com/gofiber/websocket/v2"
)

type Player struct {
	ID   string
	Conn *websocket.Conn
}

type PlayerMetadata struct {
	ID string `json:"id"`
}
