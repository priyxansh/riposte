package errors

import "fmt"

type GameError struct {
	Type    ErrorType `json:"type"`
	Message string    `json:"message"`
}

func (e *GameError) Error() string {
	return fmt.Sprintf("%s: %s", e.Type, e.Message)
}

func NewGameError(t ErrorType, msg string) *GameError {
	return &GameError{
		Type:    t,
		Message: msg,
	}
}
