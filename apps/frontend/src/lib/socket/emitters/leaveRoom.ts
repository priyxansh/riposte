import { EVENTS } from '$lib/constants/events';
import { getRoomState as getRoomStateValue } from '$lib/stores/room.svelte';
import { socketManager } from '$lib/stores/socket.svelte';

export const leaveRoom = () => {
	const room = getRoomStateValue();
	const roomId = room?.id;

	if (!roomId) {
		console.error('No room ID found. Cannot leave room.');
		return;
	}

	// Emit the leaveRoom event with the necessary payload
	socketManager.sendMessage(
		JSON.stringify({
			event: EVENTS.LEAVE_ROOM,
			payload: {
				roomId: roomId
			}
		})
	);
};
