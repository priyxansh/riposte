import { EVENTS } from '$lib/constants/events';
import { socketManager } from '$lib/stores/socket.svelte';
import type { MovePlayerPayload } from '../../../types/event-payloads/client';
import type { KeyState, MoveDirection } from '../../../types/player';

export const movePlayer = ({
	direction,
	keyState
}: {
	direction: MoveDirection;
	keyState: KeyState;
}) => {
	const playerId = localStorage.getItem('playerId');

	if (!playerId) {
		console.error('Player ID not found in local storage');
		return;
	}

	socketManager.sendMessage(
		JSON.stringify({
			event: EVENTS.MOVE_PLAYER,
			payload: {
				playerId,
				direction: direction,
				keyState: keyState
			} as MovePlayerPayload
		})
	);
};
