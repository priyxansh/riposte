import { EVENTS } from '$lib/constants/events';
import { socketManager } from '$lib/stores/socket.svelte';
import { getLocalPlayerState, updateLocalPlayerState } from '$lib/stores/room.svelte';
import { getNextSequenceNumber, bufferInput, applyInputToState } from '$lib/prediction/prediction';
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

	// Generate and buffer the input for reconciliation
	const sequenceNumber = getNextSequenceNumber();
	bufferInput({
		sequenceNumber,
		direction,
		keyState,
		timestamp: performance.now()
	});

	// IMMEDIATE PREDICTION: Apply input to local state right now
	const currentState = getLocalPlayerState(playerId);
	if (currentState) {
		const predictedState = applyInputToState(currentState, direction, keyState);
		updateLocalPlayerState(playerId, predictedState);
	}

	// Send to server
	socketManager.sendMessage(
		JSON.stringify({
			event: EVENTS.MOVE_PLAYER,
			payload: {
				playerId,
				direction,
				keyState,
				sequenceNumber
			} satisfies MovePlayerPayload
		})
	);
};

