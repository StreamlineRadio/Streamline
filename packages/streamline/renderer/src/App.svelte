<script lang="ts">
	import { onMount } from 'svelte';
	import { initAudioPort } from './audio/port';

	onMount(() => {
		initAudioPort();
	});
</script>

<main class="flex h-screen items-center justify-center bg-primary-950 text-primary-100">
	<h1 class="text-4xl font-bold">Streamline</h1>
</main>
