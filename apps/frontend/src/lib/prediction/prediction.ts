import type { PlayerState, MoveDirection, KeyState } from '../../types/player';

import { PHYSICS } from '../constants/physics';

// Input with sequence number for reconciliation
export type BufferedInput = {
    sequenceNumber: number;
    direction: MoveDirection;
    keyState: KeyState;
    timestamp: number; // for deltaTime calculation
};

// Global sequence counter
let nextSequenceNumber = 1;

// Buffer of unacknowledged inputs
const pendingInputs: BufferedInput[] = [];


/**
 * Generate the next sequence number for an input
 */
export function getNextSequenceNumber(): number {
    return nextSequenceNumber++;
}

/**
 * Buffer an input for later reconciliation
 */
export function bufferInput(input: BufferedInput): void {
    pendingInputs.push(input);
}

/**
 * Get all pending (unacknowledged) inputs
 */
export function getPendingInputs(): BufferedInput[] {
    return [...pendingInputs];
}

/**
 * Clear inputs that have been acknowledged by the server
 */
export function acknowledgeInputs(lastProcessedSequence: number): void {
    // Remove all inputs up to and including the acknowledged sequence
    while (pendingInputs.length > 0 && pendingInputs[0].sequenceNumber <= lastProcessedSequence) {
        pendingInputs.shift();
    }
}

/**
 * Apply an input to local predicted state
 * This mirrors the server's MovePlayer logic EXACTLY
 */
export function applyInputToState(
    state: PlayerState,
    direction: MoveDirection,
    keyState: KeyState
): PlayerState {
    const newState = { ...state };

    switch (direction) {
        case 'left':
            if (keyState === 'pressed') {
                newState.isHoldingLeft = true;
                if (!newState.isStaggered) {
                    newState.facingDirection = -1;
                }
                if (!newState.isDashing && !newState.isDownDashing && !newState.isStaggered) {
                    let speed = PHYSICS.DEFAULT_SPEED;
                    if (newState.isBlocking) speed *= PHYSICS.BLOCK_SPEED_FACTOR;
                    newState.vx = -speed;
                }
            } else {
                newState.isHoldingLeft = false;
                if (!newState.isDashing && !newState.isDownDashing && !newState.isStaggered) {
                    if (newState.isHoldingRight) {
                        let speed = PHYSICS.DEFAULT_SPEED;
                        if (newState.isBlocking) speed *= PHYSICS.BLOCK_SPEED_FACTOR;
                        newState.vx = speed;
                        newState.facingDirection = 1;
                    } else {
                        newState.vx = 0;
                    }
                }
            }
            break;
        case 'right':
            if (keyState === 'pressed') {
                newState.isHoldingRight = true;
                if (!newState.isStaggered) {
                    newState.facingDirection = 1;
                }
                if (!newState.isDashing && !newState.isDownDashing && !newState.isStaggered) {
                    let speed = PHYSICS.DEFAULT_SPEED;
                    if (newState.isBlocking) speed *= PHYSICS.BLOCK_SPEED_FACTOR;
                    newState.vx = speed;
                }
            } else {
                newState.isHoldingRight = false;
                if (!newState.isDashing && !newState.isDownDashing && !newState.isStaggered) {
                    if (newState.isHoldingLeft) {
                        let speed = PHYSICS.DEFAULT_SPEED;
                        if (newState.isBlocking) speed *= PHYSICS.BLOCK_SPEED_FACTOR;
                        newState.vx = -speed;
                        newState.facingDirection = -1;
                    } else {
                        newState.vx = 0;
                    }
                }
            }
            break;
        case 'jump':
            if (keyState === 'pressed') {
                // Only allow jump if grounded and not dashing/attacking/staggered
                if (newState.isGrounded && !newState.isDashing && !newState.isDownDashing && !newState.isAttacking && !newState.isStaggered) {
                    newState.vy = PHYSICS.JUMP_STRENGTH;
                }
            } else if (keyState === 'released') {
                // Variable jump: Cut velocity if still rising (and not dashing)
                if (newState.vy < 0 && !newState.isDashing) {
                    newState.vy *= 0.5;
                }
            }
            break;
        case 'dash':
            if (keyState === 'pressed' && !newState.isDashing && !newState.isDownDashing && !newState.isBlocking && !newState.isAttacking && !newState.isStaggered && newState.dashCooldown <= 0) {
                if (newState.isGrounded || newState.hasAirDash) {
                    newState.isDashing = true;
                    newState.dashTimer = PHYSICS.DASH_DURATION;
                    newState.dashCooldown = PHYSICS.DASH_COOLDOWN_TIME;
                    newState.vx = newState.facingDirection * PHYSICS.DASH_SPEED;
                    newState.vy = 0;
                    if (!newState.isGrounded) {
                        newState.hasAirDash = false;
                    }
                }
            }
            break;
        case 'downdash':
            if (keyState === 'pressed' && !newState.isGrounded && !newState.isDashing && !newState.isDownDashing && !newState.isBlocking && !newState.isAttacking && !newState.isStaggered && newState.dashCooldown <= 0) {
                newState.isDownDashing = true;
                newState.dashTimer = PHYSICS.DOWN_DASH_DURATION;
                newState.dashCooldown = PHYSICS.DASH_COOLDOWN_TIME;
                newState.vx = 0;
                newState.vy = PHYSICS.DOWN_DASH_SPEED;
                newState.hasAirDash = false;
            }
            break;
        case 'attack':
            if (keyState === 'pressed' && !newState.isAttacking && !newState.isBlocking && !newState.isDashing && !newState.isDownDashing && !newState.isStaggered && newState.attackCooldown <= 0) {
                newState.isAttacking = true;
                newState.attackHitChecked = false; // reset for this new swing
                newState.attackTimer = PHYSICS.ATTACK_DURATION;
                newState.attackCooldown = PHYSICS.ATTACK_COOLDOWN_TIME;
                newState.vx = 0;
            }
            break;
        case 'block':
            if (keyState === 'pressed') {
                if (!newState.isAttacking && !newState.isStaggered) {
                    newState.isBlocking = true;
                    newState.blockTimer = 0; // reset parry window on fresh block press
                }
                // Cannot apply block speed while dashing or attacking
                if (!newState.isDashing && !newState.isDownDashing && !newState.isAttacking) {
                    // Cap current velocity to block speed
                    const blockSpeed = PHYSICS.DEFAULT_SPEED * PHYSICS.BLOCK_SPEED_FACTOR;
                    if (newState.vx > blockSpeed) {
                        newState.vx = blockSpeed;
                    } else if (newState.vx < -blockSpeed) {
                        newState.vx = -blockSpeed;
                    }
                }
            } else {
                newState.isBlocking = false;
                // Restore full speed based on held keys
                if (!newState.isDashing && !newState.isDownDashing) {
                    if (newState.isHoldingLeft && !newState.isHoldingRight) {
                        newState.vx = -PHYSICS.DEFAULT_SPEED;
                    } else if (newState.isHoldingRight && !newState.isHoldingLeft) {
                        newState.vx = PHYSICS.DEFAULT_SPEED;
                    } else {
                        newState.vx = 0;
                    }
                }
            }
            break;
    }

    return newState;
}

/**
 * Simulate physics for a given deltaTime (in seconds)
 * This mirrors the server's game loop physics EXACTLY
 */
export function simulatePhysics(state: PlayerState, deltaTime: number): PlayerState {
    const newState = { ...state };

    // --- Dash cooldown ---
    if (newState.dashCooldown > 0) {
        newState.dashCooldown -= deltaTime;
        if (newState.dashCooldown < 0) {
            newState.dashCooldown = 0;
        }
    }

    // --- Attack cooldown ---
    if (newState.attackCooldown > 0) {
        newState.attackCooldown -= deltaTime;
        if (newState.attackCooldown < 0) {
            newState.attackCooldown = 0;
        }
    }

    // --- Attack timer ---
    if (newState.isAttacking) {
        newState.attackTimer -= deltaTime;
        if (newState.attackTimer <= 0) {
            newState.isAttacking = false;
            newState.attackTimer = 0;
            // Restore velocity based on held keys
            let speed = PHYSICS.DEFAULT_SPEED;
            if (newState.isBlocking) speed *= PHYSICS.BLOCK_SPEED_FACTOR;
            if (newState.isHoldingLeft && !newState.isHoldingRight) {
                newState.vx = -speed;
            } else if (newState.isHoldingRight && !newState.isHoldingLeft) {
                newState.vx = speed;
            } else {
                newState.vx = 0;
            }
        }
    }

    // --- Block timer (parry window) ---
    if (newState.isBlocking) {
        newState.blockTimer += deltaTime;
    }

    // --- Posture recovery ---
    if (!newState.isBlocking && !newState.isAttacking && !newState.isStaggered && newState.posture > 0) {
        newState.posture -= PHYSICS.POSTURE_RECOVERY_RATE * deltaTime;
        if (newState.posture < 0) {
            newState.posture = 0;
        }
    }

    // --- Stagger timer ---
    if (newState.isStaggered) {
        // Also cancel any active dashes
        newState.isDashing = false;
        newState.isDownDashing = false;
        newState.dashTimer = 0;

        newState.staggerTimer -= deltaTime;
        if (newState.staggerTimer <= 0) {
            newState.isStaggered = false;
            newState.staggerTimer = 0;
            // Restore velocity based on held keys
            let speed = PHYSICS.DEFAULT_SPEED;
            if (newState.isBlocking) speed *= PHYSICS.BLOCK_SPEED_FACTOR;
            if (newState.isHoldingLeft && !newState.isHoldingRight) {
                newState.vx = -speed;
            } else if (newState.isHoldingRight && !newState.isHoldingLeft) {
                newState.vx = speed;
            } else {
                newState.vx = 0;
            }
        }
    }

    // --- Dash physics ---
    if (newState.isDashing) {
        // Horizontal dash: force velocity, skip gravity
        newState.vx = newState.facingDirection * PHYSICS.DASH_SPEED;
        newState.vy = 0;
        newState.dashTimer -= deltaTime;
        if (newState.dashTimer <= 0) {
            newState.isDashing = false;
            newState.dashTimer = 0;
            let speed = PHYSICS.DEFAULT_SPEED;
            if (newState.isBlocking) speed *= PHYSICS.BLOCK_SPEED_FACTOR;
            if (newState.isHoldingLeft && !newState.isHoldingRight) {
                newState.vx = -speed;
            } else if (newState.isHoldingRight && !newState.isHoldingLeft) {
                newState.vx = speed;
            } else {
                newState.vx = 0;
            }
        }
    } else if (newState.isDownDashing) {
        // Downward plunge: force velocity, skip gravity
        newState.vx = 0;
        newState.vy = PHYSICS.DOWN_DASH_SPEED;
        newState.dashTimer -= deltaTime;
        if (newState.dashTimer <= 0) {
            newState.isDownDashing = false;
            newState.dashTimer = 0;
            newState.vy = 0;
            let speed = PHYSICS.DEFAULT_SPEED;
            if (newState.isBlocking) speed *= PHYSICS.BLOCK_SPEED_FACTOR;
            if (newState.isHoldingLeft && !newState.isHoldingRight) {
                newState.vx = -speed;
            } else if (newState.isHoldingRight && !newState.isHoldingLeft) {
                newState.vx = speed;
            } else {
                newState.vx = 0;
            }
        }
    } else {
        // Normal physics: apply gravity
        newState.vy += PHYSICS.GRAVITY * deltaTime;

        // Enforce terminal velocity
        if (newState.vy > PHYSICS.TERMINAL_VELOCITY) {
            newState.vy = PHYSICS.TERMINAL_VELOCITY;
        }
    }

    // --- Attack movement lock ---
    if (newState.isAttacking) {
        newState.vx = 0;
    }

    // --- Stagger movement lock ---
    if (newState.isStaggered) {
        newState.vx = 0;
    }

    // Update position
    newState.x += newState.vx * deltaTime;
    newState.y += newState.vy * deltaTime;

    // Ground collision
    if (newState.y >= PHYSICS.GROUND_LEVEL) {
        newState.y = PHYSICS.GROUND_LEVEL;
        newState.vy = 0;
        newState.isGrounded = true;

        // End down-dash on landing
        if (newState.isDownDashing) {
            newState.isDownDashing = false;
            newState.dashTimer = 0;
            let speed = PHYSICS.DEFAULT_SPEED;
            if (newState.isBlocking) speed *= PHYSICS.BLOCK_SPEED_FACTOR;
            if (newState.isHoldingLeft && !newState.isHoldingRight) {
                newState.vx = -speed;
            } else if (newState.isHoldingRight && !newState.isHoldingLeft) {
                newState.vx = speed;
            } else {
                newState.vx = 0;
            }
        }

        // Reset air dash on landing
        newState.hasAirDash = true;
    } else {
        newState.isGrounded = false;
    }

    return newState;
}

/**
 * Reconcile: Take server state, then re-apply all unacknowledged inputs.
 *
 * Physics is stepped in exact FIXED_STEP intervals using an accumulator,
 * mirroring the server's fixed timestep loop. This prevents floating-point
 * drift between client prediction and server authority.
 */
export function reconcile(
    serverState: PlayerState,
    lastProcessedSequence: number
): PlayerState {
    // 1. Acknowledge processed inputs
    acknowledgeInputs(lastProcessedSequence);

    // 2. Start from server authoritative state
    let reconciledState = { ...serverState };

    // 3. Re-apply all pending (unacknowledged) inputs
    if (pendingInputs.length > 0) {
        let lastTime = pendingInputs[0].timestamp;
        const now = performance.now();
        let accumulator = 0;

        for (const input of pendingInputs) {
            // Time elapsed since the previous input (in seconds)
            const dt = Math.max(0, (input.timestamp - lastTime) / 1000);

            // Pour this time into the accumulator and step physics
            // in exact FIXED_STEP chunks BEFORE applying this input.
            // This simulates the physics that happened while the player
            // was "between" pressing two keys.
            accumulator += dt;
            while (accumulator >= PHYSICS.FIXED_STEP) {
                reconciledState = simulatePhysics(reconciledState, PHYSICS.FIXED_STEP);
                accumulator -= PHYSICS.FIXED_STEP;
            }

            // Now apply the input itself (sets velocity)
            reconciledState = applyInputToState(reconciledState, input.direction, input.keyState);

            lastTime = input.timestamp;
        }

        // Simulate from the last input until NOW to bring the state
        // up to the current render frame
        const timeSinceLastInput = Math.max(0, (now - lastTime) / 1000);
        accumulator += timeSinceLastInput;
        while (accumulator >= PHYSICS.FIXED_STEP) {
            reconciledState = simulatePhysics(reconciledState, PHYSICS.FIXED_STEP);
            accumulator -= PHYSICS.FIXED_STEP;
        }
        // Any sub-step remainder (<16.6ms) is intentionally discarded.
        // It's too small to cause visible drift and will be covered
        // by the next reconciliation cycle.
    }

    return reconciledState;
}

/**
 * Reset the prediction system (e.g., when leaving a game)
 */
export function resetPrediction(): void {
    nextSequenceNumber = 1;
    pendingInputs.length = 0;
}
