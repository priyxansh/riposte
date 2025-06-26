package gametypes

import (
	"github.com/gofiber/websocket/v2"
)

type Player struct {
	Conn     *websocket.Conn
	Metadata *PlayerMetadata `json:"metadata"`
}

type PlayerMetadata struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}
