import Phaser from 'phaser';
import type { PlayerState } from '../../../types/player';

// Color palettes for player states
const COLORS = {
    LOCAL: {
        GROUNDED: 0x48bb78, // Green
        AIRBORNE: 0xed8936  // Orange
    },
    REMOTE: {
        GROUNDED: 0x4299e1, // Blue
        AIRBORNE: 0x9f7aea  // Purple
    }
} as const;

export class PlayerEntity {
    private scene: Phaser.Scene;
    private sprite: Phaser.GameObjects.Rectangle;
    private playerId: string;
    private isLocalPlayer: boolean;

    // For interpolation (remote players only)
    private targetX: number = 0;
    private targetY: number = 0;
    private interpolationSpeed: number = 0.2; // Lerp factor (0-1)

    constructor(scene: Phaser.Scene, playerId: string, isLocalPlayer: boolean, initialState?: PlayerState) {
        this.scene = scene;
        this.playerId = playerId;
        this.isLocalPlayer = isLocalPlayer;

        // Initial color based on player type
        const color = isLocalPlayer ? COLORS.LOCAL.GROUNDED : COLORS.REMOTE.GROUNDED;

        // Create the sprite
        const x = initialState?.x ?? 400;
        const y = initialState?.y ?? 500;
        this.sprite = scene.add.rectangle(x, y, 40, 40, color);
        this.sprite.setOrigin(0.5, 1); // Bottom-center for ground alignment

        this.targetX = x;
        this.targetY = y;

        console.log(`[PlayerEntity] Created ${isLocalPlayer ? 'LOCAL' : 'REMOTE'} player: ${playerId}`);
    }

    /**
     * Update the entity with new server state
     */
    updateFromServerState(state: PlayerState): void {
        if (this.isLocalPlayer) {
            // Local player: Snap directly to state (prediction handles smoothness)
            this.sprite.setPosition(state.x, state.y);
        } else {
            // Remote player: Set target for interpolation
            this.targetX = state.x;
            this.targetY = state.y;
        }

        // Update color based on grounded state
        this.updateColor(state.isGrounded);
    }

    /**
     * Called every Phaser frame - handles interpolation for remote players
     */
    update(): void {
        if (!this.isLocalPlayer) {
            // Interpolate towards target position
            const currentX = this.sprite.x;
            const currentY = this.sprite.y;

            const newX = Phaser.Math.Linear(currentX, this.targetX, this.interpolationSpeed);
            const newY = Phaser.Math.Linear(currentY, this.targetY, this.interpolationSpeed);

            this.sprite.setPosition(newX, newY);
        }
        // Local player position is updated directly in updateFromServerState
    }

    /**
     * Get the sprite for camera following
     */
    getSprite(): Phaser.GameObjects.Rectangle {
        return this.sprite;
    }

    /**
     * Get the player ID
     */
    getId(): string {
        return this.playerId;
    }

    /**
     * Check if this is the local player
     */
    getIsLocalPlayer(): boolean {
        return this.isLocalPlayer;
    }

    /**
     * Update sprite color based on grounded state
     */
    private updateColor(isGrounded: boolean): void {
        const palette = this.isLocalPlayer ? COLORS.LOCAL : COLORS.REMOTE;
        const color = isGrounded ? palette.GROUNDED : palette.AIRBORNE;
        this.sprite.setFillStyle(color);
    }

    /**
     * Clean up the entity
     */
    destroy(): void {
        console.log(`[PlayerEntity] Destroying player: ${this.playerId}`);
        this.sprite.destroy();
    }
}
