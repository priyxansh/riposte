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
