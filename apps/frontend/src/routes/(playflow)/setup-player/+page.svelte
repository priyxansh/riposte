<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import * as Card from '$lib/components/ui/card';
	import SetupPlayerForm from '$lib/components/lobby/SetupPlayerForm.svelte';

	onMount(() => {
		const playerName = localStorage.getItem('playerName');
		const playerId = localStorage.getItem('playerId');

		if (playerId && playerName) {
			// If player is already set up, redirect to the lobby
			goto('/lobby');
		}
	});
</script>

<svelte:head>
	<title>Setup Player - Riposte</title>
</svelte:head>

<Card.Root
	class="mx-auto w-full max-w-md border-gray-700 bg-gray-800/80 shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:shadow-blue-900/20 sm:mr-auto"
>
	<Card.Header class="pb-6 text-center">
		<Card.Title class="text-2xl text-white">Welcome to Riposte</Card.Title>
		<Card.Description class="mt-2 text-gray-300">
			Please set up your player profile to continue
		</Card.Description>
	</Card.Header>

	<Card.Content>
		<SetupPlayerForm />
	</Card.Content>
</Card.Root>
