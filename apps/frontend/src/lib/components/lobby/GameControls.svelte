<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Play, Check, LogOut } from 'lucide-svelte';

	let {
		isHost = false,
		isReady = false,
		onStartGame = () => {},
		onToggleReady = () => {},
		onLeaveRoom = () => {}
	}: {
		isHost: boolean;
		isReady: boolean;
		onStartGame: () => void;
		onToggleReady: () => void;
		onLeaveRoom: () => void;
	} = $props();
</script>

<div class="flex flex-wrap gap-4 space-y-4 px-4">
	{#if isHost}
		<!-- Host Controls -->
		<Button
			onclick={onStartGame}
			class="flex-grow bg-green-600 text-white transition-transform duration-300 hover:scale-105 hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
		>
			<Play class="mr-2 h-4 w-4" />
			Start Game
		</Button>
	{:else}
		<!-- Player Controls -->
		<Button
			onclick={onToggleReady}
			class={`flex-grow transition-transform duration-300 hover:scale-105 ${
				isReady
					? 'bg-green-600 text-white hover:bg-green-700'
					: 'bg-blue-600 text-white hover:bg-blue-700'
			}`}
		>
			<Check class="mr-2 h-4 w-4" />
			{isReady ? 'Ready!' : 'Ready Up'}
		</Button>
	{/if}

	<!-- Leave Room Button -->
	<Button
		onclick={onLeaveRoom}
		variant="outline"
		class="flex-grow border-red-600/50 bg-red-600/10 text-red-400 transition-transform duration-300 hover:scale-105 hover:border-red-500 hover:bg-red-600/20"
	>
		<LogOut class="mr-2 h-4 w-4" />
		Leave Room
	</Button>
</div>
