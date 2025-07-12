import type { KeyState, MoveDirection } from '../player';

export type CreateRoomPayload = {
	roomName: string;
	mode: '1v1' | '2v2';
	hostId: string;
	hostName: string;
};

export type JoinRoomPayload = {
	roomId: string;
	playerId: string;
	playerName: string;
};

export type LeaveRoomPayload = {
	roomId: string;
};

export type GetRoomStatePayload = {
	roomId: string;
};

export type StartGamePayload = {
	roomId: string;
};

export type MovePlayerPayload = {
	playerId: string;
	direction: MoveDirection;
	keyState: KeyState;
};
