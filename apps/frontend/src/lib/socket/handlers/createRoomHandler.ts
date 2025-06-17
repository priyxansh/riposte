import { socketManager } from '$lib/stores/socket.svelte';
import type { BaseResponse, CreateRoomResponse } from '../../../types/event-payloads/server';
import type { GameError } from '../../../types/game-error';

export const createRoomHandler = (
	payload: BaseResponse<CreateRoomResponse>,
	done?: (result: { success: true; roomId: string } | { success: false; error: GameError }) => void
) => {
	if (!payload.success) {
		console.error('Failed to create room:', payload.error);

		if (done) {
			done({ success: false, error: payload.error! });
		}
		return;
	}

	const roomId = payload.data!.roomId;

	socketManager.roomState.roomId = roomId || null;

	console.log(`Room created with ID: ${roomId}`);

	if (done) {
		done({ success: true, roomId });
	}
};
