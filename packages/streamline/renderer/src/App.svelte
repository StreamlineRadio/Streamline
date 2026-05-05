<script lang="ts">
	import { onMount } from 'svelte';
	import { initAudioPort } from './audio/port';
	import WindowManager from './windows/WindowManager.svelte';
	import { registerBuiltinModules } from './modules/register-builtins';

	onMount(async () => {
		initAudioPort();
		await registerBuiltinModules();
	});
</script>

<div class="relative h-screen w-screen overflow-hidden bg-primary-950">
	<WindowManager />
</div>
