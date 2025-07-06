import { getRoomState } from '$lib/socket/emitters/getRoomState';
import type {
	BaseBroadcastResponse,
	PlayerLeftResponse
} from '../../../../types/event-payloads/server';

export const playerLeftHandler = (
	payload: BaseBroadcastResponse<PlayerLeftResponse>,
	done?: (payload: BaseBroadcastResponse<PlayerLeftResponse>) => void
) => {
	// Fire the GetRoomState event to update the room state including the player list
	// Avoid manual updates — re-fetch full state to stay source-of-truth aligned
	getRoomState();

	if (done) {
		done(payload);
	}
};
