package routes

import (
	"riposte-backend/src/handlers"

	"github.com/gofiber/fiber/v2"
)

func SetupRoutes(app *fiber.App) {
	api := app.Group("/api")

	api.Get("/ping", handlers.Ping)
}
