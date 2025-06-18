import type { Player } from './player';

export type Room = {
	id: string;
	name: string;
	hostId: string;
	mode: '1v1' | '2v2';
	players: Player[];
};
