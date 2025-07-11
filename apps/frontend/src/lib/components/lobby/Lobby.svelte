<script lang="ts">
	import { socketManager } from '$lib/stores/socket.svelte';
	import PlayerList from './PlayerList.svelte';
	import RoomInfo from './RoomInfo.svelte';
	import GameControls from './GameControls.svelte';
	import { onMount } from 'svelte';
	import { getRoomState } from '$lib/socket/emitters/getRoomState';
	import { EVENTS } from '$lib/constants/events';
	import { getRoomStateHandler } from '$lib/socket/handlers/getRoomStateHandler';
	import { playerJoinedHandler } from '$lib/socket/handlers/broadcast/playerJoinedHandler';
	import { leaveRoom } from '$lib/socket/emitters/leaveRoom';
	import type {
		BaseBroadcastResponse,
		BaseResponse,
		GameStartedResponse,
		LeaveRoomResponse,
		StartGameResponse
	} from '../../../types/event-payloads/server';
	import { goto } from '$app/navigation';
	import { leaveRoomHandler } from '$lib/socket/handlers/leaveRoomHandler';
	import { playerLeftHandler } from '$lib/socket/handlers/broadcast/playerLeftHandler';
	import { startGame } from '$lib/socket/emitters/startGame';
	import { startGameHandler } from '$lib/socket/handlers/startGameHandler';
	import { gameStartedHandler } from '$lib/socket/handlers/broadcast/gameStartedHandler';
	import { getRoomState as getRoomStateValue } from '$lib/stores/room.svelte';

	let currentPlayerId = $state(''); // TODO: Get from user session/auth

	// Reactive state from socket manager
	let room = $derived(getRoomStateValue());
	let isHost = $derived(room ? room.hostId === currentPlayerId : false);
	let isReady = $state(false);

	const handleLeaveRoomResponse = (payload: BaseResponse<LeaveRoomResponse>) => {
		leaveRoomHandler(payload, onLeaveRoomDone);
	};

	const onLeaveRoomDone = (payload: BaseResponse<LeaveRoomResponse>) => {
		if (payload.success) {
			goto('/lobby'); // Redirect to lobby after leaving room
		}
	};

	const handleStartGameResponse = (payload: BaseResponse<StartGameResponse>) => {
		startGameHandler(payload, onStartGameDone);
	};

	const onStartGameDone = (payload: BaseResponse<StartGameResponse>) => {
		if (payload.success && room?.id) {
			// Handle successful game start, e.g., redirect to game page
			goto(`/game/${room.id}`);
		}
	};

	onMount(() => {
		const playerId = localStorage.getItem('playerId');

		if (playerId) {
			currentPlayerId = playerId;
		}
	});

	onMount(() => {
		// Emit an event to sync the room state when the component mounts
		getRoomState();
	});

	const onGameStartedDone = (payload: BaseBroadcastResponse<GameStartedResponse>) => {
		if (payload.data.roomId) {
			// Handle successful game start, e.g., redirect to game page
			goto(`/game/${payload.data.roomId}`);
		}
	};

	const handleGameStartedResponse = (payload: BaseBroadcastResponse<GameStartedResponse>) => {
		gameStartedHandler(payload, onGameStartedDone);
	};

	// Handle room state updates
	$effect(() => {
		socketManager.addMessageListener(EVENTS.GET_ROOM_STATE, getRoomStateHandler);
		socketManager.addMessageListener(EVENTS.PLAYER_JOINED, playerJoinedHandler);
		socketManager.addMessageListener(EVENTS.LEAVE_ROOM, handleLeaveRoomResponse);
		socketManager.addMessageListener(EVENTS.PLAYER_LEFT, playerLeftHandler);
		socketManager.addMessageListener(EVENTS.START_GAME, handleStartGameResponse);
		socketManager.addMessageListener(EVENTS.GAME_STARTED, handleGameStartedResponse);

		return () => {
			socketManager.removeMessageListener(EVENTS.GET_ROOM_STATE, getRoomStateHandler);
			socketManager.removeMessageListener(EVENTS.PLAYER_JOINED, playerJoinedHandler);
			socketManager.removeMessageListener(EVENTS.LEAVE_ROOM, handleLeaveRoomResponse);
			socketManager.removeMessageListener(EVENTS.PLAYER_LEFT, playerLeftHandler);
			socketManager.removeMessageListener(EVENTS.START_GAME, handleStartGameResponse);
			socketManager.removeMessageListener(EVENTS.GAME_STARTED, handleGameStartedResponse);
		};
	});

	function handleStartGame() {
		startGame();
	}

	function handleToggleReady() {
		isReady = !isReady;
		console.log('Toggle ready:', isReady);
	}

	function handleLeaveRoom() {
		// Emit leave room event
		leaveRoom();
	}
</script>

{#if room && currentPlayerId}
	<div class="w-full space-y-6">
		<!-- Main Content Grid -->
		<div class="flex flex-col gap-4">
			<div class="flex w-full flex-wrap gap-4">
				<RoomInfo {room} />
				<PlayerList players={room.players} hostId={room.hostId} {currentPlayerId} />
			</div>

			<GameControls
				{isHost}
				{isReady}
				onStartGame={handleStartGame}
				onToggleReady={handleToggleReady}
				onLeaveRoom={handleLeaveRoom}
			/>
		</div>
	</div>
{:else}
	<!-- Loading or No Room State -->
	<div class="flex min-h-[50vh] items-center justify-center">
		<div class="text-center">
			<h2 class="mb-2 text-xl font-semibold text-white">Loading room...</h2>
			<p class="text-gray-400">Please wait while we fetch room information.</p>
		</div>
	</div>
{/if}
