<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let { children } = $props();

	onMount(() => {
		if (!browser) return; // Ensure this runs only in the browser

		const playerName = localStorage.getItem('playerName');
		const playerId = localStorage.getItem('playerId');

		if (!playerName || !playerId) {
			goto('/setup-player');
		}
	});
</script>

{@render children()}
