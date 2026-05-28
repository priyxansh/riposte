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
			facingDirection: player.state.facingDirection ?? 1,
			isDashing: player.state.isDashing ?? false,
			isDownDashing: player.state.isDownDashing ?? false,
			dashTimer: player.state.dashTimer ?? 0,
			dashCooldown: player.state.dashCooldown ?? 0,
			hasAirDash: player.state.hasAirDash ?? true,
			isHoldingLeft: player.state.isHoldingLeft ?? false,
			isHoldingRight: player.state.isHoldingRight ?? false,
			isBlocking: player.state.isBlocking ?? false,
			isAttacking: player.state.isAttacking ?? false,
			attackTimer: player.state.attackTimer ?? 0,
			attackCooldown: player.state.attackCooldown ?? 0,
			attackHitChecked: player.state.attackHitChecked ?? false,
			posture: player.state.posture ?? 0,
			blockTimer: player.state.blockTimer ?? 0,
			lastHitResult: player.state.lastHitResult ?? '',
			health: player.state.health ?? 100,
			isStaggered: player.state.isStaggered ?? false,
			staggerTimer: player.state.staggerTimer ?? 0,
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
			isBot: player.isBot,
			state
		};
	});

	updateRoomState({ players });

	if (done) {
		done(payload);
	}
};
