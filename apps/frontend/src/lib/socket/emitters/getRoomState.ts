import { socketManager } from '$lib/stores/socket.svelte';

export const getRoomState = () => {
	const roomId = socketManager.roomState?.id;

	if (!roomId) {
		console.error('No room ID found. Cannot get room state.');
		return;
	}

	// Emit the getRoomState event with the necessary payload
	socketManager.sendMessage(
		JSON.stringify({
			event: 'get_room_state',
			payload: {
				roomId: roomId
			}
		})
	);
};
