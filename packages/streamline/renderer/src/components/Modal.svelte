<script lang="ts" module>
	const modalStack: Array<() => void> = [];
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { onMount, onDestroy } from 'svelte';
	import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
	import { faXmark } from '@fortawesome/free-solid-svg-icons';
	import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
	import IconButton from './IconButton.svelte';

	interface Props {
		title: string;
		eyebrow?: string;
		icon?: IconDefinition;
		onClose: () => void;
		width?: string;
		children: Snippet;
		actions?: Snippet;
	}

	const { title, eyebrow, icon, onClose, width = '26rem', children, actions }: Props = $props();

	const titleId = `modal-title-${crypto.randomUUID().slice(0, 8)}`;

	onMount(() => {
		modalStack.push(onClose);
	});

	onDestroy(() => {
		const index = modalStack.indexOf(onClose);
		if (index !== -1) modalStack.splice(index, 1);
	});

	function handleWindowKeydown(event: KeyboardEvent) {
		if (event.key !== 'Escape') return;
		// Only the top-most modal responds to ESC so stacked dialogs don't all close.
		/* v8 ignore next — stacked modal guard; only top-most responds to ESC */
		if (modalStack[modalStack.length - 1] !== onClose) return;
		event.stopPropagation();
		onClose();
	}
</script>

<svelte:window onkeydown={handleWindowKeydown} />

<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
	data-modal
>
	<div
		role="dialog"
		aria-modal="true"
		aria-labelledby={titleId}
		style:width
		class="flex max-w-[92vw] flex-col overflow-hidden rounded-lg border border-primary-700 bg-primary-950 shadow-2xl"
	>
		<div class="flex items-center gap-3 border-b border-primary-800 bg-primary-900 px-3 py-2.5">
			{#if icon}
				<div
					class="flex h-9 w-9 items-center justify-center rounded border border-primary-700 bg-primary-800 text-base text-secondary-400"
				>
					<FontAwesomeIcon {icon} />
				</div>
			{/if}
			<div class="flex min-w-0 flex-1 flex-col leading-tight">
				{#if eyebrow}
					<span class="text-[0.55rem] font-bold tracking-[0.22em] text-primary-500 uppercase">
						{eyebrow}
					</span>
				{/if}
				<span id={titleId} class="truncate text-sm font-semibold text-primary-100">{title}</span>
			</div>
			<IconButton icon={faXmark} title="Close" onclick={onClose} size="xs" />
		</div>

		<div class="flex max-h-[70vh] flex-col gap-4 overflow-y-auto p-4 text-sm">
			{@render children()}
		</div>

		{#if actions}
			<div
				class="flex items-center justify-end gap-2 border-t border-primary-800 bg-primary-900 px-4 py-3"
			>
				{@render actions()}
			</div>
		{/if}
	</div>
</div>
