import { clearRoomState, setRoomState } from '$lib/stores/room.svelte';
import type { ResponsePayload } from '../../../types/event-payloads/payload-map';

export const joinRoomHandler = (
	payload: ResponsePayload['join_room'],
	done?: (result: ResponsePayload['join_room']) => void
) => {
	if (!payload.success || !payload.data) {
		console.error('Failed to join room:', payload.error);

		if (done) {
			done(payload);
		}

		return;
	}

	// Clear previous roomState
	clearRoomState();

	const { roomId, hostId, mode, players, roomName } = payload.data;

	setRoomState({
		id: roomId,
		name: roomName,
		hostId: hostId,
		mode: mode,
		players: players
	});

	if (done) {
		done(payload);
	}
};
