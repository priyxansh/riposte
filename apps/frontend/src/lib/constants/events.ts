export const EVENTS = {
	CONNECT: 'connect',
	CREATE_ROOM: 'create_room',
	JOIN_ROOM: 'join_room',
	LEAVE_ROOM: 'leave_room',
	GET_ROOM_STATE: 'get_room_state',
	PLAYER_JOINED: 'player_joined',
	PLAYER_LEFT: 'player_left',
	START_GAME: 'start_game',
	GAME_STARTED: 'game_started',
	GAME_LOOP: 'game_loop',
	MOVE_PLAYER: 'move_player'
} as const;

export type EventKey = keyof typeof EVENTS;
export type EventName = (typeof EVENTS)[EventKey];
