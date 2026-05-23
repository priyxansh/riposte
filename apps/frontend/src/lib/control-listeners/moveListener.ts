import { movePlayer } from '$lib/socket/emitters/movePlayer';
import type { KeyState } from '../../types/player';

// Track which keys are currently held (needed for combo detection)
const heldKeys = new Set<string>();

export const getMoveListener = (keyState: KeyState) => {
	return (e: KeyboardEvent) => {
		// Prevent repeated events from held keys
		if (e.repeat) return;

		const key = e.key.toLowerCase();

		// Track held state for combo detection
		if (keyState === 'pressed') {
			heldKeys.add(key);
		} else {
			heldKeys.delete(key);
		}

		switch (key) {
			case 'arrowleft':
				movePlayer({ direction: 'left', keyState });
				break;
			case 'arrowright':
				movePlayer({ direction: 'right', keyState });
				break;
			case ' ': // Space bar for jump
			case 'arrowup': // Also allow ArrowUp for jump
				movePlayer({ direction: 'jump', keyState });
				break;
			case 'shift':
				if (keyState === 'pressed') {
					// Check if down key is held for downward plunge
					const isDownHeld = heldKeys.has('arrowdown') || heldKeys.has('s');
					if (isDownHeld) {
						movePlayer({ direction: 'downdash', keyState: 'pressed' });
					} else {
						movePlayer({ direction: 'dash', keyState: 'pressed' });
					}
				}
				// No 'released' event for dash — it's fire-and-forget
				break;
			case 'arrowdown':
			case 's':
				// These keys are tracked for combo detection but don't
				// produce movement events themselves (yet)
				break;
			default:
				break;
		}
	};
};

