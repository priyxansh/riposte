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
	X  float64 `json:"x"`
	Y  float64 `json:"y"`
	VX float64 `json:"vx"` // velocity x
	VY float64 `json:"vy"` // velocity y
}
