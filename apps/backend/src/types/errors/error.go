package errors

type ErrorType string

const (
	ErrRoomNotFound    ErrorType = "room_not_found"
	ErrRoomFull        ErrorType = "room_full"
	ErrInvalidMode     ErrorType = "invalid_mode"
	ErrAlreadyInRoom   ErrorType = "already_in_room"
	ErrPlayerNotInRoom ErrorType = "player_not_in_room"

	UnknownError ErrorType = "unknown_error"
)
