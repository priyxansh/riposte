import { socketManager } from '$lib/stores/socket.svelte';
import type { BaseResponse, CreateRoomResponse } from '../../../types/event-payloads/server';

export const createRoomHandler = (payload: BaseResponse<CreateRoomResponse>) => {
	if (!payload.success) {
		console.error('Failed to create room:', payload.error);
		return;
	}

	const roomId = payload.data!.roomId;

	socketManager.roomState.roomId = roomId || null;

	console.log(`Room created with ID: ${roomId}`);
};
