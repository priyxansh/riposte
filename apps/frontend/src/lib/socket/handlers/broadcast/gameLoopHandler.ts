import { updateRoomState } from '$lib/stores/room.svelte';
import { reconcile } from '$lib/prediction/prediction';
import type {
	BaseBroadcastResponse,
	GameLoopResponse
} from '../../../../types/event-payloads/server';
import type { PlayerSnapshot, PlayerState } from '../../../../types/player';

export const gameLoopHandler = (
	payload: BaseBroadcastResponse<GameLoopResponse>,
	done?: (payload: BaseBroadcastResponse<GameLoopResponse>) => void
) => {
	if (!payload.data || !payload.data.playerStates) {
		console.error('Invalid game loop payload:', payload);

		if (done) {
			done(payload);
		}

		return;
	}

	const localPlayerId = localStorage.getItem('playerId');
	const lastProcessedInput = payload.data.lastProcessedInput || {};

	// Process each player's state
	const players = payload.data.playerStates.map((player: PlayerSnapshot) => {
		let state: PlayerState = {
			x: player.state.x,
			y: player.state.y,
			vx: player.state.vx,
			vy: player.state.vy,
			isGrounded: player.state.isGrounded,
			lastUpdateTime: performance.now()
		};

		// For the local player, apply reconciliation
		if (player.id === localPlayerId) {
			const lastSeq = lastProcessedInput[player.id] || 0;
			state = reconcile(state, lastSeq);
		}

		return {
			id: player.id,
			name: player.name,
			state
		};
	});

	updateRoomState({ players });

	if (done) {
		done(payload);
	}
};
