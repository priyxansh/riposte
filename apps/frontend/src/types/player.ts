export type Player = {
	id: string;
	name: string;
	state?: PlayerState;
};

export type PlayerSnapshot = Player & {
	state: PlayerState;
};

export type PlayerState = {
	x: number;
	y: number;
	vx: number;
	vy: number;
	isGrounded: boolean;
	facingDirection: number; // 1 = Right, -1 = Left
	isDashing: boolean;
	isDownDashing: boolean;
	dashTimer: number;
	dashCooldown: number;
	hasAirDash: boolean;
	isHoldingLeft: boolean;
	isHoldingRight: boolean;
	isBlocking: boolean;
	isAttacking: boolean;
	attackTimer: number;
	attackCooldown: number;
	attackHitChecked: boolean; // true after hit check fires for this swing (prevents multi-hit)
	posture: number;           // current posture build-up (0=fresh, 100=broken)
	blockTimer: number;        // time since block was pressed (for parry window detection)
	lastHitResult: string;     // "" | "hit" | "blocked" | "deflected" — reset each tick
	lastUpdateTime?: number;
};

export type MoveDirection = 'left' | 'right' | 'jump' | 'dash' | 'downdash' | 'block' | 'attack';
export type KeyState = 'pressed' | 'released';

