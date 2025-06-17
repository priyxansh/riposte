<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { joinRoom } from '$lib/socket/emitters/joinRoom';
	import { joinRoomHandler } from '$lib/socket/handlers/joinRoomHandler';
	import { socketManager } from '$lib/stores/socket.svelte';
	import type { ResponsePayload } from '../../../types/event-payloads/payload-map';

	let roomId = $state('');
	let isSubmitting = $state(false);

	function handleSubmit() {
		if (isSubmitting || !roomId.trim()) return;

		isSubmitting = true;

		joinRoom({
			roomId: roomId.trim(),
			playerId: crypto.randomUUID()
		});
	}

	const onJoinRoomDone = ({ success, error }: ResponsePayload['join_room']) => {
		isSubmitting = false;

		if (success) {
			socketManager.roomState.roomId = roomId;

			goto(`/lobby/${roomId}`);
		} else {
			console.error('Failed to join room:', error);
		}
	};

	const handleJoinRoom = (payload: ResponsePayload['join_room']) => {
		joinRoomHandler(payload, onJoinRoomDone);
	};

	$effect(() => {
		socketManager.addMessageListener('join_room', handleJoinRoom);

		return () => {
			socketManager.removeMessageListener('join_room', handleJoinRoom);
		};
	});
</script>

<div class="space-y-6">
	<!-- Room ID Input -->
	<div class="space-y-2">
		<Label for="room-id" class="font-medium text-gray-200">Room ID</Label>
		<Input
			id="room-id"
			type="text"
			placeholder="Enter room ID..."
			bind:value={roomId}
			class="border-gray-600 bg-gray-700/50 text-white placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500/20"
		/>
	</div>

	<!-- Action Buttons -->
	<div class="flex flex-col space-y-3 pt-4 sm:flex-row sm:space-x-3 sm:space-y-0">
		<Button
			onclick={handleSubmit}
			disabled={isSubmitting}
			class="flex-1 bg-green-600 text-white transition-transform duration-300 hover:scale-105 hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
		>
			{isSubmitting ? 'Joining...' : 'Join Room'}
		</Button>
		<Button
			href="/lobby"
			variant="outline"
			disabled={isSubmitting}
			class="flex-1 border-gray-600 bg-gray-700/50 text-gray-100 transition-transform duration-300 hover:scale-105 hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
		>
			Cancel
		</Button>
	</div>
</div>
