import { socketManager } from '$lib/stores/socket.svelte';

export const createRoomHandler = (payload: { roomId: string }) => {
	const { roomId } = payload;

	socketManager.roomState.roomId = roomId || null;

	console.log(`Room created with ID: ${roomId}`);
};
