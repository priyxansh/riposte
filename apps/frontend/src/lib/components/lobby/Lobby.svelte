<script lang="ts">
	import { socketManager } from '$lib/stores/socket.svelte';
	import { goto } from '$app/navigation';
	import PlayerList from './PlayerList.svelte';
	import RoomInfo from './RoomInfo.svelte';
	import GameControls from './GameControls.svelte';

	// Get current player ID (this would typically come from auth/session)
	let currentPlayerId = $state(''); // TODO: Get from user session/auth

	// Reactive state from socket manager
	let room = $derived(socketManager.roomState);
	let isHost = $derived(room ? room.hostId === currentPlayerId : false);
	let isReady = $state(false);

	function handleStartGame() {
		console.log('Starting game...');
		// TODO: Emit start game event
	}

	function handleToggleReady() {
		isReady = !isReady;
		console.log('Toggle ready:', isReady);
		// TODO: Emit ready state change
	}

	function handleLeaveRoom() {
		console.log('Leaving room...');
		socketManager.clearRoomState();
		goto('/lobby');
		// TODO: Emit leave room event
	}
</script>

{#if room}
	<div class="mx-auto max-w-6xl space-y-6">
		<!-- Room Header -->
		<div class="text-center">
			<h1 class="mb-2 text-lg font-bold text-white sm:text-xl">
				{room.name}
			</h1>
			<p class="text-sm text-gray-300">Game Lobby</p>
		</div>

		<!-- Main Content Grid -->
		<div class="grid lg:grid-cols-2 gap-4">
			<div class="w-full">
				<RoomInfo {room} />
			</div>

			<div class="w-full">
				<PlayerList players={room.players} hostId={room.hostId} {currentPlayerId} />
			</div>

			<div class="w-full col-span-2">
				<div class="sticky top-6">
					<GameControls
						{isHost}
						{isReady}
						onStartGame={handleStartGame}
						onToggleReady={handleToggleReady}
						onLeaveRoom={handleLeaveRoom}
					/>
				</div>
			</div>
		</div>

		<!-- Mobile Layout Adjustments -->
		<div class="lg:hidden">
			<!-- Additional mobile-specific controls or info can go here -->
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
