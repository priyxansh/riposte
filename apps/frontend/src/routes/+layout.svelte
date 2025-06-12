<script lang="ts">
	import { onMount } from 'svelte';
	import '../app.css';
	import { socketManager } from '$lib/stores/socket.svelte';

	onMount(() => {
		if (socketManager.connectionState !== 'connected') {
			socketManager.connect('ws://localhost:5000/ws');
		}
	});

	let { children } = $props();
</script>

<div class="dark">
	{@render children()}
</div>
