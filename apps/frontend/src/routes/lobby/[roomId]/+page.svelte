<script lang="ts">
	import Lobby from '$lib/components/lobby/Lobby.svelte';
	import { socketManager } from '$lib/stores/socket.svelte';

	// Get room ID from route params
	// let roomId = $derived($page.params.roomId);

	// onMount(() => {
	// 	// If we don't have room state, we might need to join the room
	// 	// This could happen if user navigates directly to lobby URL
	// 	if (!socketManager.roomState && roomId) {
	// 		console.log('No room state found, might need to join room:', roomId);
	// 		// TODO: Implement auto-join logic or redirect to join page
	// 	}
	// });
</script>

<svelte:head>
	<title>Lobby - {''} - Riposte</title>
</svelte:head>

<main class="flex min-h-screen w-full items-center flex-wrap justify-center p-4">
	<Lobby />
</main>
