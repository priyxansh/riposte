package config

import (
	"riposte-backend/src/routes"

	"github.com/gofiber/fiber/v2"
)

func CreateServer() *fiber.App {
	app := fiber.New()

	routes.SetupRoutes(app)

	return app
}
