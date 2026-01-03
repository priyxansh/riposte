import { movePlayer } from '$lib/socket/emitters/movePlayer';
import type { KeyState } from '../../types/player';

export const getMoveListener = (keyState: KeyState) => {
	return (e: KeyboardEvent) => {
		switch (e.key) {
			case 'ArrowLeft':
				movePlayer({ direction: 'left', keyState });
				break;
			case 'ArrowRight':
				movePlayer({ direction: 'right', keyState });
				break;
			case ' ': // Space bar for jump
			case 'ArrowUp': // Also allow ArrowUp for jump
				movePlayer({ direction: 'jump', keyState });
				break;


			default:
				console.log('Unhandled key:', e.key);
		}
	};
};
