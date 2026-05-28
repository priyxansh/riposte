import { getRoomState as getRoomStateValue } from '$lib/stores/room.svelte';
import { socketManager } from '$lib/stores/socket.svelte';

export type BotBehavior = 'idle' | 'attack_spam' | 'block' | 'auto_parry';

export const addBot = (botBehavior: BotBehavior = 'idle', botName = 'Bot') => {
	const room = getRoomStateValue();
	const roomId = room?.id;

	if (!roomId) {
		console.error('[addBot] No room ID found. Cannot spawn bot.');
		return;
	}

	socketManager.sendMessage(
		JSON.stringify({
			event: 'add_bot',
			payload: {
				roomId,
				botName,
				botBehavior
			}
		})
	);
};
