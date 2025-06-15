<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import JoinRoomForm from './JoinRoomForm.svelte';
</script>

<Card.Root
	class="mx-auto max-w-lg border-gray-700 bg-gray-800/80 shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:shadow-blue-900/20 sm:mr-auto"
>
	<Card.Header class="pb-6 text-center">
		<Card.Title class="text-2xl text-white">Join Room</Card.Title>
		<Card.Description class="mt-2 text-gray-300">
			Enter a room ID to join an existing room
		</Card.Description>
	</Card.Header>

	<Card.Content>
		<JoinRoomForm />
	</Card.Content>
</Card.Root>
