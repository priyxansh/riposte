import Phaser from 'phaser';
import { getRoomState } from '$lib/stores/room.svelte';
import { PHYSICS } from '$lib/constants/physics';
import { PlayerEntity } from '../entities/PlayerEntity';

export class MainScene extends Phaser.Scene {
    private playerEntities: Map<string, PlayerEntity> = new Map();
    private groundLine: Phaser.GameObjects.Graphics | null = null;
    private localPlayerId: string | null = null;

    constructor() {
        super({ key: 'MainScene' });
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

        console.log('[MainScene] Scene created');
    }

    update(): void {
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
            entity.update();
        }

        // Remove entities for players who left
        for (const [playerId, entity] of this.playerEntities) {
            if (!currentPlayerIds.has(playerId)) {
                entity.destroy();
                this.playerEntities.delete(playerId);
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

