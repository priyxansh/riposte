import type { EVENTS } from '$lib/constants/events';
import type {
	CreateRoomPayload,
	GetRoomStatePayload,
	JoinRoomPayload,
	LeaveRoomPayload,
	StartGamePayload
} from './client';

import type {
	BaseBroadcastResponse,
	CreateRoomResponse,
	GameStartedResponse,
	GetRoomStateResponse,
	JoinRoomResponse,
	LeaveRoomResponse,
	StartGameResponse
} from './server';

import type { BaseResponse } from './server';

export type RequestPayload = {
	[EVENTS.CREATE_ROOM]: CreateRoomPayload;
	[EVENTS.JOIN_ROOM]: JoinRoomPayload;
	[EVENTS.LEAVE_ROOM]: LeaveRoomPayload;
	[EVENTS.GET_ROOM_STATE]: GetRoomStatePayload;
	[EVENTS.START_GAME]: StartGamePayload;
};

export type ResponsePayload = {
	[EVENTS.CREATE_ROOM]: BaseResponse<CreateRoomResponse>;
	[EVENTS.JOIN_ROOM]: BaseResponse<JoinRoomResponse>;
	[EVENTS.LEAVE_ROOM]: BaseResponse<LeaveRoomResponse>;
	[EVENTS.GET_ROOM_STATE]: BaseResponse<GetRoomStateResponse>;
	[EVENTS.START_GAME]: BaseResponse<StartGameResponse>;

	// Broadcast responses
	[EVENTS.PLAYER_JOINED]: BaseBroadcastResponse<JoinRoomResponse>;
	[EVENTS.PLAYER_LEFT]: BaseBroadcastResponse<LeaveRoomResponse>;
	[EVENTS.GAME_STARTED]: BaseBroadcastResponse<GameStartedResponse>;
};
