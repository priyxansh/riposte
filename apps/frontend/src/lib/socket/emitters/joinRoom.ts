import { socketManager } from '$lib/stores/socket.svelte';
import type { JoinRoomPayload } from '../../../types/event-payloads/client';

export const joinRoom = ({ roomId, playerId, playerName }: JoinRoomPayload) => {
	// Check if the socket is connected
	if (socketManager.connectionState !== 'connected') {
		console.error('Socket is not connected. Cannot join room.');
		return;
	}

	// Emit the joinRoom event with the necessary payload
	socketManager.sendMessage(
		JSON.stringify({
			event: 'join_room',
			payload: { roomId: roomId, joinerId: playerId, joinerName: playerName }
		})
	);
};
