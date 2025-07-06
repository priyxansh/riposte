import { socketManager } from '$lib/stores/socket.svelte';
import type { BaseResponse, LeaveRoomResponse } from '../../../types/event-payloads/server';

export const leaveRoomHandler = (
	payload: BaseResponse<LeaveRoomResponse>,
	done?: (result: BaseResponse<LeaveRoomResponse>) => void
) => {
	if (!payload.success) {
		console.error('Failed to leave room:', payload.error);

		if (done) {
			done(payload);
		}

		return;
	}

	// Clear the room state
	socketManager.clearRoomState();

	if (done) {
		done(payload);
	}
};
