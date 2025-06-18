import { socketManager } from '$lib/stores/socket.svelte';
import type { ResponsePayload } from '../../../types/event-payloads/payload-map';

export const joinRoomHandler = (
	payload: ResponsePayload['join_room'],
	done?: (result: ResponsePayload['join_room']) => void
) => {
	if (!payload.success || !payload.data?.roomId) {
		console.error('Failed to join room:', payload.error);

		if (done) {
			done(payload);
		}

		return;
	}

	const { roomId, hostId, mode, players } = payload.data;

	socketManager.roomState = {
		id: roomId,
		name: `Room ${roomId}`, // Placeholder name, should be set based on actual room data
		hostId: hostId,
		mode: mode,
		players: players
	};

	if (done) {
		done(payload);
	}
};
