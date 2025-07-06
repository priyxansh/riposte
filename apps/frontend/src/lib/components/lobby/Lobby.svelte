<script lang="ts">
	import { socketManager } from '$lib/stores/socket.svelte';
	import { goto } from '$app/navigation';
	import PlayerList from './PlayerList.svelte';
	import RoomInfo from './RoomInfo.svelte';
	import GameControls from './GameControls.svelte';
	import { onMount } from 'svelte';
	import { getRoomState } from '$lib/socket/emitters/getRoomState';
	import { EVENTS } from '$lib/constants/events';
	import { getRoomStateHandler } from '$lib/socket/handlers/getRoomStateHandler';

	let currentPlayerId = $state(''); // TODO: Get from user session/auth

	// Reactive state from socket manager
	let room = $derived(socketManager.roomState);
	let isHost = $derived(room ? room.hostId === currentPlayerId : false);
	let isReady = $state(false);

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

	// Handle room state updates
	$effect(() => {
		socketManager.addMessageListener(EVENTS.GET_ROOM_STATE, getRoomStateHandler);

		return () => {
			socketManager.removeMessageListener(EVENTS.GET_ROOM_STATE, getRoomStateHandler);
		};
	});

	// ToDo: Implement actual game start, ready toggle, and leave room logic
	function handleStartGame() {
		console.log('Starting game...');
	}

	function handleToggleReady() {
		isReady = !isReady;
		console.log('Toggle ready:', isReady);
	}

	function handleLeaveRoom() {
		console.log('Leaving room...');
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
