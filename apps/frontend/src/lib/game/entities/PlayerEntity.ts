import Phaser from 'phaser';
import type { PlayerState } from '../../../types/player';
import { NETWORK } from '../../constants/network';
import { PHYSICS } from '../../constants/physics';

// Color palettes for player states
const COLORS = {
	LOCAL: {
		GROUNDED: 0x48bb78, // Green
		AIRBORNE: 0xed8936 // Orange
	},
	REMOTE: {
		GROUNDED: 0x4299e1, // Blue
		AIRBORNE: 0x9f7aea // Purple
	}
} as const;

// A timestamped position snapshot received from the server
type PositionSnapshot = {
	time: number; // performance.now() when this snapshot was received
	x: number;
	y: number;
	isGrounded: boolean;
};

export class PlayerEntity {
	private scene: Phaser.Scene;
	private sprite: Phaser.GameObjects.Rectangle;
	private playerId: string;
	private isLocalPlayer: boolean;

	// Tracks the last server packet we processed to prevent duplicating snapshots on every frame
	private lastProcessedUpdate: number = 0;

	// Snapshot buffer for remote players (replaces simple lerp)
	private snapshotBuffer: PositionSnapshot[] = [];

	// --- Local player visual smoothing ---
	// The "true" physics position (set by reconciliation or local tick loop).
	// The sprite may render at a slightly different position while the
	// visual offset decays toward zero.
	private physicsX: number = 0;
	private physicsY: number = 0;

	// Visual offset — the difference between where the sprite WAS visually
	// and where it SHOULD be after a reconciliation snap. Decays each frame.
	private visualOffsetX: number = 0;
	private visualOffsetY: number = 0;

	constructor(
		scene: Phaser.Scene,
		playerId: string,
		isLocalPlayer: boolean,
		initialState?: PlayerState
	) {
		this.scene = scene;
		this.playerId = playerId;
		this.isLocalPlayer = isLocalPlayer;

		const color = isLocalPlayer ? COLORS.LOCAL.GROUNDED : COLORS.REMOTE.GROUNDED;

		const x = initialState?.x ?? 400;
		const y = initialState?.y ?? 500;
		this.sprite = scene.add.rectangle(x, y, 40, 40, color);
		this.sprite.setOrigin(0.5, 1); // Bottom-center for ground alignment

		// Initialize physics position for local player
		if (isLocalPlayer) {
			this.physicsX = x;
			this.physicsY = y;
		}

		// Seed the buffer with the initial state so there's something to interpolate toward
		if (!isLocalPlayer && initialState) {
			this.pushSnapshot({
				time: performance.now(),
				x,
				y,
				isGrounded: initialState.isGrounded
			});
		}

		console.log(`[PlayerEntity] Created ${isLocalPlayer ? 'LOCAL' : 'REMOTE'} player: ${playerId}`);
	}

	/**
	 * Called by MainScene whenever new state is read from the store.
	 *
	 * Local player: capture the visual offset (if a reconciliation snap
	 *               just happened) and update the physics position.
	 * Remote player: push the state into the snapshot buffer.
	 */
	updateFromServerState(state: PlayerState): void {
		if (this.isLocalPlayer) {
			// Calculate how far the sprite is from the new "truth".
			// In normal frames (no reconciliation), this is ~0 because
			// tickLocalPlayer() already advanced to a similar position.
			// After reconciliation, this captures the snap distance.
			const diffX = this.sprite.x - state.x;
			const diffY = this.sprite.y - state.y;

			if (Math.abs(diffX) > 0.5 || Math.abs(diffY) > 0.5) {
				this.visualOffsetX = diffX;
				this.visualOffsetY = diffY;
			}

			this.physicsX = state.x;
			this.physicsY = state.y;
			this.sprite.setPosition(
				this.physicsX + this.visualOffsetX,
				this.physicsY + this.visualOffsetY
			);
		} else {
			const updateTime = state.lastUpdateTime ?? performance.now();
			// Skip if we already processed this exact packet
			if (updateTime === this.lastProcessedUpdate) return;
			this.lastProcessedUpdate = updateTime;

			this.pushSnapshot({
				time: updateTime,
				x: state.x,
				y: state.y,
				isGrounded: state.isGrounded
			});
		}

		this.updateColor(state.isGrounded);
	}

	/**
	 * Called by MainScene's tickLocalPlayer() to advance the local player's
	 * physics position between server packets. Routes through the visual
	 * offset system so reconciliation smoothing is preserved.
	 */
	updateLocalPhysicsPosition(x: number, y: number): void {
		this.physicsX = x;
		this.physicsY = y;
		this.sprite.setPosition(
			x + this.visualOffsetX,
			y + this.visualOffsetY
		);
	}

	/**
	 * Called every Phaser frame by MainScene.
	 *
	 * Local player: decay the visual offset toward zero, re-render.
	 * Remote player: compute renderTime = now - INTERPOLATION_DELAY, then
	 *               interpolate between the two bracketing snapshots.
	 */
	update(): void {
		if (this.isLocalPlayer) {
			// Decay the visual offset each frame
			this.visualOffsetX *= PHYSICS.RECONCILIATION_SMOOTHING_DECAY;
			this.visualOffsetY *= PHYSICS.RECONCILIATION_SMOOTHING_DECAY;

			// Snap to zero when negligible to avoid infinite micro-drift
			if (Math.abs(this.visualOffsetX) < 0.5) this.visualOffsetX = 0;
			if (Math.abs(this.visualOffsetY) < 0.5) this.visualOffsetY = 0;

			// Re-render with decayed offset
			this.sprite.setPosition(
				this.physicsX + this.visualOffsetX,
				this.physicsY + this.visualOffsetY
			);
			return;
		}

		if (this.snapshotBuffer.length === 0) return;

		const renderTime = performance.now() - NETWORK.INTERPOLATION_DELAY;

		// Not enough history yet — just snap to the earliest snapshot we have
		if (this.snapshotBuffer.length === 1 || renderTime <= this.snapshotBuffer[0].time) {
			const snap = this.snapshotBuffer[0];
			this.sprite.setPosition(snap.x, snap.y);
			this.updateColor(snap.isGrounded);
			return;
		}

		// renderTime is beyond the newest snapshot — snap to the latest
		// (happens momentarily when the buffer isn't full yet)
		const newest = this.snapshotBuffer[this.snapshotBuffer.length - 1];
		if (renderTime >= newest.time) {
			this.sprite.setPosition(newest.x, newest.y);
			this.updateColor(newest.isGrounded);
			return;
		}

		// Find the two snapshots that bracket renderTime
		// Buffer is always in ascending time order because we push to the end
		let before: PositionSnapshot | null = null;
		let after: PositionSnapshot | null = null;

		for (let i = 0; i < this.snapshotBuffer.length - 1; i++) {
			if (
				this.snapshotBuffer[i].time <= renderTime &&
				this.snapshotBuffer[i + 1].time >= renderTime
			) {
				before = this.snapshotBuffer[i];
				after = this.snapshotBuffer[i + 1];
				break;
			}
		}

		if (!before || !after) return;

		// t = 0 means we are exactly at `before`, t = 1 means exactly at `after`
		const t = (renderTime - before.time) / (after.time - before.time);

		const interpolatedX = before.x + t * (after.x - before.x);
		const interpolatedY = before.y + t * (after.y - before.y);

		// Use the closer snapshot's grounded state (avoids mid-air color flicker)
		const isGrounded = t < 0.5 ? before.isGrounded : after.isGrounded;

		this.sprite.setPosition(interpolatedX, interpolatedY);
		this.updateColor(isGrounded);
	}

	// ---------------------------------------------------------------------------
	// Helpers
	// ---------------------------------------------------------------------------

	getSprite(): Phaser.GameObjects.Rectangle {
		return this.sprite;
	}

	getId(): string {
		return this.playerId;
	}

	getIsLocalPlayer(): boolean {
		return this.isLocalPlayer;
	}

	destroy(): void {
		console.log(`[PlayerEntity] Destroying player: ${this.playerId}`);
		this.sprite.destroy();
	}

	/**
	 * Push a snapshot into the buffer, evicting the oldest entry when the
	 * buffer exceeds SNAPSHOT_BUFFER_SIZE.
	 */
	private pushSnapshot(snapshot: PositionSnapshot): void {
		this.snapshotBuffer.push(snapshot);
		if (this.snapshotBuffer.length > NETWORK.SNAPSHOT_BUFFER_SIZE) {
			this.snapshotBuffer.shift(); // Drop the oldest entry
		}
	}

	private updateColor(isGrounded: boolean): void {
		const palette = this.isLocalPlayer ? COLORS.LOCAL : COLORS.REMOTE;
		const color = isGrounded ? palette.GROUNDED : palette.AIRBORNE;
		this.sprite.setFillStyle(color);
	}
}
