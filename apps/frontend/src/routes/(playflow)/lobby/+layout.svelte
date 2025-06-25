<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let { children } = $props();

	onMount(() => {
		const playerName = localStorage.getItem('playerName');

		if (!playerName) {
			goto('/setup-player');
		}
	});
</script>

{@render children()}
