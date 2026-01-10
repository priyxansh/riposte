import Phaser from 'phaser';
import { MainScene } from './scenes/MainScene';

let gameInstance: Phaser.Game | null = null;

export function launchGame(containerId: string): Phaser.Game {
    if (gameInstance) {
        console.warn('Game already running, destroying previous instance');
        gameInstance.destroy(true);
    }

    const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        parent: containerId,
        backgroundColor: '#1a1a2e',
        physics: {
            default: 'arcade',
            arcade: {
                gravity: { x: 0, y: 0 },
                debug: false
            }
        },
        scene: [MainScene],
        scale: {
            mode: Phaser.Scale.RESIZE,
            width: '100%',
            height: '100%',
            autoCenter: Phaser.Scale.CENTER_BOTH
        }
    };

    gameInstance = new Phaser.Game(config);
    return gameInstance;
}

export function destroyGame(): void {
    if (gameInstance) {
        gameInstance.destroy(true);
        gameInstance = null;
    }
}

export function getGameInstance(): Phaser.Game | null {
    return gameInstance;
}
