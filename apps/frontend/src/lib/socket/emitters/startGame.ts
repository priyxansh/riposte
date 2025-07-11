import { socketManager } from '$lib/stores/socket.svelte';

export const startGame = () => {
	const roomId = socketManager.roomState?.id;

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
