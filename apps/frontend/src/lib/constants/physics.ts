// Physics constants - MUST match backend values exactly
export const PHYSICS = {
    GRAVITY: 800.0, // pixels/s²
    TERMINAL_VELOCITY: 600.0, // pixels/s
    JUMP_STRENGTH: -400.0, // pixels/s (negative = upward)
    GROUND_LEVEL: 500.0, // Y coordinate
    DEFAULT_SPEED: 200.0 // pixels/s
} as const;
