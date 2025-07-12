<script lang="ts">
	import { goto } from '$app/navigation';
	import { getRoomState } from '$lib/stores/room.svelte';
	import { onMount } from 'svelte';
	import Player from './Player.svelte';
	import { gameLoopHandler } from '$lib/socket/handlers/broadcast/gameLoopHandler';
	import { socketManager } from '$lib/stores/socket.svelte';
	import { EVENTS } from '$lib/constants/events';
	import { getMoveListener } from '$lib/control-listeners/moveListener';

	const roomState = $derived(getRoomState());

	onMount(() => {
		if (!roomState) {
			goto('/lobby');
		}
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
		};
	});
</script>

{#if roomState}
	<main class="relative h-full w-full">
		{#each roomState.players as { id, name, state } (id)}
			<Player {id} {name} {state} />
		{/each}
	</main>
{/if}
