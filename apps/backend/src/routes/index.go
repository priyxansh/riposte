package routes

import (
	"riposte-backend/src/handlers"

	"github.com/gofiber/fiber/v2"
)

func SetupRoutes(app *fiber.App) {
	app.Get("/ping", handlers.Ping)
}
