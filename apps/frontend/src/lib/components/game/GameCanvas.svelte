<script lang="ts">
	import { goto } from '$app/navigation';
	import { getRoomState } from '$lib/stores/room.svelte';
	import { onMount } from 'svelte';
	import Player from './Player.svelte';
	import { gameLoopHandler } from '$lib/socket/handlers/broadcast/gameLoopHandler';
	import { socketManager } from '$lib/stores/socket.svelte';
	import { EVENTS } from '$lib/constants/events';

	const roomState = $derived(getRoomState());

	onMount(() => {
		if (!roomState) {
			goto('/lobby');
		}
	});

	$effect(() => {
		console.log({ roomState });

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
