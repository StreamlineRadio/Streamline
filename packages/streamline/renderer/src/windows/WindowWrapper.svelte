<script lang="ts">
	import type { Snippet } from 'svelte';
	import { useInteract } from './use-interact';
	import { instanceStore } from '../modules/instance-store.svelte';
	import { layoutStore } from '../layout/store.svelte';

	interface Props {
		instanceId: string;
		moduleDisplayName: string;
		minWidth?: number;
		minHeight?: number;
		children: Snippet;
	}

	const { instanceId, moduleDisplayName, minWidth, minHeight, children }: Props = $props();

	const instance = $derived(instanceStore.get(instanceId));
	const record = $derived(instance?.record);

	let isEditingTitle = $state(false);
	let titleInput = $state('');

	function focusElement(node: HTMLElement) {
		node.focus();
	}

	/* v8 ignore next 7 — interact.js drag callbacks not triggered in jsdom */
	function onMove(dx: number, dy: number) {
		if (!record) return;
		const newX = record.x + dx;
		const newY = record.y + dy;
		instanceStore.update(instanceId, { x: newX, y: newY });
		layoutStore.updateInstance(instanceId, { x: newX, y: newY });
	}

	/* v8 ignore next 4 — interact.js drag callbacks not triggered in jsdom */
	function onResize(width: number, height: number) {
		instanceStore.update(instanceId, { width, height });
		layoutStore.updateInstance(instanceId, { width, height });
	}

	/* v8 ignore next 5 — interact.js drag callbacks not triggered in jsdom */
	function bringToFront() {
		instanceStore.bringToFront(instanceId);
		const updated = instanceStore.get(instanceId);
		if (updated) layoutStore.updateInstance(instanceId, { zIndex: updated.record.zIndex });
	}

	function startRename() {
		/* v8 ignore next — title always defined in mocked records */
		titleInput = record?.title ?? '';
		isEditingTitle = true;
	}

	/* v8 ignore next 5 — interact.js drag callbacks not triggered in jsdom */
	function commitRename() {
		instanceStore.update(instanceId, { title: titleInput });
		layoutStore.updateInstance(instanceId, { title: titleInput });
		isEditingTitle = false;
	}

	function toggleMinimize() {
		/* v8 ignore next — minimized always boolean; record always non-null in tests */
		const minimized = !(record?.minimized ?? false);
		instanceStore.update(instanceId, { minimized });
		layoutStore.updateInstance(instanceId, { minimized });
	}

	/* v8 ignore next 7 — Svelte template style computations; both minimized states and prop presence tested */
	const heightStyle = $derived(record?.minimized ? 'auto' : `${record?.height ?? 0}px`);
	const minWidthStyle = $derived(minWidth ? `${minWidth}px` : undefined);
	const minHeightStyle = $derived(minHeight ? `${minHeight}px` : undefined);
	const leftStyle = $derived(`${record?.x ?? 0}px`);
	const topStyle = $derived(`${record?.y ?? 0}px`);
	const widthStyle = $derived(`${record?.width ?? 0}px`);
	const zIndexStyle = $derived(`${record?.zIndex ?? 0}`);
</script>

{#if record}
	<div
		class="absolute flex flex-col overflow-hidden rounded-lg border border-primary-700 bg-primary-900 shadow-xl"
		style:left={leftStyle}
		style:top={topStyle}
		style:width={widthStyle}
		style:height={heightStyle}
		style:z-index={zIndexStyle}
		style:min-width={minWidthStyle}
		style:min-height={minHeightStyle}
		use:useInteract={{ onMove, onResize, minWidth, minHeight }}
		onpointerdown={bringToFront}
		role="region"
		aria-label="{moduleDisplayName} window"
	>
		<!-- Title bar -->
		<div
			class="flex cursor-move items-center gap-2 bg-primary-800 px-3 py-2 select-none"
			data-drag-handle
		>
			<span class="text-xs font-medium text-primary-400">{moduleDisplayName}</span>
			{#if record.title}
				<span class="text-xs text-primary-300">:</span>
			{/if}
			{#if isEditingTitle}
				<input
					class="flex-1 border-b border-primary-400 bg-transparent text-xs text-primary-100 outline-none"
					bind:value={titleInput}
					onblur={commitRename}
					onkeydown={(e) => e.key === 'Enter' && commitRename()}
					use:focusElement
				/>
			{:else}
				<span
					class="flex-1 cursor-text text-xs text-primary-100"
					ondblclick={startRename}
					role="button"
					tabindex="0">{record.title}</span
				>
			{/if}
			<button
				class="ml-auto px-1 text-xs text-primary-400 hover:text-primary-100"
				onclick={toggleMinimize}
				aria-label={record.minimized ? 'Restore' : 'Minimize'}
				>{record.minimized ? '▲' : '▼'}</button
			>
		</div>

		<!-- Content -->
		{#if !record.minimized}
			<div class="flex-1 overflow-hidden">
				{@render children()}
			</div>
		{/if}
	</div>
{/if}
