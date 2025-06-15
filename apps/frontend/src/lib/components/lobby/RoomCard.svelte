<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
</script>

<Card.Root
	class="mx-auto w-full max-w-sm border-gray-700 bg-gray-800/80 shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:shadow-blue-900/20"
>
	<Card.Header class="text-center">
		<Card.Title class="text-2xl text-white">Game Rooms</Card.Title>
		<Card.Description class="text-sm text-gray-300/80">
			Create a new room or join an existing one
		</Card.Description>
	</Card.Header>

	<Card.Content>
		<div class="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
			<Button
				href="/lobby/create-room"
				class="flex-1 bg-blue-600 text-white transition-transform duration-300 hover:scale-105 hover:bg-blue-700"
			>
				Create Room
			</Button>
			<Button
				variant="outline"
				href="/lobby/join-room"
				class="flex-1 border-gray-600 bg-gray-700/50 text-gray-100 transition-transform duration-300 hover:scale-105 hover:bg-gray-600"
			>
				Join Room
			</Button>
		</div>
	</Card.Content>
</Card.Root>
