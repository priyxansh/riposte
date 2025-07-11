import { clearRoomState, setRoomState } from '$lib/stores/room.svelte';
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

	const roomStateData = payload.data;

	if (!roomStateData) {
		console.error('No room state data found in response');
		return;
	}

	// Clear previous roomState
	clearRoomState();

	setRoomState({
		id: roomStateData.roomId,
		name: roomStateData.roomName,
		hostId: roomStateData.hostId,
		mode: roomStateData.mode || '1v1',
		players: roomStateData.players || []
	});

	if (done) {
		done(payload);
	}
};
