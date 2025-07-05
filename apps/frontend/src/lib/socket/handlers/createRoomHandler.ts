import { socketManager } from '$lib/stores/socket.svelte';
import type { BaseResponse, CreateRoomResponse } from '../../../types/event-payloads/server';

export const createRoomHandler = (
	payload: BaseResponse<CreateRoomResponse>,
	done?: (result: BaseResponse<CreateRoomResponse>) => void
) => {
	if (!payload.success || !payload.data?.roomId) {
		console.error('Failed to create room:', payload.error);

		if (done) {
			done(payload);
		}

		return;
	}

	const roomId = payload.data!.roomId;
	const roomName = payload.data!.roomName;
	const mode = payload.data!.mode || '1v1';
	const hostId = payload.data!.hostId || '';

	// Clear previous roomState
	socketManager.clearRoomState();

	socketManager.roomState = {
		id: roomId,
		name: roomName,
		hostId: hostId,
		mode: mode,
		players: []
	};

	console.log(`Room created with ID: ${roomId}`);

	if (done) {
		done(payload);
	}
};
