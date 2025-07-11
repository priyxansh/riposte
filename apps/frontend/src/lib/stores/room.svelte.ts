import type { Room } from '../../types/room';

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
