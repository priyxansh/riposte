import type { GameError } from '../game-error';

export type BaseResponse<T> = {
	success: boolean;
	data?: T;
	error?: GameError;
};

export type CreateRoomResponse = {
	roomId: string;
};

export type JoinRoomResponse = {};

export type LeaveRoomResponse = {};
