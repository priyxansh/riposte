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
	},
	DASH: 0x00ffff, // Cyan — horizontal / air dash
	DOWN_DASH: 0xffd700, // Gold — downward plunge
	FACING_POINTER: 0x1a202c // Dark accent for facing indicator
} as const;

// Player body dimensions
const BODY_W = 40;
const BODY_H = 40;
// Facing indicator dimensions
const POINTER_W = 6;
const POINTER_H = 14;

// A timestamped position snapshot received from the server
type PositionSnapshot = {
	time: number; // performance.now() when this snapshot was received
	x: number;
	y: number;
	isGrounded: boolean;
	facingDirection: number;
	isDashing: boolean;
	isDownDashing: boolean;
	hasAirDash: boolean;
};

export class PlayerEntity {
	private scene: Phaser.Scene;
	private sprite: Phaser.GameObjects.Rectangle;
	private facingPointer: Phaser.GameObjects.Rectangle;
	private playerId: string;
	private isLocalPlayer: boolean;

	// Current visual state (used for rendering decisions)
	private currentFacing: number = 1;
	private currentIsDashing: boolean = false;
	private currentIsDownDashing: boolean = false;
	private currentHasAirDash: boolean = true;

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
		this.sprite = scene.add.rectangle(x, y, BODY_W, BODY_H, color);
		this.sprite.setOrigin(0.5, 1); // Bottom-center for ground alignment

		// Facing direction indicator — a small dark rectangle on the leading edge
		this.currentFacing = initialState?.facingDirection ?? 1;
		this.facingPointer = scene.add.rectangle(0, 0, POINTER_W, POINTER_H, COLORS.FACING_POINTER);
		this.facingPointer.setOrigin(0.5, 0.5);
		this.updatePointerPosition(x, y);

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
				isGrounded: initialState.isGrounded,
				facingDirection: initialState.facingDirection ?? 1,
				isDashing: initialState.isDashing ?? false,
				isDownDashing: initialState.isDownDashing ?? false,
				hasAirDash: initialState.hasAirDash ?? true
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

			// Update visual state
			this.currentFacing = state.facingDirection;
			this.currentIsDashing = state.isDashing;
			this.currentIsDownDashing = state.isDownDashing;
			this.currentHasAirDash = state.hasAirDash;
		} else {
			const updateTime = state.lastUpdateTime ?? performance.now();
			// Skip if we already processed this exact packet
			if (updateTime === this.lastProcessedUpdate) return;
			this.lastProcessedUpdate = updateTime;

			this.pushSnapshot({
				time: updateTime,
				x: state.x,
				y: state.y,
				isGrounded: state.isGrounded,
				facingDirection: state.facingDirection ?? 1,
				isDashing: state.isDashing ?? false,
				isDownDashing: state.isDownDashing ?? false,
				hasAirDash: state.hasAirDash ?? true
			});
		}

		this.updateVisuals(state.isGrounded);
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
		this.updatePointerPosition(
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
			const renderX = this.physicsX + this.visualOffsetX;
			const renderY = this.physicsY + this.visualOffsetY;
			this.sprite.setPosition(renderX, renderY);
			this.updatePointerPosition(renderX, renderY);
			return;
		}

		if (this.snapshotBuffer.length === 0) return;

		const renderTime = performance.now() - NETWORK.INTERPOLATION_DELAY;

		// Not enough history yet — just snap to the earliest snapshot we have
		if (this.snapshotBuffer.length === 1 || renderTime <= this.snapshotBuffer[0].time) {
			const snap = this.snapshotBuffer[0];
			this.sprite.setPosition(snap.x, snap.y);
			this.updatePointerPosition(snap.x, snap.y);
			this.currentFacing = snap.facingDirection;
			this.currentIsDashing = snap.isDashing;
			this.currentIsDownDashing = snap.isDownDashing;
			this.currentHasAirDash = snap.hasAirDash;
			this.updateVisuals(snap.isGrounded);
			return;
		}

		// renderTime is beyond the newest snapshot — snap to the latest
		// (happens momentarily when the buffer isn't full yet)
		const newest = this.snapshotBuffer[this.snapshotBuffer.length - 1];
		if (renderTime >= newest.time) {
			this.sprite.setPosition(newest.x, newest.y);
			this.updatePointerPosition(newest.x, newest.y);
			this.currentFacing = newest.facingDirection;
			this.currentIsDashing = newest.isDashing;
			this.currentIsDownDashing = newest.isDownDashing;
			this.currentHasAirDash = newest.hasAirDash;
			this.updateVisuals(newest.isGrounded);
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

		// Use the closer snapshot's state (avoids mid-action visual flicker)
		const snap = t < 0.5 ? before : after;
		this.currentFacing = snap.facingDirection;
		this.currentIsDashing = snap.isDashing;
		this.currentIsDownDashing = snap.isDownDashing;
		this.currentHasAirDash = snap.hasAirDash;

		this.sprite.setPosition(interpolatedX, interpolatedY);
		this.updatePointerPosition(interpolatedX, interpolatedY);
		this.updateVisuals(snap.isGrounded);
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
		this.facingPointer.destroy();
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

	/**
	 * Position the facing pointer on the leading edge of the player rectangle.
	 * The sprite uses origin (0.5, 1) — bottom-center — so:
	 *   left edge  = spriteX - BODY_W/2
	 *   right edge = spriteX + BODY_W/2
	 *   vertical center of the body = spriteY - BODY_H/2
	 */
	private updatePointerPosition(spriteX: number, spriteY: number): void {
		const edgeX = this.currentFacing === 1
			? spriteX + BODY_W / 2 - POINTER_W / 2
			: spriteX - BODY_W / 2 + POINTER_W / 2;
		const centerY = spriteY - BODY_H / 2;
		this.facingPointer.setPosition(edgeX, centerY);
	}

	/**
	 * Update fill color and alpha based on dash state, grounded state,
	 * and whether the air dash has been used.
	 */
	private updateVisuals(isGrounded: boolean): void {
		let color: number;

		if (this.currentIsDownDashing) {
			color = COLORS.DOWN_DASH;
		} else if (this.currentIsDashing) {
			color = COLORS.DASH;
		} else {
			const palette = this.isLocalPlayer ? COLORS.LOCAL : COLORS.REMOTE;
			color = isGrounded ? palette.GROUNDED : palette.AIRBORNE;
		}

		this.sprite.setFillStyle(color);

		// Slightly dim the player when airborne and air dash is spent
		if (!isGrounded && !this.currentHasAirDash && !this.currentIsDashing && !this.currentIsDownDashing) {
			this.sprite.setAlpha(0.7);
		} else {
			this.sprite.setAlpha(1);
		}

		// Update pointer position with current sprite coordinates
		this.updatePointerPosition(this.sprite.x, this.sprite.y);
	}
}
