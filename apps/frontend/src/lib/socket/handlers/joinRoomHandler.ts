import type { ResponsePayload } from '../../../types/event-payloads/payload-map';
import type { BaseResponse, JoinRoomResponse } from '../../../types/event-payloads/server';
import type { GameError } from '../../../types/game-error';

export const joinRoomHandler = (
	payload: BaseResponse<JoinRoomResponse>,
	done?: (result: ResponsePayload['join_room']) => void
) => {
	if (!payload.success) {
		console.error('Failed to join room:', payload.error);

		if (done) {
			done({ success: false, error: payload.error! });
		}

		return;
	}

	if (done) {
		done({ success: true });
	}
};
