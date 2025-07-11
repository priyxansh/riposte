import { getRoomState as getRoomStateValue } from '$lib/stores/room.svelte';
import { socketManager } from '$lib/stores/socket.svelte';

export const startGame = () => {
	const room = getRoomStateValue();
	const roomId = room?.id;

	if (!roomId) {
		console.error('No room ID found. Cannot start game.');
		return;
	}

	// Emit the startGame event with the necessary payload
	socketManager.sendMessage(
		JSON.stringify({
			event: 'start_game',
			payload: {
				roomId: roomId
			}
		})
	);
};
