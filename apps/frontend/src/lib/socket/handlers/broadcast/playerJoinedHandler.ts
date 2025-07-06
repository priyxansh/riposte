import { getRoomState } from '$lib/socket/emitters/getRoomState';
import type {
	BaseBroadcastResponse,
	PlayerJoinedResponse
} from '../../../../types/event-payloads/server';

export const playerJoinedHandler = (
	payload: BaseBroadcastResponse<PlayerJoinedResponse>,
	done?: (payload: BaseBroadcastResponse<PlayerJoinedResponse>) => void
) => {
	// Fire the GetRoomState event to update the room state including the player list
	// Avoid manual updates — re-fetch full state to stay source-of-truth aligned
	getRoomState();

	if (done) {
		done(payload);
	}
};
