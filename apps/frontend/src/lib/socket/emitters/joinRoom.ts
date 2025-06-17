import { socketManager } from '$lib/stores/socket.svelte';
import type { JoinRoomPayload } from '../../../types/event-payloads/client';

export const joinRoom = ({ roomId, playerId }: JoinRoomPayload) => {
	// Check if the socket is connected
	if (socketManager.connectionState !== 'connected') {
		console.error('Socket is not connected. Cannot join room.');
		return;
	}

	// Clear previous roomState
	socketManager.clearRoomState();

	// Emit the joinRoom event with the necessary payload
	socketManager.sendMessage(
		JSON.stringify({
			event: 'join_room',
			payload: { roomId: roomId, joinerId: playerId }
		})
	);
};
