import Phaser from 'phaser';
import { getRoomState } from '$lib/stores/room.svelte';
import { PHYSICS } from '$lib/constants/physics';

export class MainScene extends Phaser.Scene {
    private playerSprites: Map<string, Phaser.GameObjects.Rectangle> = new Map();
    private groundLine: Phaser.GameObjects.Graphics | null = null;
    private localPlayerSprite: Phaser.GameObjects.Rectangle | null = null;

    constructor() {
        super({ key: 'MainScene' });
    }

    create(): void {
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

        // Debug: Log every ~60 frames (once per second)
        if (this.game.loop.frame % 60 === 0) {
            console.log('[MainScene] roomState:', roomState);
            console.log('[MainScene] players:', roomState?.players);
        }

        if (!roomState) return;

        // Convert Svelte Proxy to plain array (Proxies don't iterate correctly outside reactive context)
        const players = [...roomState.players];

        const currentPlayerIds = new Set<string>();

        // Update or create sprites for each player
        for (const player of players) {
            currentPlayerIds.add(player.id);
            const localPlayerId = localStorage.getItem('playerId');
            const isLocalPlayer = player.id === localPlayerId;

            let sprite = this.playerSprites.get(player.id);

            if (!sprite) {
                // Create new sprite for this player
                sprite = this.createPlayerSprite(player.id);
                this.playerSprites.set(player.id, sprite);

                // Track and follow local player
                if (isLocalPlayer) {
                    this.localPlayerSprite = sprite;
                    this.cameras.main.startFollow(sprite, true, 0.1, 0.1);
                    console.log(`[MainScene] Camera now following local player: ${player.id}`);
                }

                console.log(`[MainScene] Created sprite for player: ${player.id} at (${player.state?.x}, ${player.state?.y})`);
            }

            // Update sprite position from state
            if (player.state) {
                sprite.setPosition(player.state.x, player.state.y);

                // Different color palettes for local vs remote
                // Local: Green (grounded) / Orange (airborne)
                // Remote: Blue (grounded) / Purple (airborne)
                let color: number;
                if (isLocalPlayer) {
                    color = player.state.isGrounded ? 0x48bb78 : 0xed8936;
                } else {
                    color = player.state.isGrounded ? 0x4299e1 : 0x9f7aea;
                }
                sprite.setFillStyle(color);
            }
        }

        // Remove sprites for players who left
        for (const [playerId, sprite] of this.playerSprites) {
            if (!currentPlayerIds.has(playerId)) {
                sprite.destroy();
                this.playerSprites.delete(playerId);
                console.log(`[MainScene] Removed sprite for player: ${playerId}`);
            }
        }
    }

    private createPlayerSprite(playerId: string): Phaser.GameObjects.Rectangle {
        const localPlayerId = localStorage.getItem('playerId');
        const isLocalPlayer = playerId === localPlayerId;

        // Different colors for local vs remote player
        const color = isLocalPlayer ? 0x48bb78 : 0x4299e1;

        const sprite = this.add.rectangle(400, 300, 40, 40, color);
        sprite.setOrigin(0.5, 1); // Bottom-center origin for ground alignment

        return sprite;
    }

    shutdown(): void {
        // Cleanup when scene is destroyed
        this.playerSprites.clear();
        console.log('[MainScene] Scene shutdown');
    }
}
