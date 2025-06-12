<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select';
	import { Label } from '$lib/components/ui/label';
	import { Separator } from '$lib/components/ui/separator';

	let { onSubmit, onCancel } = $props();

	let roomName = $state('');
	let selectedMode = $state({ value: '1v1', label: '1v1 - Duel' });

	const gameModes = [
		{ value: '1v1', label: '1v1 - Duel' },
		{ value: '2v2', label: '2v2 - Team Match' }
	];

	function handleSubmit() {
		if (!roomName.trim()) {
			// TODO: Add proper validation/error handling
			return;
		}

		onSubmit({
			name: roomName,
			mode: selectedMode.value
		});
	}

	function handleCancel() {
		onCancel();
	}
</script>

<div class="space-y-6">
	<!-- Room Name Input -->
	<div class="space-y-2">
		<Label for="room-name" class="font-medium text-gray-200">Room Name</Label>
		<Input
			id="room-name"
			type="text"
			placeholder="Enter room name..."
			bind:value={roomName}
			class="border-gray-600 bg-gray-700/50 text-white placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500/20"
			maxlength={30}
		/>
	</div>

	<Separator class="bg-gray-600" />

	<!-- Game Mode Select -->
	<div class="space-y-2">
		<Label class="font-medium text-gray-200">Game Mode</Label>
		<Select.Root
			type="single"
			value={selectedMode.value}
			onValueChange={(value) => {
				selectedMode = gameModes.find((mode) => mode.value === value) || selectedMode;
			}}
		>
			<Select.Trigger class="w-full">
				<span>{selectedMode.label}</span>
			</Select.Trigger>
			<Select.Content class="border-gray-700 bg-gray-800 text-white">
				<Select.Item value="1v1">1v1 - Duel</Select.Item>
				<Select.Item value="2v2">2v2 - Team Match</Select.Item>
			</Select.Content>
		</Select.Root>
	</div>

	<!-- Action Buttons -->
	<div class="flex flex-col space-y-3 pt-4 sm:flex-row sm:space-y-0 sm:space-x-3">
		<Button
			onclick={handleSubmit}
			disabled={!roomName.trim()}
			class="flex-1 bg-blue-600 text-white transition-transform duration-300 hover:scale-105 hover:bg-blue-700 disabled:opacity-50 disabled:hover:scale-100"
		>
			Create Room
		</Button>
		<Button
			variant="outline"
			onclick={handleCancel}
			class="flex-1 border-gray-600 bg-gray-700/50 text-gray-100 transition-transform duration-300 hover:scale-105 hover:bg-gray-600"
		>
			Cancel
		</Button>
	</div>
</div>
