<script lang="ts">
	import Lobby from '$lib/components/lobby/Lobby.svelte';
	import { socketManager } from '$lib/stores/socket.svelte';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	// Get room ID from route params
	let roomId = $derived(page.params.roomId);

	console.log('Lobby page loaded with roomId:', page.params.roomId);

	onMount(() => {
		if ((!socketManager.roomState && roomId) || socketManager.roomState?.id !== roomId) {
			goto(`/lobby`);
		}
	});
</script>

<svelte:head>
	<title>Lobby - {''} - Riposte</title>
</svelte:head>

<main class="flex min-h-screen w-full flex-wrap items-center justify-center p-4">
	<Lobby />
</main>
