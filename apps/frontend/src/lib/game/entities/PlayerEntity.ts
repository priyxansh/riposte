import Phaser from 'phaser';
import type { PlayerState } from '../../../types/player';
import { NETWORK } from '../../constants/network';
import { PHYSICS } from '../../constants/physics';

// Color palettes for player states
const COLORS = {
	LOCAL: {
		TINT: 0xccffcc, // Light green tint
	},
	REMOTE: {
		TINT: 0xccccff, // Light blue tint
	},
	HIT_FLASH: 0xff2222, // Red flash on taking a raw hit
	BLOCK_FLASH: 0xffee44, // Yellow flash on blocking
	DEFLECT_FLASH: 0x00ffff // Cyan flash on perfect deflect
} as const;

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
	vy: number;
	isGrounded: boolean;
	facingDirection: number;
	isDashing: boolean;
	isDownDashing: boolean;
	hasAirDash: boolean;
	isHoldingLeft: boolean;
	isHoldingRight: boolean;
	isBlocking: boolean;
	isAttacking: boolean;
	posture: number;
	lastHitResult: string;
	health: number;
	isStaggered: boolean;
};

export class PlayerEntity {
	private scene: Phaser.Scene;
	private sprite: Phaser.GameObjects.Sprite;
	private attackHitbox: Phaser.GameObjects.Rectangle;
	private postureBarBg: Phaser.GameObjects.Rectangle;
	private postureBarFill: Phaser.GameObjects.Rectangle;
	private healthBarBg: Phaser.GameObjects.Rectangle;
	private healthBarFill: Phaser.GameObjects.Rectangle;
	private playerId: string;
	private isLocalPlayer: boolean;

	// Current visual state (used for rendering decisions)
	private currentFacing: number = 1;
	private currentVy: number = 0;
	private currentIsGrounded: boolean = true;
	private currentIsDashing: boolean = false;
	private currentIsDownDashing: boolean = false;
	private currentHasAirDash: boolean = true;
	private currentIsHoldingLeft: boolean = false;
	private currentIsHoldingRight: boolean = false;
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

		const x = initialState?.x ?? 400;
		const y = initialState?.y ?? 500;
		this.sprite = scene.add.sprite(x, y, 'samurai_idle');
		this.sprite.setOrigin(0.5, 1); // Bottom-center for ground alignment
		this.sprite.play('samurai_idle');

		// Scale the 32x32 sprite to match the physics body
		const scaleX = PHYSICS.BODY_WIDTH / 32;
		const scaleY = PHYSICS.BODY_HEIGHT / 32;
		this.sprite.setScale(scaleX, scaleY);
		
		this.currentFacing = initialState?.facingDirection ?? 1;
		this.sprite.setFlipX(this.currentFacing === -1);

		// Attack hitbox indicator — semi-transparent red rectangle (hidden by default)
		this.attackHitbox = scene.add.rectangle(0, 0, PHYSICS.ATTACK_WIDTH, PHYSICS.ATTACK_HEIGHT, 0xff0000);
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
				vy: initialState.vy ?? 0,
				isGrounded: initialState.isGrounded,
				facingDirection: initialState.facingDirection ?? 1,
				isDashing: initialState.isDashing ?? false,
				isDownDashing: initialState.isDownDashing ?? false,
				hasAirDash: initialState.hasAirDash ?? true,
				isHoldingLeft: initialState.isHoldingLeft ?? false,
				isHoldingRight: initialState.isHoldingRight ?? false,
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

	updateFromServerState(state: PlayerState): void {
		if (this.isLocalPlayer) {
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
			this.currentVy = state.vy;
			this.currentIsGrounded = state.isGrounded;
			this.currentIsDashing = state.isDashing;
			this.currentIsDownDashing = state.isDownDashing;
			this.currentHasAirDash = state.hasAirDash;
			this.currentIsHoldingLeft = state.isHoldingLeft;
			this.currentIsHoldingRight = state.isHoldingRight;
			this.currentIsBlocking = state.isBlocking;
			this.currentIsAttacking = state.isAttacking;
			this.currentPosture = state.posture ?? 0;
			this.currentLastHitResult = state.lastHitResult ?? '';
			this.currentHealth = state.health ?? 100;
			this.currentIsStaggered = state.isStaggered ?? false;
		} else {
			const updateTime = state.lastUpdateTime ?? performance.now();
			if (updateTime === this.lastProcessedUpdate) return;
			this.lastProcessedUpdate = updateTime;

			this.pushSnapshot({
				time: updateTime,
				x: state.x,
				y: state.y,
				vy: state.vy,
				isGrounded: state.isGrounded,
				facingDirection: state.facingDirection ?? 1,
				isDashing: state.isDashing ?? false,
				isDownDashing: state.isDownDashing ?? false,
				hasAirDash: state.hasAirDash ?? true,
				isHoldingLeft: state.isHoldingLeft ?? false,
				isHoldingRight: state.isHoldingRight ?? false,
				isBlocking: state.isBlocking ?? false,
				isAttacking: state.isAttacking ?? false,
				posture: state.posture ?? 0,
				lastHitResult: state.lastHitResult ?? '',
				health: state.health ?? 100,
				isStaggered: state.isStaggered ?? false
			});
		}
	}

	updateLocalPhysicsPosition(x: number, y: number): void {
		this.physicsX = x;
		this.physicsY = y;
		this.sprite.setPosition(
			x + this.visualOffsetX,
			y + this.visualOffsetY
		);
	}

	update(delta: number): void {
		if (this.isLocalPlayer) {
			this.visualOffsetX *= PHYSICS.RECONCILIATION_SMOOTHING_DECAY;
			this.visualOffsetY *= PHYSICS.RECONCILIATION_SMOOTHING_DECAY;

			if (Math.abs(this.visualOffsetX) < 0.5) this.visualOffsetX = 0;
			if (Math.abs(this.visualOffsetY) < 0.5) this.visualOffsetY = 0;

			const renderX = this.physicsX + this.visualOffsetX;
			const renderY = this.physicsY + this.visualOffsetY;
			this.sprite.setPosition(renderX, renderY);
			this.updateVisuals(delta);
			return;
		}

		if (this.snapshotBuffer.length === 0) return;

		const renderTime = performance.now() - NETWORK.INTERPOLATION_DELAY;

		if (this.snapshotBuffer.length === 1 || renderTime <= this.snapshotBuffer[0].time) {
			const snap = this.snapshotBuffer[0];
			this.sprite.setPosition(snap.x, snap.y);
			this.currentFacing = snap.facingDirection;
			this.currentVy = snap.vy;
			this.currentIsGrounded = snap.isGrounded;
			this.currentIsDashing = snap.isDashing;
			this.currentIsDownDashing = snap.isDownDashing;
			this.currentHasAirDash = snap.hasAirDash;
			this.currentIsHoldingLeft = snap.isHoldingLeft;
			this.currentIsHoldingRight = snap.isHoldingRight;
			this.currentIsBlocking = snap.isBlocking;
			this.currentIsAttacking = snap.isAttacking;
			this.currentPosture = snap.posture;
			this.currentLastHitResult = snap.lastHitResult;
			this.currentHealth = snap.health;
			this.currentIsStaggered = snap.isStaggered;
			this.updateVisuals(delta);
			return;
		}

		const newest = this.snapshotBuffer[this.snapshotBuffer.length - 1];
		if (renderTime >= newest.time) {
			this.sprite.setPosition(newest.x, newest.y);
			this.currentFacing = newest.facingDirection;
			this.currentVy = newest.vy;
			this.currentIsGrounded = newest.isGrounded;
			this.currentIsDashing = newest.isDashing;
			this.currentIsDownDashing = newest.isDownDashing;
			this.currentHasAirDash = newest.hasAirDash;
			this.currentIsHoldingLeft = newest.isHoldingLeft;
			this.currentIsHoldingRight = newest.isHoldingRight;
			this.currentIsBlocking = newest.isBlocking;
			this.currentIsAttacking = newest.isAttacking;
			this.currentPosture = newest.posture;
			this.currentLastHitResult = newest.lastHitResult;
			this.currentHealth = newest.health;
			this.currentIsStaggered = newest.isStaggered;
			this.updateVisuals(delta);
			return;
		}

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

		const t = (renderTime - before.time) / (after.time - before.time);

		const interpolatedX = before.x + t * (after.x - before.x);
		const interpolatedY = before.y + t * (after.y - before.y);

		const snap = t < 0.5 ? before : after;
		this.currentFacing = snap.facingDirection;
		this.currentVy = snap.vy;
		this.currentIsGrounded = snap.isGrounded;
		this.currentIsDashing = snap.isDashing;
		this.currentIsDownDashing = snap.isDownDashing;
		this.currentHasAirDash = snap.hasAirDash;
		this.currentIsHoldingLeft = snap.isHoldingLeft;
		this.currentIsHoldingRight = snap.isHoldingRight;
		this.currentIsBlocking = snap.isBlocking;
		this.currentIsAttacking = snap.isAttacking;
		this.currentPosture = snap.posture;
		this.currentLastHitResult = snap.lastHitResult;
		this.currentHealth = snap.health;
		this.currentIsStaggered = snap.isStaggered;

		this.sprite.setPosition(interpolatedX, interpolatedY);
		this.updateVisuals(delta);
	}

	getSprite(): Phaser.GameObjects.Sprite {
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
		this.sprite.destroy();
	}

	private pushSnapshot(snapshot: PositionSnapshot): void {
		this.snapshotBuffer.push(snapshot);
		if (this.snapshotBuffer.length > NETWORK.SNAPSHOT_BUFFER_SIZE) {
			this.snapshotBuffer.shift(); 
		}
	}

	private resolveAnimKey(): string {
		if (this.currentHealth <= 0) return 'samurai_die';
		if (this.currentIsStaggered) return 'samurai_taking_hit';
		if (this.currentIsAttacking) return 'samurai_attack';
		if (this.currentIsBlocking) return 'samurai_deflect_h';
		if (this.currentIsDashing || this.currentIsDownDashing) return 'samurai_run';
		if (!this.currentIsGrounded) return 'samurai_crouch';
		if (this.currentIsHoldingLeft || this.currentIsHoldingRight) return 'samurai_run';
		return 'samurai_idle';
	}

	private updateVisuals(delta: number): void {
		// --- Sprite FSM and flipping ---
		this.sprite.setFlipX(this.currentFacing === -1);
		
		const key = this.resolveAnimKey();
		if (this.sprite.anims.currentAnim?.key !== key) {
			this.sprite.play(key, true);
		}

		// --- Hit flash (Tint overrides normal tint) ---
		if (this.currentLastHitResult === 'hit') {
			this.hitFlashTimer = 100;
			this.hitFlashColor = COLORS.HIT_FLASH;
			this.currentLastHitResult = '';
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
			this.hitFlashTimer -= delta;
			this.sprite.setTintFill(this.hitFlashColor); // tintFill covers the whole sprite in solid color
		} else {
			// Base tint to distinguish local vs remote. setTint applies a color overlay to the sprite's texture.
			this.sprite.clearTint();
			this.sprite.setTint(this.isLocalPlayer ? COLORS.LOCAL.TINT : COLORS.REMOTE.TINT);
		}

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
		const hpColor = healthRatio > 0.6 ? 0x48bb78 : healthRatio > 0.3 ? 0xecc94b : 0xe53e3e;
		this.healthBarFill.setFillStyle(hpColor);

		// --- Stagger shake ---
		if (this.currentIsStaggered) {
			const shakeX = (Math.random() - 0.5) * 4;
			const shakeY = (Math.random() - 0.5) * 4;
			this.sprite.setPosition(this.sprite.x + shakeX, this.sprite.y + shakeY);
		}

		if (!this.currentIsGrounded && !this.currentHasAirDash && !this.currentIsDashing && !this.currentIsDownDashing) {
			this.sprite.setAlpha(0.7);
		} else {
			this.sprite.setAlpha(1);
		}
	}
}
