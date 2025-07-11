import type {
	BaseBroadcastResponse,
	GameStartedResponse
} from '../../../../types/event-payloads/server';

export const gameStartedHandler = (
	payload: BaseBroadcastResponse<GameStartedResponse>,
	done?: (payload: BaseBroadcastResponse<GameStartedResponse>) => void
) => {
	// Notify all players in the room that the game has started
	// This can be used to trigger UI updates or other game logic

	if (done) {
		done(payload);
	}
};
