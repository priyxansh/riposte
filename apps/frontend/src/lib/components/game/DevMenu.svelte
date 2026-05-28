<script lang="ts">
	import { getRoomState } from '$lib/stores/room.svelte';
	import { setBotBehavior } from '$lib/socket/emitters/setBotBehavior';
	import type { BotBehavior } from '$lib/socket/emitters/addBot';

	const BEHAVIORS: { label: string; value: BotBehavior }[] = [
		{ label: 'Idle', value: 'idle' },
		{ label: 'Attack Spam', value: 'attack_spam' },
		{ label: 'Block', value: 'block' },
		{ label: 'Auto Parry', value: 'auto_parry' }
	];

	let activeBehavior = $state<BotBehavior>('idle');

	const roomState = $derived(getRoomState());
	const bot = $derived(roomState?.players.find((p) => p.isBot) ?? null);

	function handleSetBehavior(behavior: BotBehavior) {
		if (!bot) return;
		activeBehavior = behavior;
		setBotBehavior(bot.id, behavior);
	}
</script>

{#if bot}
	<div
		class="dev-menu"
		role="region"
		aria-label="Bot Dev Menu"
	>
		<p class="dev-menu__label">Dev — Bot: {bot.name}</p>
		<div class="dev-menu__buttons">
			{#each BEHAVIORS as { label, value }}
				<button
					type="button"
					class="dev-menu__btn"
					class:dev-menu__btn--active={activeBehavior === value}
					onclick={() => handleSetBehavior(value)}
				>
					{label}
				</button>
			{/each}
		</div>
	</div>
{/if}

<style>
	.dev-menu {
		position: fixed;
		top: 12px;
		right: 12px;
		z-index: 9999;
		display: flex;
		flex-direction: column;
		gap: 8px;
		background: rgba(0, 0, 0, 0.75);
		border: 1px solid rgba(234, 179, 8, 0.35);
		border-radius: 6px;
		padding: 10px 12px;
		backdrop-filter: blur(6px);
		min-width: 160px;
	}

	.dev-menu__label {
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.04em;
		color: rgba(234, 179, 8, 0.7);
		text-transform: uppercase;
		margin: 0 0 4px;
	}

	.dev-menu__buttons {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.dev-menu__btn {
		padding: 5px 10px;
		font-size: 12px;
		border-radius: 4px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(255, 255, 255, 0.05);
		color: rgba(255, 255, 255, 0.7);
		cursor: pointer;
		text-align: left;
		transition: background 0.15s, color 0.15s;
	}

	.dev-menu__btn:hover {
		background: rgba(255, 255, 255, 0.12);
		color: #fff;
	}

	.dev-menu__btn--active {
		background: rgba(234, 179, 8, 0.2);
		border-color: rgba(234, 179, 8, 0.5);
		color: rgb(253, 224, 71);
	}
</style>
