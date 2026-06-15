<script lang="ts">
	import { untrack } from 'svelte';
	import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
	import { faChevronDown } from '@fortawesome/free-solid-svg-icons';
	import FormField from './FormField.svelte';

	interface Props {
		label: string;
		value: number;
		options: number[];
		suffix?: string;
		decimal?: boolean;
		format?: (value: number) => string;
		parse?: (text: string) => number | null;
	}

	const defaultFormat = (value: number) => String(value);
	const defaultParse = (text: string): number | null => {
		const trimmed = text.trim();
		if (trimmed === '') return null;
		const parsed = Number(trimmed);
		return Number.isFinite(parsed) ? parsed : null;
	};

	let {
		label,
		value = $bindable(),
		options,
		suffix,
		decimal = false,
		format = defaultFormat,
		parse = defaultParse
	}: Props = $props();

	let text = $state(untrack(() => format(value)));
	let isOpen = $state(false);
	let wrapperElement: HTMLDivElement | undefined;
	let inputElement: HTMLInputElement | undefined;

	// Track which value the displayed text reflects so we can detect external
	// changes (parent re-binds value) without overwriting transient user typing.
	let textOwnsValue = value;

	/* v8 ignore next -- @preserve: reactive sync when parent re-binds value; requires wrapper component to test */
	$effect(() => {
		if (value !== textOwnsValue) {
			text = format(value);
			textOwnsValue = value;
		}
	});

	function commitText(newText: string) {
		text = newText;
		const parsed = parse(newText);
		if (parsed !== null) {
			value = parsed;
			textOwnsValue = parsed;
		}
	}

	function handleInput(event: Event) {
		commitText((event.target as HTMLInputElement).value);
	}

	function handleBlur() {
		// Snap display back to canonical formatting if user left an unparsable value
		text = format(value);
	}

	function pickOption(option: number) {
		value = option;
		textOwnsValue = option;
		text = format(option);
		isOpen = false;
		inputElement?.blur();
	}

	function toggleDropdown() {
		isOpen = !isOpen;
		if (isOpen) inputElement?.focus();
	}

	function handleWindowMousedown(event: MouseEvent) {
		if (!isOpen) return;
		if (wrapperElement && !wrapperElement.contains(event.target as Node)) {
			isOpen = false;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') isOpen = false;
	}
</script>

<!--
	Click-away relies on `wrapperElement.contains(event.target)` so the dropdown
	must remain in this component's DOM subtree. If the panel is ever portalled
	out (e.g. for z-index headaches), update handleWindowMousedown to test the
	panel ref too — otherwise any click inside the portal closes the dropdown.
-->
<svelte:window onmousedown={handleWindowMousedown} />

<FormField {label}>
	<div bind:this={wrapperElement} class="relative">
		<input
			bind:this={inputElement}
			type="text"
			inputmode={decimal ? 'decimal' : 'numeric'}
			pattern={decimal ? '[0-9.]*' : '[0-9]*'}
			value={text}
			oninput={handleInput}
			onfocus={() => (isOpen = true)}
			onblur={handleBlur}
			onkeydown={handleKeydown}
			class={['form-input', suffix ? 'pr-16' : 'pr-9']}
		/>
		{#if suffix}
			<span
				class="pointer-events-none absolute inset-y-0 right-7 flex items-center font-mono text-[0.6rem] tracking-wider text-primary-500 uppercase"
			>
				{suffix}
			</span>
		{/if}
		<button
			type="button"
			tabindex="-1"
			aria-label="Toggle options"
			onmousedown={(event) => event.preventDefault()}
			onclick={toggleDropdown}
			class="absolute inset-y-0 right-0 flex w-7 items-center justify-center border-l border-primary-700/40 text-primary-500 transition-colors hover:text-primary-200"
		>
			<FontAwesomeIcon
				icon={faChevronDown}
				class="text-xs transition-transform {isOpen ? 'rotate-180' : ''}"
			/>
		</button>
		{#if isOpen}
			<div
				class="absolute inset-x-0 top-full z-30 mt-1 max-h-48 overflow-y-auto rounded border border-primary-700 bg-primary-950 shadow-xl"
			>
				{#each options as option (option)}
					<button
						type="button"
						onmousedown={(event) => event.preventDefault()}
						onclick={() => pickOption(option)}
						class={[
							'flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left text-sm transition-colors',
							value === option
								? 'bg-primary-800 text-secondary-300'
								: 'text-primary-100 hover:bg-primary-800 hover:text-primary-50'
						]}
					>
						<span class="font-mono">{format(option)}</span>
						{#if suffix}
							<span class="font-mono text-[0.6rem] tracking-wider text-primary-500 uppercase">
								{suffix}
							</span>
						{/if}
					</button>
				{/each}
			</div>
		{/if}
	</div>
</FormField>
