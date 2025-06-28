package gametypes

import (
	"github.com/gofiber/websocket/v2"
)

type Player struct {
	Conn     *websocket.Conn
	Metadata *PlayerMetadata `json:"metadata"`
	State    *PlayerState    `json:"state"`
}

type PlayerMetadata struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type PlayerState struct {
	X int `json:"x"`
	Y int `json:"y"` // For simplicity
}
