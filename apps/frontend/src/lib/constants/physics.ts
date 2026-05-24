// Physics constants - MUST match backend values exactly
export const PHYSICS = {
    GRAVITY: 800.0, // pixels/s²
    TERMINAL_VELOCITY: 600.0, // pixels/s
    JUMP_STRENGTH: -400.0, // pixels/s (negative = upward)
    GROUND_LEVEL: 500.0, // Y coordinate
    DEFAULT_SPEED: 200.0, // pixels/s
    FIXED_STEP: 1.0 / 60.0, // seconds — MUST match backend FixedDeltaTime exactly
    RECONCILIATION_SMOOTHING_DECAY: 0.85, // per-frame multiplier for visual offset decay
    DASH_SPEED: 600.0, // pixels/s
    DASH_DURATION: 0.12, // seconds
    DASH_COOLDOWN_TIME: 0.5, // seconds
    DOWN_DASH_SPEED: 800.0, // pixels/s
    DOWN_DASH_DURATION: 0.25, // seconds
    BLOCK_SPEED_FACTOR: 0.3, // movement speed multiplier while blocking
    ATTACK_DURATION: 0.2, // seconds — active attack swing duration
    ATTACK_COOLDOWN_TIME: 0.4, // seconds — minimum time between attacks
    ATTACK_WIDTH: 40.0, // pixels — horizontal reach of attack hitbox
    ATTACK_HEIGHT: 30.0, // pixels — vertical height of attack hitbox
} as const;

