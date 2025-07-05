<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import { Hash, Users } from 'lucide-svelte';
	import type { Room } from '../../../types/room';

	let { room }: { room: Room } = $props();
</script>

<Card.Root class="border-gray-700 bg-gray-800/80 backdrop-blur-sm flex-grow">
	<Card.Header>
		<Card.Title class="flex items-center gap-2 text-white">
			<Hash class="h-5 w-5" />
			Room Information
		</Card.Title>
	</Card.Header>
	
	<Card.Content>
		<div class="space-y-4">
			<!-- Room Name -->
			<div class="flex items-center justify-between">
				<span class="text-sm font-medium text-gray-300">Room Name</span>
				<span class="text-white font-medium">{room.name}</span>
			</div>
			
			<!-- Room ID -->
			<div class="flex items-center justify-between">
				<span class="text-sm font-medium text-gray-300">Room ID</span>
				<div class="flex items-center gap-2">
					<code class="rounded bg-gray-700/50 px-2 py-1 text-sm text-blue-300 font-mono">
						{room.id}
					</code>
				</div>
			</div>
			
			<!-- Game Mode -->
			<div class="flex items-center justify-between">
				<span class="text-sm font-medium text-gray-300">Game Mode</span>
				<Badge variant="secondary" class="border-purple-500/30 bg-purple-500/20 text-purple-300">
					{room.mode}
				</Badge>
			</div>
			
			<!-- Player Count -->
			<div class="flex items-center justify-between">
				<span class="text-sm font-medium text-gray-300">Players</span>
				<div class="flex items-center gap-1 text-white">
					<Users class="h-4 w-4" />
					<span>{room.players.length}/{room.mode === '1v1' ? 2 : 4}</span>
				</div>
			</div>
		</div>
	</Card.Content>
</Card.Root>
