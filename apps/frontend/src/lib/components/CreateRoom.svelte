<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import CreateRoomForm from './CreateRoomForm.svelte';

	function handleCreateRoom(roomData: { name: string; mode: string }) {
		console.log('Creating room:', roomData);
		
		// TODO: Implement room creation logic
		// Navigate to room or show success message
	}

	function handleCancel() {
		// Navigate back to home page
		window.history.back();
	}
</script>

<Card.Root
	class="max-w-lg border-gray-700 bg-gray-800/80 shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:shadow-blue-900/20 sm:mr-auto"
>
	<Card.Header class="pb-6 text-center">
		<Card.Title class="text-2xl text-white">Create New Room</Card.Title>
		<Card.Description class="mt-2 text-gray-300">
			Set up your game room and invite others to join
		</Card.Description>
	</Card.Header>

	<Card.Content>
		<CreateRoomForm onSubmit={handleCreateRoom} onCancel={handleCancel} />
	</Card.Content>
</Card.Root>
