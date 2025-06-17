import { socketManager } from '$lib/stores/socket.svelte';
import type { CreateRoomPayload } from '../../../types/event-payloads/client';

export const createRoom = ({ roomName, mode, hostId }: CreateRoomPayload) => {
	// Check if the socket is connected
	if (socketManager.connectionState !== 'connected') {
		console.error('Socket is not connected. Cannot create room.');
		return;
	}

	// Clear previous roomState
	socketManager.roomState = { roomId: null, roomName: null, roomMembers: [] };

	// Emit the createRoom event with the necessary payload
	socketManager.sendMessage(
		JSON.stringify({
			event: 'create_room',
			payload: {
				roomName: roomName.trim(),
				mode: mode,
				hostId: hostId
			}
		})
	);
};
