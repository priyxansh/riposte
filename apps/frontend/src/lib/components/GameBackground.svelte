<script lang="ts">
	let { blur1 = '150px', blur2 = '120px', opacity = '10', children } = $props();
</script>

<div
	class="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-4"
>
	<!-- Decorative elements -->
	<div class={`absolute inset-0 opacity-${opacity}`}>
		<div
			class="blur-shape absolute top-1/4 left-1/4 h-1/2 w-1/2 rounded-full bg-blue-500/20"
			style="filter: blur({blur1}); will-change: filter;"
		></div>
		<div
			class="blur-shape absolute right-1/3 bottom-1/3 h-1/3 w-1/3 rounded-full bg-purple-500/20"
			style="filter: blur({blur2}); will-change: filter;"
		></div>
	</div>

	<!-- Animated background grid -->
	<div class="absolute inset-0 opacity-30">
		<div
			class="absolute inset-0 animate-pulse bg-[linear-gradient(to_right,rgba(59,130,246,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(59,130,246,0.1)_1px,transparent_1px)] bg-[size:40px_40px]"
		></div>
		<div
			class="absolute inset-0 animate-pulse bg-[linear-gradient(to_right,rgba(147,51,234,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(147,51,234,0.05)_1px,transparent_1px)] bg-[size:80px_80px]"
			style="animation-delay: 1s;"
		></div>
	</div>

	<!-- Content -->
	<div class="relative z-10 w-full">
		{@render children()}
	</div>
</div>

<style>
	.blur-shape {
		opacity: 0;
		animation: fadeInBlur 1s ease-out forwards;
	}

	.blur-shape:nth-child(2) {
		animation-delay: 200ms;
	}

	@keyframes fadeInBlur {
		from {
			opacity: 0;
			transform: scale(0.95);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}
</style>
