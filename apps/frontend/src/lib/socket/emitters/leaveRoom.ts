import { EVENTS } from '$lib/constants/events';
import { socketManager } from '$lib/stores/socket.svelte';

export const leaveRoom = () => {
	const roomId = socketManager.roomState?.id;

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
