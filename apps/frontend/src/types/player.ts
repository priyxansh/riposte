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
};

export type MoveDirection = 'left' | 'right';
export type KeyState = 'pressed' | 'released';
