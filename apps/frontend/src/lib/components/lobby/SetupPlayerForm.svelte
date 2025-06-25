<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';

	let playerName = $state('');
	let isSubmitting = $state(false);

	function handleSubmit() {
		if (isSubmitting || !playerName.trim()) return;

		isSubmitting = true;
		
		try {
			localStorage.setItem('playerName', playerName.trim());
			goto('/lobby');
		} catch (error) {
			console.error('Failed to save player name:', error);
		} finally {
			isSubmitting = false;
		}
	}
</script>

<form
	onsubmit={(e) => {
		e.preventDefault();
		handleSubmit();
	}}
	class="space-y-6"
>
	<div class="space-y-2">
		<Label for="player-name" class="font-medium text-gray-200">Enter Your Name</Label>
		<Input
			id="player-name"
			type="text"
			placeholder="e.g., PlayerOne"
			bind:value={playerName}
			class="border-gray-600 bg-gray-700/50 text-white placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500/20"
			maxlength={20}
			required
		/>
	</div>

	<Button
		type="submit"
		disabled={isSubmitting || !playerName.trim()}
		class="w-full bg-blue-600 text-white transition-transform duration-300 hover:scale-105 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
	>
		{isSubmitting ? 'Saving...' : 'Continue'}
	</Button>
</form>
