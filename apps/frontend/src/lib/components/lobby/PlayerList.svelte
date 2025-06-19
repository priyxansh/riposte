<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import { Crown, User } from 'lucide-svelte';
	import type { Player } from '../../../types/player';

	let {
		players = [],
		hostId,
		currentPlayerId
	}: {
		players: Player[];
		hostId: string;
		currentPlayerId?: string;
	} = $props();
</script>

<Card.Root class="border-gray-700 bg-gray-800/80 backdrop-blur-sm">
	<Card.Header>
		<Card.Title class="flex items-center gap-2 text-white">
			<User class="h-5 w-5" />
			Players ({players.length})
		</Card.Title>
		<Card.Description class="text-gray-300">Players in this room</Card.Description>
	</Card.Header>

	<Card.Content>
		<div class="space-y-3">
			{#each players as player (player.id)}
				<div
					class="flex items-center justify-between rounded-lg border border-gray-600/50 bg-gray-700/30 p-3 transition-colors hover:bg-gray-700/50"
				>
					<div class="flex items-center gap-3">
						<div
							class="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600/20 text-blue-400"
						>
							{#if player.id === hostId}
								<Crown class="h-5 w-5" />
							{:else}
								<User class="h-4 w-4" />
							{/if}
						</div>
						<div>
							<div class="flex items-center gap-2">
								<span class="font-medium text-white">
									Player {player.id.slice(0, 8)}
								</span>
								{#if player.id === currentPlayerId}
									<Badge
										variant="secondary"
										class="border-green-500/30 bg-green-500/20 text-xs text-green-300"
									>
										You
									</Badge>
								{/if}
							</div>
							{#if player.id === hostId}
								<p class="text-sm text-yellow-400">Host</p>
							{:else}
								<p class="text-sm text-gray-400">Member</p>
							{/if}
						</div>
					</div>

					<div class="flex items-center gap-2">
						<!-- Ready status indicator -->
						<div class="h-2 w-2 rounded-full bg-gray-500" title="Not ready"></div>
					</div>
				</div>
			{/each}

			{#if players.length === 0}
				<div class="flex flex-col items-center justify-center py-8 text-center">
					<User class="mb-3 h-12 w-12 text-gray-500" />
					<p class="text-gray-400">No players in room</p>
				</div>
			{/if}
		</div>
	</Card.Content>
</Card.Root>
