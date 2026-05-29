import Phaser from 'phaser';
import { getRoomState, getLocalPlayerState, updateLocalPlayerState } from '$lib/stores/room.svelte';
import { PHYSICS } from '$lib/constants/physics';
import { simulatePhysics } from '$lib/prediction/prediction';
import { PlayerEntity } from '../entities/PlayerEntity';

export class MainScene extends Phaser.Scene {
    private playerEntities: Map<string, PlayerEntity> = new Map();
    private groundLine: Phaser.GameObjects.Graphics | null = null;
    private localPlayerId: string | null = null;

    // Accumulator for the local player's per-frame physics tick.
    // This ensures we step physics in exact FIXED_STEP chunks even
    // though Phaser's update() fires at the monitor's variable refresh rate.
    private localAccumulator: number = 0;

    constructor() {
        super({ key: 'MainScene' });
    }

    preload(): void {
        this.load.spritesheet('samurai_idle', '/assets/sprites/samurai/idle.png', { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('samurai_run', '/assets/sprites/samurai/run.png', { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('samurai_attack', '/assets/sprites/samurai/attack.png', { frameWidth: 48, frameHeight: 48 });
        this.load.spritesheet('samurai_deflect_h', '/assets/sprites/samurai/deflect_h.png', { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('samurai_deflect_v', '/assets/sprites/samurai/deflect_v.png', { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('samurai_taking_hit', '/assets/sprites/samurai/taking_hit.png', { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('samurai_die', '/assets/sprites/samurai/die.png', { frameWidth: 35, frameHeight: 32 });
        this.load.spritesheet('samurai_crouch', '/assets/sprites/samurai/crouch.png', { frameWidth: 32, frameHeight: 32 });
    }

    create(): void {
        // Get local player ID once
        this.localPlayerId = localStorage.getItem('playerId');

        // Set world bounds (much larger than the viewport)
        this.cameras.main.setBounds(-2000, 0, 6000, 600);

        // Draw ground line spanning the entire world
        this.groundLine = this.add.graphics();
        this.groundLine.lineStyle(2, 0x4a5568);
        this.groundLine.lineBetween(-2000, PHYSICS.GROUND_LEVEL, 4000, PHYSICS.GROUND_LEVEL);

        // Register animations
        this.anims.create({ key: 'samurai_idle', frames: this.anims.generateFrameNumbers('samurai_idle', { start: 0, end: 3 }), frameRate: 8, repeat: -1 });
        this.anims.create({ key: 'samurai_run', frames: this.anims.generateFrameNumbers('samurai_run', { start: 0, end: 5 }), frameRate: 12, repeat: -1 });
        this.anims.create({ key: 'samurai_attack', frames: this.anims.generateFrameNumbers('samurai_attack', { start: 0, end: 6 }), frameRate: 14, repeat: 0 });
        this.anims.create({ key: 'samurai_deflect_h', frames: this.anims.generateFrameNumbers('samurai_deflect_h', { start: 0, end: 1 }), frameRate: 12, repeat: 0 });
        this.anims.create({ key: 'samurai_deflect_v', frames: this.anims.generateFrameNumbers('samurai_deflect_v', { start: 0, end: 1 }), frameRate: 16, repeat: 0 });
        this.anims.create({ key: 'samurai_taking_hit', frames: this.anims.generateFrameNumbers('samurai_taking_hit', { start: 0, end: 3 }), frameRate: 10, repeat: -1 });
        this.anims.create({ key: 'samurai_die', frames: this.anims.generateFrameNumbers('samurai_die', { start: 0, end: 9 }), frameRate: 10, repeat: 0 });
        this.anims.create({ key: 'samurai_crouch', frames: this.anims.generateFrameNumbers('samurai_crouch', { start: 0, end: 2 }), frameRate: 8, repeat: 0 });

        console.log('[MainScene] Scene created');
    }

    update(_time: number, delta: number): void {
        const roomState = getRoomState();
        if (!roomState) return;

        // Convert Svelte Proxy to plain array
        const players = [...roomState.players];
        const currentPlayerIds = new Set<string>();

        // Update or create entities for each player
        for (const player of players) {
            currentPlayerIds.add(player.id);
            const isLocalPlayer = player.id === this.localPlayerId;

            let entity = this.playerEntities.get(player.id);

            if (!entity) {
                // Create new entity for this player
                entity = new PlayerEntity(this, player.id, isLocalPlayer, player.state);
                this.playerEntities.set(player.id, entity);

                // Camera follows local player
                if (isLocalPlayer) {
                    this.cameras.main.startFollow(entity.getSprite(), true, 0.1, 0.1);
                    console.log(`[MainScene] Camera following local player: ${player.id}`);
                }
            }

            // Update entity with latest server state
            if (player.state) {
                entity.updateFromServerState(player.state);
            }

            // Run entity update (handles interpolation for remote players)
            entity.update(delta);
        }

        // --- Local player physics tick ---
        // Advance the local player's physics every visual frame so movement
        // feels responsive at the monitor's full refresh rate (e.g. 144Hz),
        // rather than being locked to the server's 60Hz packet rate.
        if (this.localPlayerId) {
            this.tickLocalPlayer(delta);
        }

        // Remove entities for players who left
        for (const [playerId, entity] of this.playerEntities) {
            if (!currentPlayerIds.has(playerId)) {
                entity.destroy();
                this.playerEntities.delete(playerId);
            }
        }
    }

    /**
     * Advance the local player's physics by `delta` ms using a fixed-step
     * accumulator. This is purely a visual extrapolation — when the next
     * server packet arrives, reconcile() will overwrite this state with
     * the authoritative result, correcting any drift.
     */
    private tickLocalPlayer(delta: number): void {
        if (!this.localPlayerId) return;

        const currentState = getLocalPlayerState(this.localPlayerId);
        if (!currentState) return;

        // delta is in milliseconds from Phaser; convert to seconds
        const dt = Math.min(delta / 1000, 0.1); // cap to prevent spiral of death

        this.localAccumulator += dt;

        let state = { ...currentState };
        let stepped = false;

        while (this.localAccumulator >= PHYSICS.FIXED_STEP) {
            state = simulatePhysics(state, PHYSICS.FIXED_STEP);
            this.localAccumulator -= PHYSICS.FIXED_STEP;
            stepped = true;
        }

        // Write back whenever physics stepped — dash timers/cooldowns
        // change every tick even if position hasn't moved yet
        if (stepped) {
            updateLocalPlayerState(this.localPlayerId, state);

            // Update the entity's physics position through the offset system
            // so reconciliation visual smoothing is preserved
            const entity = this.playerEntities.get(this.localPlayerId);
            if (entity) {
                entity.updateLocalPhysicsPosition(state.x, state.y);
            }
        }
    }

    shutdown(): void {
        // Cleanup all entities
        for (const entity of this.playerEntities.values()) {
            entity.destroy();
        }
        this.playerEntities.clear();
        console.log('[MainScene] Scene shutdown');
    }
}
