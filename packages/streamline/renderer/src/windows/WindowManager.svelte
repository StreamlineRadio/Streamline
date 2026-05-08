<script lang="ts">
	import { onMount } from 'svelte';
	import { instanceStore } from '../modules/instance-store.svelte';
	import { layoutStore } from '../layout/store.svelte';
	import { startLayoutPersistence } from '../layout/persistence.svelte';
	import { getModule } from '../modules/registry';
	import WindowWrapper from './WindowWrapper.svelte';

	// Must be at top-level for $effect to work
	startLayoutPersistence();

	onMount(async () => {
		const layouts = await window.streamline.api.layout.list();
		const stub = layouts.find((l) => l.isActive);
		if (stub) {
			const active = await window.streamline.api.layout.load(stub.id);
			if (active) {
				layoutStore.set(active);
				for (const inst of active.instances) {
					instanceStore.add(inst);
				}
			}
		}
	});
</script>

<div class="absolute inset-0 overflow-hidden">
	{#each [...instanceStore.all.values()] as { record } (record.id)}
		{@const manifest = getModule(record.moduleId)}
		{#if manifest?.kind === 'window' && manifest.ui}
			<WindowWrapper
				instanceId={record.id}
				moduleDisplayName={manifest.displayName}
				minWidth={manifest.minWidth}
				minHeight={manifest.minHeight}
			>
				<manifest.ui instanceId={record.id} />
			</WindowWrapper>
		{/if}
	{/each}
</div>
