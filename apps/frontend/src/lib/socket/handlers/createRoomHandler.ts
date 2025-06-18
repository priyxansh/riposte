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

	socketManager.roomState = {
		id: roomId,
		name: `Room ${roomId}`,
		hostId: '', // Placeholder value, should be set after room creation
		mode: '1v1', // Placeholder value, should be set based on user selection
		players: []
	};

	console.log(`Room created with ID: ${roomId}`);

	if (done) {
		done(payload);
	}
};
