import type { EVENTS } from '$lib/constants/events';
import type {
	CreateRoomPayload,
	GetRoomStatePayload,
	JoinRoomPayload,
	LeaveRoomPayload
} from './client';

import type {
	CreateRoomResponse,
	GetRoomStateResponse,
	JoinRoomResponse,
	LeaveRoomResponse
} from './server';

import type { BaseResponse } from './server';

export type RequestPayload = {
	[EVENTS.CREATE_ROOM]: CreateRoomPayload;
	[EVENTS.JOIN_ROOM]: JoinRoomPayload;
	[EVENTS.LEAVE_ROOM]: LeaveRoomPayload;
	[EVENTS.GET_ROOM_STATE]: GetRoomStatePayload;
};

export type ResponsePayload = {
	[EVENTS.CREATE_ROOM]: BaseResponse<CreateRoomResponse>;
	[EVENTS.JOIN_ROOM]: BaseResponse<JoinRoomResponse>;
	[EVENTS.LEAVE_ROOM]: BaseResponse<LeaveRoomResponse>;
	[EVENTS.GET_ROOM_STATE]: BaseResponse<GetRoomStateResponse>;
};
