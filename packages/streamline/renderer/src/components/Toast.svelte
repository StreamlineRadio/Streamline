<script lang="ts">
	import { onMount } from 'svelte';
	import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
	import {
		faCircleCheck,
		faCircleXmark,
		faTriangleExclamation,
		faCircleInfo,
		faXmark
	} from '@fortawesome/free-solid-svg-icons';

	interface Props {
		message: string;
		type: 'error' | 'warning' | 'success' | 'info';
		onClose: () => void;
		durationMs?: number;
	}
	const { message, type, onClose, durationMs = 8000 }: Props = $props();

	const styles = {
		success: {
			surface: 'border-success-600 bg-success-950 text-success-50',
			accent: 'bg-success-500',
			glyph: 'text-success-300',
			close: 'text-success-300 hover:text-success-50',
			icon: faCircleCheck
		},
		error: {
			surface: 'border-danger-600 bg-danger-950 text-danger-50',
			accent: 'bg-danger-500',
			glyph: 'text-danger-300',
			close: 'text-danger-300 hover:text-danger-50',
			icon: faCircleXmark
		},
		warning: {
			surface: 'border-warning-600 bg-warning-950 text-warning-50',
			accent: 'bg-warning-500',
			glyph: 'text-warning-300',
			close: 'text-warning-300 hover:text-warning-50',
			icon: faTriangleExclamation
		},
		info: {
			surface: 'border-info-600 bg-info-950 text-info-50',
			accent: 'bg-info-500',
			glyph: 'text-info-300',
			close: 'text-info-300 hover:text-info-50',
			icon: faCircleInfo
		}
	} as const;
	const style = $derived(styles[type]);

	// `cycle` re-keys the countdown ring so its CSS animation restarts from full.
	let cycle = $state(0);
	let timer: ReturnType<typeof setTimeout>;

	function startTimer() {
		clearTimeout(timer);
		timer = setTimeout(onClose, durationMs);
	}

	function resetTimer() {
		cycle++;
		startTimer();
	}

	onMount(() => {
		startTimer();
		return () => clearTimeout(timer);
	});
</script>

<div
	class="relative flex items-start gap-3 overflow-hidden rounded-lg border py-3 pr-3 pl-4 text-sm shadow-xl {style.surface}"
	role="alert"
	onmouseenter={resetTimer}
>
	<span class="absolute inset-y-0 left-0 w-1 {style.accent}" aria-hidden="true"></span>
	<span class="flex-shrink-0 leading-5 {style.glyph}" aria-hidden="true"
		><FontAwesomeIcon icon={style.icon} /></span
	>
	<span class="flex-1 leading-5">{message}</span>
	<button
		onclick={onClose}
		aria-label="Dismiss"
		class="relative flex h-6 w-6 flex-shrink-0 items-center justify-center {style.close}"
	>
		{#key cycle}
			<svg class="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 24 24" aria-hidden="true">
				<circle
					class="toast-ring"
					cx="12"
					cy="12"
					r="11"
					pathLength="1"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					style="animation-duration: {durationMs}ms"
				/>
			</svg>
		{/key}
		<FontAwesomeIcon icon={faXmark} />
	</button>
</div>

<style>
	.toast-ring {
		stroke-dasharray: 1;
		opacity: 0.5;
		animation-name: toast-countdown;
		animation-timing-function: linear;
		animation-fill-mode: forwards;
	}
	@keyframes toast-countdown {
		from {
			stroke-dashoffset: 0;
		}
		to {
			stroke-dashoffset: 1;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.toast-ring {
			animation: none;
			opacity: 0;
		}
	}
</style>
