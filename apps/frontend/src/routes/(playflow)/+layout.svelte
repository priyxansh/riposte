<script lang="ts">
	import GameBackground from '$lib/components/lobby/GameBackground.svelte';
	import Header from '$lib/components/lobby/Header.svelte';

	let { children } = $props();
</script>

<GameBackground>
	<div class="w-full items-center gap-20 sm:flex">
		<Header />
		{@render children()}
	</div>
</GameBackground>
