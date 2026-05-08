<script lang="ts">
	import { onMount } from 'svelte';
	import { initAudioPort } from './audio/port';
	import WindowManager from './windows/WindowManager.svelte';
	import StatusBar from './components/StatusBar.svelte';
	import ToastContainer from './components/ToastContainer.svelte';
	import { registerBuiltinModules } from './modules/register-builtins';
	import { initHotkeyBinder } from './hotkeys/binder';
	import { hotkeyStore } from './hotkeys/store.svelte';
	import { maybeRunFirstRun } from './first-run/setup';

	onMount(async () => {
		initAudioPort();
		await registerBuiltinModules();
		await maybeRunFirstRun();
		await hotkeyStore.load();
		initHotkeyBinder();
	});
</script>

<div class="flex h-screen w-screen flex-col overflow-hidden bg-primary-950">
	<div class="relative flex-1 overflow-hidden">
		<WindowManager />
	</div>
	<StatusBar />
	<ToastContainer />
</div>
