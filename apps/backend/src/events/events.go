package events

const (
	// Client emitted events

	Connect          = "connect"
	CreateRoom       = "create_room"
	JoinRoom         = "join_room"
	LeaveRoom        = "leave_room"
	StartGame        = "start_game"
	PlayerMove       = "player_move"
	PlayerAttack     = "player_attack"
	GameState        = "game_state"
	GameEnd          = "game_end"
	PlayerDisconnect = "player_disconnect"
	GetRoomState     = "get_room_state"
	MovePlayer       = "move_player"

	// Server emitted events, mainly broadcasts

	PlayerJoined = "player_joined"
	PlayerLeft   = "player_left"
	GameLoop     = "game_loop"
	GameStarted  = "game_started"
)
