<script lang="ts">
	import { faGear } from '@fortawesome/free-solid-svg-icons';
	import Modal from '../../components/Modal.svelte';

	interface Props {
		sendMetadata: boolean;
		onChange: (next: { sendMetadata: boolean }) => void;
		onClose: () => void;
	}

	const { sendMetadata, onChange, onClose }: Props = $props();
</script>

<Modal title="Deck settings" icon={faGear} {onClose} width="22rem">
	<label class="flex cursor-pointer items-start gap-2 text-primary-200">
		<input
			type="checkbox"
			checked={sendMetadata}
			onchange={(e) => onChange({ sendMetadata: (e.target as HTMLInputElement).checked })}
			class="mt-0.5 accent-secondary-500"
		/>
		<span>
			<span class="block">Send metadata</span>
			<span class="block text-xs text-primary-500">
				This deck's currently playing track is reported to icecast.
			</span>
		</span>
	</label>
</Modal>
