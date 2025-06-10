<script>
	let { opacity = '10', blur1 = '150px', blur2 = '120px', children } = $props();
</script>

<div
	class="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-4"
>
	<!-- Decorative elements -->
	<div class={`absolute inset-0 opacity-${opacity}`}>
		<div
			class="absolute top-1/4 left-1/4 h-1/2 w-1/2 rounded-full bg-blue-500/30 blur-[{blur1}]"
		></div>
		<div
			class="absolute right-1/3 bottom-1/3 h-1/3 w-1/3 rounded-full bg-purple-500/30 blur-[{blur2}]"
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
