import { setRoomState, updateRoomState } from '$lib/stores/room.svelte';
import type {
	BaseBroadcastResponse,
	GameLoopResponse
} from '../../../../types/event-payloads/server';

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

	// Process the game loop data
	updateRoomState({
		players: payload.data.playerStates.map((player) => ({
			id: player.id,
			name: player.name,
			state: {
				x: player.state.x,
				y: player.state.y,
				vx: player.state.vx,
				vy: player.state.vy
			}
		}))
	});

	if (done) {
		done(payload);
	}
};
