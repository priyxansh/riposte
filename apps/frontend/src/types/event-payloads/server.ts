import type { GameError } from '../game-error';
import type { Player, PlayerSnapshot } from '../player';

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
	roomName: string;
	hostId: string;
	mode: '1v1' | '2v2';
};

export type JoinRoomResponse = {
	roomId: string;
	roomName: string;
	hostId: string;
	mode: '1v1' | '2v2';
	players: Player[];
};

export type LeaveRoomResponse = {};

export type GetRoomStateResponse = {
	roomId: string;
	roomName: string;
	hostId: string;
	mode: '1v1' | '2v2';
	players: Player[];
};

export type PlayerJoinedResponse = {
	roomId: string;
	joinerId: string;
	joinerName: string;
};

export type PlayerLeftResponse = {
	roomId: string;
	playerId: string;
	playerName: string;
};

export type StartGameResponse = {};

export type GameStartedResponse = {
	roomId: string;
};

export type GameLoopResponse = {
	roomId: string;
	playerStates: PlayerSnapshot[];
};
