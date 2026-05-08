<script lang="ts">
	import { onMount } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import type { EncoderConfig, EncoderStatus } from '@streamline/shared';
	import EncoderModal from './EncoderModal.svelte';

	interface Props {
		instanceId: string;
	}
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { instanceId }: Props = $props();

	let configs = $state<EncoderConfig[]>([]);
	const statuses = new SvelteMap<string, EncoderStatus>();
	let showModal = $state(false);
	let editingConfig = $state<EncoderConfig | undefined>(undefined);

	onMount(async () => {
		configs = await window.streamline.api.encoder.listConfigs();
		window.streamline.onEncoderStatus((id, rawStatus) => {
			statuses.set(id, rawStatus as EncoderStatus);
		});
	});

	async function saveConfig(config: EncoderConfig) {
		try {
			await window.streamline.api.encoder.saveConfig(config);
			configs = await window.streamline.api.encoder.listConfigs();
			showModal = false;
			editingConfig = undefined;
		} catch (error) {
			console.error('Failed to save encoder config:', error);
		}
	}

	async function deleteConfig(encoderId: string) {
		const encoderConfig = configs.find((c) => c.id === encoderId);
		try {
			await window.streamline.api.encoder.stop(encoderId);
			if (encoderConfig && 'passwordRef' in encoderConfig && encoderConfig.passwordRef) {
				await window.streamline.api.secret.delete(encoderConfig.passwordRef);
			}
			await window.streamline.api.encoder.deleteConfig(encoderId);
			configs = configs.filter((c) => c.id !== encoderId);
		} catch (error) {
			console.error('Failed to delete encoder:', error);
		}
	}

	async function toggleStreaming(config: EncoderConfig) {
		const status = statuses.get(config.id);
		try {
			if (status?.status === 'streaming' || status?.status === 'connecting') {
				await window.streamline.api.encoder.stop(config.id);
			} else {
				await window.streamline.api.encoder.start(config);
			}
		} catch (error) {
			console.error('Failed to toggle encoder streaming:', error);
		}
	}

	function formatStatus(id: string): string {
		const status = statuses.get(id);
		if (!status) return 'Idle';
		if (status.status === 'streaming') {
			return `Streaming • ${Math.floor(status.secondsEncoded)}s • ${(status.bytesEncoded / 1024 / 1024).toFixed(1)} MB`;
		}
		return status.status.charAt(0).toUpperCase() + status.status.slice(1);
	}
</script>

<div class="flex h-full flex-col">
	<!-- Header -->
	<div class="flex items-center gap-2 border-b border-primary-700 p-2">
		<button
			onclick={() => {
				editingConfig = undefined;
				showModal = true;
			}}
			class="rounded bg-secondary-700 px-3 py-1 text-sm hover:bg-secondary-600"
			>+ Add Encoder</button
		>
	</div>

	<!-- Encoder rows -->
	<div class="flex-1 overflow-y-auto">
		{#each configs as config (config.id)}
			{@const status = statuses.get(config.id)}
			{@const isActive = status?.status === 'streaming' || status?.status === 'connecting'}
			<div class="flex items-center gap-2 border-b border-primary-800 px-3 py-2 text-sm">
				<!-- On-air dot -->
				<div
					class="h-2 w-2 flex-shrink-0 rounded-full"
					class:bg-success-500={isActive}
					class:bg-primary-600={!isActive}
				></div>
				<div class="flex-1 overflow-hidden">
					<div class="truncate font-medium">{config.name}</div>
					<div class="truncate text-xs text-primary-400">
						{config.format.toUpperCase()} • {formatStatus(config.id)}
					</div>
				</div>
				<button
					onclick={() => toggleStreaming(config)}
					class="rounded px-2 py-1 text-xs transition-colors"
					class:bg-danger-700={isActive}
					class:hover:bg-danger-600={isActive}
					class:bg-success-700={!isActive}
					class:hover:bg-success-600={!isActive}>{isActive ? 'Stop' : 'Start'}</button
				>
				<button
					onclick={() => {
						editingConfig = config;
						showModal = true;
					}}
					class="rounded bg-primary-700 px-2 py-1 text-xs hover:bg-primary-600">Edit</button
				>
				<button
					onclick={() => deleteConfig(config.id)}
					class="rounded px-2 py-1 text-xs text-danger-400 hover:text-danger-300">✕</button
				>
			</div>
		{:else}
			<div class="flex h-full items-center justify-center text-sm text-primary-500">
				No encoders configured
			</div>
		{/each}
	</div>
</div>

{#if showModal}
	<EncoderModal
		config={editingConfig}
		onSave={saveConfig}
		onCancel={() => {
			showModal = false;
			editingConfig = undefined;
		}}
	/>
{/if}
