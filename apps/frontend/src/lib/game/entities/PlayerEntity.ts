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
	BLOCK: 0x90cdf4, // Light blue — blocking stance
	ATTACK: 0xff4444, // Red — attacking
	ATTACK_HITBOX: 0xff0000, // Bright red — attack hitbox overlay
	FACING_POINTER: 0x1a202c, // Dark accent for facing indicator
	HIT_FLASH: 0xff2222, // Red flash on taking a raw hit
	BLOCK_FLASH: 0xffee44, // Yellow flash on blocking
	DEFLECT_FLASH: 0x00ffff // Cyan flash on perfect deflect
} as const;

// Facing indicator dimensions (body dimensions are now in PHYSICS constants)
const POINTER_W = 6;
const POINTER_H = 14;
// Posture bar dimensions
const POSTURE_BAR_W = 44;
const POSTURE_BAR_H = 4;
const POSTURE_BAR_OFFSET_Y = 8; // pixels below the player's feet
// Health bar dimensions
const HEALTH_BAR_W = 44;
const HEALTH_BAR_H = 4;
const HEALTH_BAR_OFFSET_Y = -6; // pixels above the player's head


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
	isBlocking: boolean;
	isAttacking: boolean;
	posture: number;
	lastHitResult: string;
	health: number;
	isStaggered: boolean;
};

export class PlayerEntity {
	private scene: Phaser.Scene;
	private sprite: Phaser.GameObjects.Rectangle;
	private facingPointer: Phaser.GameObjects.Rectangle;
	private attackHitbox: Phaser.GameObjects.Rectangle;
	private postureBarBg: Phaser.GameObjects.Rectangle;
	private postureBarFill: Phaser.GameObjects.Rectangle;
	private healthBarBg: Phaser.GameObjects.Rectangle;
	private healthBarFill: Phaser.GameObjects.Rectangle;
	private playerId: string;
	private isLocalPlayer: boolean;

	// Current visual state (used for rendering decisions)
	private currentFacing: number = 1;
	private currentIsDashing: boolean = false;
	private currentIsDownDashing: boolean = false;
	private currentHasAirDash: boolean = true;
	private currentIsBlocking: boolean = false;
	private currentIsAttacking: boolean = false;
	private currentPosture: number = 0;
	private currentLastHitResult: string = '';
	private currentHealth: number = 100;
	private currentIsStaggered: boolean = false;

	// Hit flash state: timer counts down in ms, color applied while > 0
	private hitFlashTimer: number = 0;
	private hitFlashColor: number = 0;

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
		this.sprite = scene.add.rectangle(x, y, PHYSICS.BODY_WIDTH, PHYSICS.BODY_HEIGHT, color);
		this.sprite.setOrigin(0.5, 1); // Bottom-center for ground alignment

		// Facing direction indicator — a small dark rectangle on the leading edge
		this.currentFacing = initialState?.facingDirection ?? 1;
		this.facingPointer = scene.add.rectangle(0, 0, POINTER_W, POINTER_H, COLORS.FACING_POINTER);
		this.facingPointer.setOrigin(0.5, 0.5);
		this.updatePointerPosition(x, y);

		// Attack hitbox indicator — semi-transparent red rectangle (hidden by default)
		this.attackHitbox = scene.add.rectangle(0, 0, PHYSICS.ATTACK_WIDTH, PHYSICS.ATTACK_HEIGHT, COLORS.ATTACK_HITBOX);
		this.attackHitbox.setOrigin(0.5, 0.5);
		this.attackHitbox.setAlpha(0.4);
		this.attackHitbox.setVisible(false);

		// Posture bar (background track + fill)
		this.postureBarBg = scene.add.rectangle(x, y + POSTURE_BAR_OFFSET_Y, POSTURE_BAR_W, POSTURE_BAR_H, 0x333333);
		this.postureBarBg.setOrigin(0.5, 0);
		this.postureBarBg.setAlpha(0.7);
		this.postureBarBg.setVisible(false); // hidden when posture is 0
		this.postureBarFill = scene.add.rectangle(x - POSTURE_BAR_W / 2, y + POSTURE_BAR_OFFSET_Y, 0, POSTURE_BAR_H, 0xf6ad55);
		this.postureBarFill.setOrigin(0, 0);
		this.postureBarFill.setAlpha(0.9);
		this.postureBarFill.setVisible(false);

		// Health bar (background track + fill) — above the player's head
		const healthBarY = y - PHYSICS.BODY_HEIGHT + HEALTH_BAR_OFFSET_Y;
		this.healthBarBg = scene.add.rectangle(x, healthBarY, HEALTH_BAR_W, HEALTH_BAR_H, 0x333333);
		this.healthBarBg.setOrigin(0.5, 1);
		this.healthBarBg.setAlpha(0.7);
		this.healthBarFill = scene.add.rectangle(x - HEALTH_BAR_W / 2, healthBarY, HEALTH_BAR_W, HEALTH_BAR_H, 0x48bb78);
		this.healthBarFill.setOrigin(0, 1);
		this.healthBarFill.setAlpha(0.9);

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
				hasAirDash: initialState.hasAirDash ?? true,
				isBlocking: initialState.isBlocking ?? false,
				isAttacking: initialState.isAttacking ?? false,
				posture: initialState.posture ?? 0,
				lastHitResult: initialState.lastHitResult ?? '',
				health: initialState.health ?? 100,
				isStaggered: initialState.isStaggered ?? false
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
			this.currentIsBlocking = state.isBlocking;
			this.currentIsAttacking = state.isAttacking;
			this.currentPosture = state.posture ?? 0;
			this.currentLastHitResult = state.lastHitResult ?? '';
			this.currentHealth = state.health ?? 100;
			this.currentIsStaggered = state.isStaggered ?? false;
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
				hasAirDash: state.hasAirDash ?? true,
				isBlocking: state.isBlocking ?? false,
				isAttacking: state.isAttacking ?? false,
				posture: state.posture ?? 0,
				lastHitResult: state.lastHitResult ?? '',
				health: state.health ?? 100,
				isStaggered: state.isStaggered ?? false
			});
		}

		this.updateVisuals(state.isGrounded);
	}

	/**
	 * Called by MainScene's tickLocalPlayer() to advance the local player's
	 * physics position between server packets. Routes through the visual
	 * offset system so reconciliation visual smoothing is preserved.
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
			this.currentIsBlocking = snap.isBlocking;
			this.currentIsAttacking = snap.isAttacking;
			this.currentPosture = snap.posture;
			this.currentLastHitResult = snap.lastHitResult;
			this.currentHealth = snap.health;
			this.currentIsStaggered = snap.isStaggered;
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
			this.currentIsBlocking = newest.isBlocking;
			this.currentIsAttacking = newest.isAttacking;
			this.currentPosture = newest.posture;
			this.currentLastHitResult = newest.lastHitResult;
			this.currentHealth = newest.health;
			this.currentIsStaggered = newest.isStaggered;
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
		this.currentIsBlocking = snap.isBlocking;
		this.currentIsAttacking = snap.isAttacking;
		this.currentPosture = snap.posture;
		this.currentLastHitResult = snap.lastHitResult;
		this.currentHealth = snap.health;
		this.currentIsStaggered = snap.isStaggered;

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
		this.attackHitbox.destroy();
		this.postureBarBg.destroy();
		this.postureBarFill.destroy();
		this.healthBarBg.destroy();
		this.healthBarFill.destroy();
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
			? spriteX + PHYSICS.BODY_WIDTH / 2 - POINTER_W / 2
			: spriteX - PHYSICS.BODY_WIDTH / 2 + POINTER_W / 2;
		const centerY = spriteY - PHYSICS.BODY_HEIGHT / 2;
		this.facingPointer.setPosition(edgeX, centerY);
	}

	/**
	 * Update fill color, alpha, hit flash effects, posture bar, health bar,
	 * and stagger shake based on current player state.
	 */
	private updateVisuals(isGrounded: boolean): void {
		let color: number;

		// --- Hit flash: triggered by lastHitResult, overrides normal color ---
		if (this.currentLastHitResult === 'hit') {
			this.hitFlashTimer = 100; // 100ms flash
			this.hitFlashColor = COLORS.HIT_FLASH;
			this.currentLastHitResult = ''; // consume so it only triggers once
		} else if (this.currentLastHitResult === 'blocked') {
			this.hitFlashTimer = 80;
			this.hitFlashColor = COLORS.BLOCK_FLASH;
			this.currentLastHitResult = '';
		} else if (this.currentLastHitResult === 'deflected') {
			this.hitFlashTimer = 120;
			this.hitFlashColor = COLORS.DEFLECT_FLASH;
			this.currentLastHitResult = '';
		}

		if (this.hitFlashTimer > 0) {
			// Decay flash timer using a rough per-frame estimate
			// The Phaser scene update provides delta via tickLocalPlayer but
			// updateVisuals is called without delta. We approximate 16ms/frame.
			this.hitFlashTimer -= 16;
			color = this.hitFlashColor;
		} else if (this.currentIsDownDashing) {
			color = COLORS.DOWN_DASH;
		} else if (this.currentIsDashing) {
			color = COLORS.DASH;
		} else if (this.currentIsAttacking) {
			color = COLORS.ATTACK;
		} else if (this.currentIsBlocking) {
			color = COLORS.BLOCK;
		} else {
			const palette = this.isLocalPlayer ? COLORS.LOCAL : COLORS.REMOTE;
			color = isGrounded ? palette.GROUNDED : palette.AIRBORNE;
		}

		this.sprite.setFillStyle(color);

		// --- Attack hitbox visual ---
		if (this.currentIsAttacking) {
			this.attackHitbox.setVisible(true);
			const hitboxX = this.sprite.x + (this.currentFacing * (PHYSICS.BODY_WIDTH / 2 + PHYSICS.ATTACK_WIDTH / 2));
			const hitboxY = this.sprite.y - PHYSICS.BODY_HEIGHT / 2;
			this.attackHitbox.setPosition(hitboxX, hitboxY);
		} else {
			this.attackHitbox.setVisible(false);
		}

		// --- Posture bar ---
		const postureRatio = Math.min(this.currentPosture / PHYSICS.MAX_POSTURE, 1);
		const barVisible = this.currentPosture > 0;
		const barX = this.sprite.x;
		const barY = this.sprite.y + POSTURE_BAR_OFFSET_Y;
		this.postureBarBg.setPosition(barX, barY);
		this.postureBarBg.setVisible(barVisible);
		this.postureBarFill.setPosition(barX - POSTURE_BAR_W / 2, barY);
		this.postureBarFill.setSize(POSTURE_BAR_W * postureRatio, POSTURE_BAR_H);
		// Color transitions: yellow → orange → red as posture fills
		const fillColor = postureRatio < 0.5 ? 0xf6ad55 : postureRatio < 0.85 ? 0xed8936 : 0xe53e3e;
		this.postureBarFill.setFillStyle(fillColor);
		this.postureBarFill.setVisible(barVisible);

		// --- Health bar ---
		const healthRatio = Math.max(this.currentHealth / PHYSICS.MAX_HEALTH, 0);
		const healthBarX = this.sprite.x;
		const healthBarY = this.sprite.y - PHYSICS.BODY_HEIGHT + HEALTH_BAR_OFFSET_Y;
		this.healthBarBg.setPosition(healthBarX, healthBarY);
		this.healthBarFill.setPosition(healthBarX - HEALTH_BAR_W / 2, healthBarY);
		this.healthBarFill.setSize(HEALTH_BAR_W * healthRatio, HEALTH_BAR_H);
		// Color transitions: green → yellow → red as HP drops
		const hpColor = healthRatio > 0.6 ? 0x48bb78 : healthRatio > 0.3 ? 0xecc94b : 0xe53e3e;
		this.healthBarFill.setFillStyle(hpColor);

		// --- Stagger shake ---
		if (this.currentIsStaggered) {
			// Override color to alternating red/purple
			const staggerFlash = Math.floor(performance.now() / 100) % 2 === 0 ? 0xe53e3e : 0x9f7aea;
			this.sprite.setFillStyle(staggerFlash);
			// Shake the sprite ±2px randomly
			const shakeX = (Math.random() - 0.5) * 4;
			const shakeY = (Math.random() - 0.5) * 4;
			this.sprite.setPosition(this.sprite.x + shakeX, this.sprite.y + shakeY);
		}

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
