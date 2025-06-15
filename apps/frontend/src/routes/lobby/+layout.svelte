<script lang="ts">
	import { onMount } from 'svelte';
	import { socketManager } from '$lib/stores/socket.svelte';
	import GameBackground from '$lib/components/lobby/GameBackground.svelte';
	import Header from '$lib/components/lobby/Header.svelte';

	onMount(() => {
		if (socketManager.connectionState !== 'connected') {
			socketManager.connect('ws://localhost:5000/ws');
		}
	});

	let { children } = $props();
</script>

<div class="dark">
	<GameBackground>
		<div class="w-full grid-cols-2 items-center gap-20 sm:grid">
			<Header />
			{@render children()}
		</div>
	</GameBackground>
</div>
