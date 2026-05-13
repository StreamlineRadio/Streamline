<script lang="ts">
	import { onMount } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
	import {
		faPlus,
		faPlay,
		faStop,
		faGear,
		faTrashCan,
		faSatelliteDish,
		faFloppyDisk,
		faTriangleExclamation,
		faTowerBroadcast,
		faGripVertical
	} from '@fortawesome/free-solid-svg-icons';
	import type { EncoderConfig, EncoderStatus } from '@streamline/shared';
	import IconButton from '../../components/IconButton.svelte';
	import EncoderModal from './EncoderModal.svelte';

	interface Props {
		instanceId: string;
	}
	const { instanceId }: Props = $props();

	const orderSettingKey = $derived(`encoders.order.${instanceId}`);

	let configs = $state<EncoderConfig[]>([]);
	const statuses = new SvelteMap<string, EncoderStatus>();
	let showModal = $state(false);
	let editingConfig = $state<EncoderConfig | undefined>(undefined);

	function applyStoredOrder(loaded: EncoderConfig[], orderJson: string | null): EncoderConfig[] {
		if (!orderJson) return loaded;
		try {
			const parsed = JSON.parse(orderJson);
			if (!Array.isArray(parsed)) return loaded;
			const orderMap = new Map<string, number>(
				parsed.filter((id): id is string => typeof id === 'string').map((id, i) => [id, i])
			);
			return [...loaded].sort((a, b) => {
				const ai = orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER;
				const bi = orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER;
				return ai - bi;
			});
		} catch {
			return loaded;
		}
	}

	async function persistOrder(orderedConfigs: EncoderConfig[]) {
		const orderJson = JSON.stringify(orderedConfigs.map((c) => c.id));
		try {
			await window.streamline.api.settings.set(orderSettingKey, orderJson);
		} catch (error) {
			console.error('Failed to persist encoder order:', error);
		}
	}

	async function reloadConfigs() {
		const [loaded, orderJson] = await Promise.all([
			window.streamline.api.encoder.listConfigs(),
			window.streamline.api.settings.get(orderSettingKey)
		]);
		configs = applyStoredOrder(loaded, orderJson);
	}

	onMount(async () => {
		await reloadConfigs();
		window.streamline.onEncoderStatus((id, rawStatus) => {
			statuses.set(id, rawStatus as EncoderStatus);
		});
	});

	async function saveConfig(config: EncoderConfig) {
		try {
			await window.streamline.api.encoder.saveConfig(config);
			await reloadConfigs();
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
			await persistOrder(configs);
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
				await window.streamline.api.encoder.start($state.snapshot(config));
			}
		} catch (error) {
			console.error('Failed to toggle encoder streaming:', error);
		}
	}

	function formatDuration(seconds: number): string {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = Math.floor(seconds % 60);
		return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
	}

	function formatBytes(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
		return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
	}

	function destinationTitle(config: EncoderConfig): string {
		if (config.type === 'file') return config.pathTemplate;
		return `${config.host}:${config.port}${config.mount}`;
	}

	const activeCount = $derived(
		Array.from(statuses.values()).filter(
			(s) => s.status === 'streaming' || s.status === 'connecting'
		).length
	);

	let dragIndex = $state<number | null>(null);
	let dragOverIndex = $state<number | null>(null);

	function handleDragStart(event: DragEvent, index: number) {
		dragIndex = index;
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move';
			event.dataTransfer.setData('text/plain', configs[index].id);
		}
	}

	function handleDragOver(event: DragEvent, index: number) {
		if (dragIndex === null) return;
		event.preventDefault();
		if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
		if (dragOverIndex !== index) dragOverIndex = index;
	}

	function handleDrop(event: DragEvent, targetIndex: number) {
		event.preventDefault();
		const source = dragIndex;
		dragIndex = null;
		dragOverIndex = null;
		if (source === null || source === targetIndex) return;
		const next = [...configs];
		const [moved] = next.splice(source, 1);
		next.splice(targetIndex, 0, moved);
		configs = next;
		persistOrder(next);
	}

	function handleDragEnd() {
		dragIndex = null;
		dragOverIndex = null;
	}
</script>

<div
	data-instance-id={instanceId}
	class="relative flex h-full flex-col overflow-hidden bg-primary-950 text-primary-100 select-none"
>
	<!-- Top accent bar — slides in when at least one output is live -->
	<div
		class="absolute inset-x-0 top-0 z-10 h-0.5 origin-left bg-success-500 transition-transform duration-300"
		style="transform: scaleX({activeCount > 0 ? 1 : 0})"
	></div>

	<!-- Toolbar -->
	<div class="flex shrink-0 items-center justify-between border-b border-primary-800 px-2 py-2">
		<div class="flex items-center gap-2 px-1">
			<FontAwesomeIcon icon={faTowerBroadcast} class="text-primary-500" />
			<span class="text-[0.65rem] font-bold tracking-[0.22em] text-primary-400 uppercase">
				Outputs
			</span>
			{#if activeCount > 0}
				<span
					class="rounded-full border border-success-700 bg-success-900 px-1.5 py-0.5 text-[0.55rem] font-bold tracking-[0.18em] text-success-300 uppercase"
				>
					{activeCount} live
				</span>
			{/if}
		</div>
		<IconButton
			icon={faPlus}
			title="Add encoder"
			onclick={() => {
				editingConfig = undefined;
				showModal = true;
			}}
		/>
	</div>

	<!-- Encoder cards -->
	<div class="min-h-0 flex-1 overflow-y-auto p-2">
		{#each configs as config, index (config.id)}
			{@const status = statuses.get(config.id) ?? { status: 'idle' }}
			{@const isStreaming = status.status === 'streaming'}
			{@const isConnecting = status.status === 'connecting'}
			{@const isError = status.status === 'error'}
			{@const isActive = isStreaming || isConnecting}
			{@const isDragSource = dragIndex === index}
			{@const isDragTarget = dragOverIndex === index && dragIndex !== null && dragIndex !== index}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				ondragover={(event) => handleDragOver(event, index)}
				ondrop={(event) => handleDrop(event, index)}
				title={destinationTitle(config)}
				class={[
					'group relative mb-1.5 flex items-center gap-2 overflow-hidden rounded border bg-primary-900 p-1.5 transition-colors',
					isStreaming
						? 'border-success-700 hover:border-success-600'
						: isConnecting
							? 'border-warning-700 hover:border-warning-600'
							: isError
								? 'border-danger-700 hover:border-danger-600'
								: 'border-primary-700 hover:border-primary-600',
					isDragSource && 'opacity-40',
					isDragTarget && 'border-secondary-500 ring-1 ring-secondary-500/30'
				]}
			>
				<!-- Left accent bar when active -->
				{#if isActive}
					<div
						class={[
							'absolute inset-y-0 left-0 w-0.5',
							isStreaming ? 'bg-success-500' : 'bg-warning-500'
						]}
					></div>
				{/if}

				<!-- Drag handle (the only drag source): grip on hover, type icon at rest -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					draggable="true"
					ondragstart={(event) => handleDragStart(event, index)}
					ondragend={handleDragEnd}
					aria-label="Drag to reorder"
					class={[
						'drag-handle flex h-8 w-6 shrink-0 cursor-grab items-center justify-center text-sm transition-colors active:cursor-grabbing',
						isStreaming ? 'text-success-400' : 'text-primary-500 hover:text-primary-300'
					]}
				>
					<span class="drag-handle__type">
						<FontAwesomeIcon icon={config.type === 'file' ? faFloppyDisk : faSatelliteDish} />
					</span>
					<span class="drag-handle__grip">
						<FontAwesomeIcon icon={faGripVertical} />
					</span>
				</div>

				<!-- Main info column -->
				<div class="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
					<div class="flex items-center gap-2">
						<!-- Tally light -->
						<span
							class={[
								'h-1.5 w-1.5 shrink-0 rounded-full transition-shadow',
								isStreaming
									? 'tally-pulse bg-success-400 shadow-[0_0_6px_var(--color-success-500)]'
									: isConnecting
										? 'bg-warning-400 shadow-[0_0_6px_var(--color-warning-500)]'
										: isError
											? 'bg-danger-400 shadow-[0_0_6px_var(--color-danger-500)]'
											: 'bg-primary-700'
							]}
						></span>
						<span class="truncate text-sm leading-snug font-semibold">{config.name}</span>
					</div>
					<div class="truncate font-mono text-[0.6rem] tracking-wide text-primary-500 uppercase">
						<span class="text-secondary-400">{config.type}</span>
						<span class="text-primary-700">·</span>
						<span>{config.format.toUpperCase()} {config.bitrateKbps}k</span>
						<span class="text-primary-700">·</span>
						<span>{config.sampleRate / 1000} kHz</span>
						<span class="text-primary-700">·</span>
						<span>{config.channels === 1 ? 'Mono' : 'Stereo'}</span>
					</div>

					{#if isStreaming}
						<div
							class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[0.6rem] tracking-wide text-primary-400 uppercase tabular-nums"
						>
							<span class="flex items-center gap-1">
								<span class="text-primary-600">Time</span>
								<span class="text-primary-100">{formatDuration(status.secondsEncoded)}</span>
							</span>
							<span class="text-primary-700">|</span>
							<span class="flex items-center gap-1">
								<span class="text-primary-600">Data</span>
								<span class="text-primary-100">{formatBytes(status.bytesEncoded)}</span>
							</span>
							<span class="text-primary-700">|</span>
							<span class="flex items-center gap-1">
								<span class="text-primary-600">Rate</span>
								<span class="text-primary-100">{Math.round(status.currentBitrate)}k</span>
							</span>
							{#if status.listeners !== undefined}
								<span class="text-primary-700">|</span>
								<span class="flex items-center gap-1">
									<span class="text-primary-600">Listeners</span>
									<span class="text-primary-100">{status.listeners}</span>
								</span>
							{/if}
						</div>
					{/if}

					{#if isConnecting}
						<div class="mt-1 font-mono text-[0.6rem] tracking-[0.22em] text-warning-400 uppercase">
							<span class="connecting-dots">Connecting</span>
						</div>
					{/if}

					{#if isError}
						<div
							class="mt-1 flex items-center gap-1 text-[0.6rem] tracking-wide text-danger-400 uppercase"
						>
							<FontAwesomeIcon icon={faTriangleExclamation} />
							<span class="truncate">{status.error}</span>
						</div>
					{/if}
				</div>

				<!-- Actions -->
				<div class="flex shrink-0 items-center gap-1">
					<IconButton
						icon={isActive ? faStop : faPlay}
						title={isActive ? 'Stop streaming' : 'Start streaming'}
						onclick={() => toggleStreaming(config)}
						active={isActive}
						activeVariant={isStreaming ? 'danger' : 'secondary'}
						size="sm"
					/>
					<IconButton
						icon={faGear}
						title="Edit encoder"
						onclick={() => {
							editingConfig = config;
							showModal = true;
						}}
						size="sm"
					/>
					<IconButton
						icon={faTrashCan}
						title="Delete encoder"
						onclick={() => deleteConfig(config.id)}
						destructive
						size="sm"
					/>
				</div>
			</div>
		{:else}
			<div class="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
				<div class="text-4xl text-primary-700">
					<FontAwesomeIcon icon={faSatelliteDish} />
				</div>
				<div class="text-sm font-medium text-primary-400">No outputs yet</div>
				<div class="text-xs text-primary-600">
					Add an Icecast, Shoutcast, or file output to start broadcasting.
				</div>
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

<style>
	.drag-handle {
		display: grid;
		place-items: center;
	}
	.drag-handle__type,
	.drag-handle__grip {
		grid-area: 1 / 1;
		transition: opacity 120ms ease;
	}
	.drag-handle__grip {
		opacity: 0;
	}
	.drag-handle:hover .drag-handle__type {
		opacity: 0;
	}
	.drag-handle:hover .drag-handle__grip {
		opacity: 1;
	}

	.tally-pulse {
		animation: tally-pulse 1.2s ease-in-out infinite;
	}
	@keyframes tally-pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.55;
		}
	}

	.connecting-dots::after {
		content: '';
		display: inline-block;
		width: 1.4em;
		text-align: left;
		animation: connecting-dots 1.2s steps(4, end) infinite;
	}
	@keyframes connecting-dots {
		0% {
			content: '';
		}
		25% {
			content: '.';
		}
		50% {
			content: '..';
		}
		75% {
			content: '...';
		}
	}
</style>
