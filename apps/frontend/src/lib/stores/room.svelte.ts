import type { Room } from '../../types/room';
import type { PlayerState } from '../../types/player';

const roomState = $state<{
	room: Room | null;
}>({
	room: null
});

export function clearRoomState() {
	roomState.room = null;
}

// Getter function for room state
export function getRoomState(): Room | null {
	return roomState.room;
}

// Setter function for room state
export function setRoomState(room: Room | null) {
	roomState.room = room;
}

// Helper function to update specific room properties
export function updateRoomState(updates: Partial<Room>) {
	if (roomState.room) {
		roomState.room = { ...roomState.room, ...updates };
	}
}

// Get the local player's current state
export function getLocalPlayerState(playerId: string): PlayerState | null {
	if (!roomState.room) return null;
	const player = roomState.room.players.find((p) => p.id === playerId);
	return player?.state ?? null;
}

// Update only the local player's state (for immediate prediction)
export function updateLocalPlayerState(playerId: string, newState: PlayerState) {
	if (!roomState.room) return;

	roomState.room = {
		...roomState.room,
		players: roomState.room.players.map((p) =>
			p.id === playerId ? { ...p, state: newState } : p
		)
	};
}
