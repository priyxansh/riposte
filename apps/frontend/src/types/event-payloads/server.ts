import type { GameError } from '../game-error';
import type { Player } from '../player';

export type BaseResponse<T> = {
	success: boolean;
	data?: T;
	error?: GameError;
};

export type BaseBroadcastResponse<T> = {
	isBroadcast: true;
	data: T;
};

export type CreateRoomResponse = {
	roomId: string;
};

export type JoinRoomResponse = {
	roomId: string;
	hostId: string;
	mode: '1v1' | '2v2';
	players: Player[];
};

export type LeaveRoomResponse = {};
