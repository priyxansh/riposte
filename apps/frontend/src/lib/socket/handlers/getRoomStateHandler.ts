import { socketManager } from '$lib/stores/socket.svelte';
import type { BaseResponse, GetRoomStateResponse } from '../../../types/event-payloads/server';

export const getRoomStateHandler = (
	payload: BaseResponse<GetRoomStateResponse>,
	done?: (result: BaseResponse<GetRoomStateResponse>) => void
) => {
	if (!payload.success) {
		console.error('Failed to get room state:', payload.error);

		if (done) {
			done(payload);
		}

		return;
	}

	const roomState = payload.data;

	if (!roomState) {
		console.error('No room state data found in response');
		return;
	}

	// Clear previous roomState
	socketManager.clearRoomState();

	socketManager.roomState = {
		id: roomState.roomId,
		name: roomState.roomName,
		hostId: roomState.hostId,
		mode: roomState.mode || '1v1',
		players: roomState.players || []
	};

	if (done) {
		done(payload);
	}
};
