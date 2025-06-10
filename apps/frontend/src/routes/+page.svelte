<script>
	import RoomCard from '$lib/components/RoomCard.svelte';
	import GameBackground from '$lib/components/GameBackground.svelte';
	import { Badge } from '$lib/components/ui/badge';
</script>

<GameBackground>
	{#snippet children()}
		<!-- Header section at the top -->
		<header class="flex flex-col items-center pt-16 pb-8">
			<Badge variant="secondary" class="mb-4 border-blue-500/30 bg-blue-500/20 text-blue-300">
				Prototype
			</Badge>
			<h1
				class="mb-2 bg-gradient-to-b from-white to-gray-300 bg-clip-text text-5xl font-bold tracking-tight text-transparent md:text-6xl"
			>
				Riposte
			</h1>
			<p class="text-center text-base font-medium text-blue-300/90 sm:text-xl">
				Your stagger is their opportunity.
			</p>
		</header>

		<!-- Main content centered -->
		<main class="flex w-full flex-1 items-center justify-center px-4">
			<RoomCard />
		</main>
	{/snippet}
</GameBackground>
