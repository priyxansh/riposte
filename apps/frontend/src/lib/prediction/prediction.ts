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

// Current predicted velocity (not state - state comes from server)
let predictedVX = 0;

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
 * This mirrors the server's MovePlayer logic
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
                newState.vx = -PHYSICS.DEFAULT_SPEED;
            } else {
                newState.vx = 0;
            }
            break;
        case 'right':
            if (keyState === 'pressed') {
                newState.vx = PHYSICS.DEFAULT_SPEED;
            } else {
                newState.vx = 0;
            }
            break;
        case 'jump':
            if (keyState === 'pressed') {
                if (newState.isGrounded) {
                    newState.vy = PHYSICS.JUMP_STRENGTH;
                }
            } else if (keyState === 'released') {
                // Variable jump: Cut velocity if still rising
                if (newState.vy < 0) {
                    newState.vy *= 0.5;
                }
            }
            break;
    }

    return newState;
}

/**
 * Simulate physics for a given deltaTime (in seconds)
 * This mirrors the server's game loop physics
 */
export function simulatePhysics(state: PlayerState, deltaTime: number): PlayerState {
    const newState = { ...state };

    // Apply gravity
    newState.vy += PHYSICS.GRAVITY * deltaTime;

    // Enforce terminal velocity
    if (newState.vy > PHYSICS.TERMINAL_VELOCITY) {
        newState.vy = PHYSICS.TERMINAL_VELOCITY;
    }

    // Update position
    newState.x += newState.vx * deltaTime;
    newState.y += newState.vy * deltaTime;

    // Ground collision
    if (newState.y >= PHYSICS.GROUND_LEVEL) {
        newState.y = PHYSICS.GROUND_LEVEL;
        newState.vy = 0;
        newState.isGrounded = true;
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
        // Any sub-step remainder (< 16.6ms) is intentionally discarded.
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
    predictedVX = 0;
}
