import { socketManager } from '$lib/stores/socket.svelte';
import type { CreateRoomPayload } from '../../../types/event-payloads/client';

export const createRoom = ({ hostName, roomName, mode, hostId }: CreateRoomPayload) => {
	// Check if the socket is connected
	if (socketManager.connectionState !== 'connected') {
		console.error('Socket is not connected. Cannot create room.');
		return;
	}

	// Emit the createRoom event with the necessary payload
	socketManager.sendMessage(
		JSON.stringify({
			event: 'create_room',
			payload: {
				roomName: roomName,
				mode: mode,
				hostId: hostId,
				hostName: hostName
			}
		})
	);
};
