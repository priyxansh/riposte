<script lang="ts">
	import { onMount } from 'svelte';
	import type { Player } from '../../../types/player';

	const { id, name, state: playerState }: Player = $props();
	let isCurrentPlayer = $state<boolean | null>(null);

	onMount(() => {
		const currentPlayerId = localStorage.getItem('playerId');
		isCurrentPlayer = currentPlayerId === id;
	});
</script>

<div
	class={`player absolute aspect-square h-10 w-10 rounded-full  ${isCurrentPlayer ? 'bg-blue-400' : 'bg-red-400'} translate-x-[var(--transformX)] translate-y-[var(--transformY)] transition-transform duration-300 ease-in-out`}
	style="--transformX: {playerState?.x}px; --transformY: {playerState?.y}px;"
></div>
