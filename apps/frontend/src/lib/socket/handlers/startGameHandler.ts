import type { BaseResponse, StartGameResponse } from '../../../types/event-payloads/server';

export const startGameHandler = (
	payload: BaseResponse<StartGameResponse>,
	done?: (payload: BaseResponse<StartGameResponse>) => void
) => {
	if (!payload.success) {
		console.error('Failed to start game:', payload.error);

		if (done) {
			done(payload);
		}

		return;
	}

	// Game started successfully, handle any additional logic here
	console.log('Game started successfully');

	if (done) {
		done(payload);
	}
};
