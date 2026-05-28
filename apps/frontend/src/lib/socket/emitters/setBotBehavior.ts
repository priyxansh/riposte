import { getRoomState as getRoomStateValue } from '$lib/stores/room.svelte';
import { socketManager } from '$lib/stores/socket.svelte';
import type { BotBehavior } from './addBot';

export const setBotBehavior = (botId: string, botBehavior: BotBehavior) => {
	const room = getRoomStateValue();
	const roomId = room?.id;

	if (!roomId) {
		console.error('[setBotBehavior] No room ID found. Cannot update bot behavior.');
		return;
	}

	socketManager.sendMessage(
		JSON.stringify({
			event: 'set_bot_behavior',
			payload: {
				roomId,
				botId,
				botBehavior
			}
		})
	);
};
