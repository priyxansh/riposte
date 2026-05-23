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
	lastUpdateTime?: number;
};

export type MoveDirection = 'left' | 'right' | 'jump' | 'dash' | 'downdash';
export type KeyState = 'pressed' | 'released';

