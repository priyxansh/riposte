package routes

import (
	"riposte-backend/src/handlers"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"
)

func SetupRoutes(app *fiber.App) {
	api := app.Group("/api")
	ws := app.Group("/ws")

	api.Get("/ping", handlers.Ping)

	ws.Get("/", websocket.New(handlers.SocketHandler))
}
