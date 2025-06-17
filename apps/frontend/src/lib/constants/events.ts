export const EVENTS = {
	CONNECT: 'connect',
	CREATE_ROOM: 'create_room',
	JOIN_ROOM: 'join_room',
	LEAVE_ROOM: 'leave_room',
	ROOM_STATE: 'room_state',
	PLAYER_JOINED: 'player_joined',
	PLAYER_LEFT: 'player_left'
} as const;

export type EventKey = keyof typeof EVENTS;
export type EventName = (typeof EVENTS)[EventKey];
