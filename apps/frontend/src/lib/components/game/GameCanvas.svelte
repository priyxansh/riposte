<script lang="ts">
	import { goto } from '$app/navigation';
	import { getRoomState } from '$lib/stores/room.svelte';
	import { onMount } from 'svelte';
	import { gameLoopHandler } from '$lib/socket/handlers/broadcast/gameLoopHandler';
	import { socketManager } from '$lib/stores/socket.svelte';
	import { EVENTS } from '$lib/constants/events';
	import { getMoveListener } from '$lib/control-listeners/moveListener';
	import { resetPrediction } from '$lib/prediction/prediction';
	import { launchGame, destroyGame } from '$lib/game/game';
	import DevMenu from '$lib/components/game/DevMenu.svelte';

	const GAME_CONTAINER_ID = 'phaser-game-container';

	const roomState = $derived(getRoomState());

	onMount(() => {
		if (!roomState) {
			goto('/lobby');
			return;
		}

		// Launch Phaser game
		console.log('[GameCanvas] Launching Phaser game...');
		launchGame(GAME_CONTAINER_ID);

		return () => {
			// Cleanup Phaser on unmount
			console.log('[GameCanvas] Destroying Phaser game...');
			destroyGame();
		};
	});

	const pressedListener = getMoveListener('pressed');
	const releasedListener = getMoveListener('released');

	onMount(() => {
		if (window) {
			window.addEventListener('keydown', pressedListener);
			window.addEventListener('keyup', releasedListener);
		}

		return () => {
			if (window) {
				window.removeEventListener('keydown', pressedListener);
				window.removeEventListener('keyup', releasedListener);
			}
		};
	});

	$effect(() => {
		socketManager.addMessageListener(EVENTS.GAME_LOOP, gameLoopHandler);

		return () => {
			socketManager.removeMessageListener(EVENTS.GAME_LOOP, gameLoopHandler);
			resetPrediction(); // Clear input buffer when leaving game
		};
	});
</script>

{#if roomState}
	<main class="relative h-full w-full bg-gray-900">
		<!-- Phaser renders into this container -->
		<div id={GAME_CONTAINER_ID} class="w-full h-full"></div>

		{#if import.meta.env.DEV}
			<DevMenu />
		{/if}
	</main>
{/if}

