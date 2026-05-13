<script lang="ts">
	import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
	import { faFolderOpen } from '@fortawesome/free-solid-svg-icons';

	interface Props {
		label: string;
		value: string;
		placeholder?: string;
	}
	let { label, value = $bindable(), placeholder = '(none selected)' }: Props = $props();

	async function browse() {
		const picked = await window.streamline.api.system.selectFolder();
		if (picked) value = picked;
	}
</script>

<div class="flex flex-col gap-1">
	<span class="form-field-label">{label}</span>
	<button
		type="button"
		onclick={browse}
		class="form-input flex cursor-pointer items-center gap-2 text-left hover:border-primary-600 focus:border-secondary-500"
	>
		<FontAwesomeIcon icon={faFolderOpen} class="shrink-0 text-primary-500" />
		<span
			class={['flex-1 truncate font-mono text-xs', value ? 'text-primary-100' : 'text-primary-600']}
		>
			{value || placeholder}
		</span>
		<span class="shrink-0 text-[0.55rem] font-bold tracking-[0.18em] text-secondary-400 uppercase">
			Browse
		</span>
	</button>
</div>
