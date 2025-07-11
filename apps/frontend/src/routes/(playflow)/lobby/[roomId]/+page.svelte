<script lang="ts">
	import Lobby from '$lib/components/lobby/Lobby.svelte';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { getRoomState as getRoomStateValue } from '$lib/stores/room.svelte';

	// Get room ID from route params
	let roomId = $derived(page.params.roomId);

	onMount(() => {
		const room = getRoomStateValue();
		if ((!room && roomId) || room?.id !== roomId) {
			goto(`/lobby`);
		}
	});
</script>

<svelte:head>
	<title>Lobby - Riposte</title>
</svelte:head>

<main class="flex min-h-screen w-full flex-wrap items-center justify-center p-4">
	<Lobby />
</main>
