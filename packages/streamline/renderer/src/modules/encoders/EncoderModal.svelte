<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { faSatelliteDish, faFloppyDisk } from '@fortawesome/free-solid-svg-icons';
	import {
		ENCODER_SAMPLE_RATES,
		formatExtension,
		type EncoderConfig,
		type EncoderSampleRate
	} from '@streamline/shared';
	import Modal from '../../components/Modal.svelte';
	import TextField from '../../components/forms/TextField.svelte';
	import SelectField from '../../components/forms/SelectField.svelte';
	import NumberField from '../../components/forms/NumberField.svelte';
	import BitrateField from '../../components/forms/BitrateField.svelte';
	import SampleRateField from '../../components/forms/SampleRateField.svelte';
	import FolderField from '../../components/forms/FolderField.svelte';
	import FilenameField from '../../components/forms/FilenameField.svelte';
	import { parsePathTemplate, composePathTemplate } from './path-template';

	interface Props {
		config?: EncoderConfig;
		onSave: (config: EncoderConfig) => void;
		onCancel: () => void;
	}
	const { config, onSave, onCancel }: Props = $props();

	function snapSampleRate(value: number): EncoderSampleRate {
		if (ENCODER_SAMPLE_RATES.includes(value as EncoderSampleRate)) {
			return value as EncoderSampleRate;
		}
		return ENCODER_SAMPLE_RATES.reduce((closest, rate) =>
			Math.abs(rate - value) < Math.abs(closest - value) ? rate : closest
		);
	}

	const initialFile = untrack(() =>
		config?.type === 'file'
			? parsePathTemplate(config.pathTemplate)
			: { folder: '', filename: 'recording-{date}-{time}' }
	);

	let name = $state(untrack(() => config?.name ?? ''));
	let type = $state<EncoderConfig['type']>(untrack(() => config?.type ?? 'icecast'));
	let format = $state<EncoderConfig['format']>(untrack(() => config?.format ?? 'mp3'));
	let bitrateKbps = $state(untrack(() => config?.bitrateKbps ?? 128));
	let sampleRate = $state<number>(untrack(() => config?.sampleRate ?? 44100));
	let channels = $state<1 | 2>(untrack(() => config?.channels ?? 2));
	let host = $state(untrack(() => (config?.type !== 'file' ? (config?.host ?? '') : '')));
	let port = $state(untrack(() => (config?.type !== 'file' ? (config?.port ?? 8000) : 8000)));
	let mount = $state(
		untrack(() => (config?.type !== 'file' ? (config?.mount ?? '/stream') : '/stream'))
	);
	let username = $state(
		untrack(() => (config?.type !== 'file' ? (config?.username ?? 'source') : 'source'))
	);
	let password = $state('');
	let folder = $state(initialFile.folder);
	let filename = $state(initialFile.filename);

	onMount(async () => {
		if (!folder) {
			folder = await window.streamline.api.system.getDefaultRecordingsFolder();
		}
	});

	async function save() {
		const id = config?.id ?? crypto.randomUUID();
		let passwordRef = config?.type !== 'file' ? config?.passwordRef : undefined;

		if (password) {
			passwordRef = `encoder-pw-${id}`;
			await window.streamline.api.secret.set(passwordRef, password);
		}

		const sampleRateOut = snapSampleRate(sampleRate);
		if (type === 'file') {
			const pathTemplate = composePathTemplate(folder, filename);
			onSave({
				id,
				name,
				type,
				format,
				bitrateKbps,
				sampleRate: sampleRateOut,
				channels,
				pathTemplate
			});
		} else {
			onSave({
				id,
				name,
				type,
				format,
				bitrateKbps,
				sampleRate: sampleRateOut,
				channels,
				host,
				port,
				mount,
				username,
				passwordRef
			});
		}
	}
</script>

<Modal
	title={name || 'Untitled encoder'}
	eyebrow={config ? 'Edit Output' : 'New Output'}
	icon={type === 'file' ? faFloppyDisk : faSatelliteDish}
	onClose={onCancel}
>
	<section class="flex flex-col gap-2">
		<span class="form-section-label">Identity</span>
		<TextField label="Name" bind:value={name} placeholder="My broadcast" />
		<div class="grid grid-cols-2 gap-2">
			<SelectField label="Type" bind:value={type}>
				<option value="icecast">Icecast 2</option>
				<option value="shoutcast">Shoutcast 2</option>
				<option value="file">File</option>
			</SelectField>
			<SelectField label="Format" bind:value={format}>
				<option value="mp3">MP3</option>
				<option value="aac">AAC</option>
				<option value="ogg-vorbis">Ogg Vorbis</option>
				<option value="opus">Opus</option>
				{#if type === 'file'}<option value="flac">FLAC</option>{/if}
			</SelectField>
		</div>
	</section>

	<section class="flex flex-col gap-2">
		<span class="form-section-label">Audio</span>
		<div class="grid grid-cols-3 gap-2">
			<BitrateField label="Bitrate" bind:value={bitrateKbps} />
			<SampleRateField label="Sample Rate" bind:value={sampleRate} />
			<SelectField label="Channels" bind:value={channels}>
				<option value={1}>Mono</option>
				<option value={2}>Stereo</option>
			</SelectField>
		</div>
	</section>

	<section class="flex flex-col gap-2">
		<span class="form-section-label">Destination</span>
		{#if type !== 'file'}
			<div class="grid grid-cols-[1fr_5.5rem] gap-2">
				<TextField label="Host" bind:value={host} placeholder="stream.example.com" />
				<NumberField label="Port" bind:value={port} />
			</div>
			<TextField label="Mount" bind:value={mount} placeholder="/stream" mono />
			<div class="grid grid-cols-2 gap-2">
				<TextField label="Username" bind:value={username} />
				<TextField
					label="Password"
					type="password"
					bind:value={password}
					placeholder={config?.type !== 'file' && config?.passwordRef ? '(unchanged)' : ''}
				/>
			</div>
		{:else}
			<FolderField label="Folder" bind:value={folder} />
			<FilenameField label="Filename" bind:value={filename} extension={formatExtension(format)} />
			<p class="text-[0.65rem] text-primary-500">
				Filename tokens: <span class="font-mono text-primary-400">{'{date}'}</span>,
				<span class="font-mono text-primary-400">{'{time}'}</span>
			</p>
		{/if}
	</section>

	{#snippet actions()}
		<button
			onclick={onCancel}
			class="rounded border border-primary-700 bg-primary-800 px-4 py-1.5 text-xs font-bold tracking-[0.18em] text-primary-200 uppercase transition-colors hover:border-primary-600 hover:bg-primary-700 hover:text-primary-50"
		>
			Cancel
		</button>
		<button
			onclick={save}
			class="rounded border border-secondary-600 bg-secondary-700 px-4 py-1.5 text-xs font-bold tracking-[0.18em] text-primary-50 uppercase transition-colors hover:border-secondary-500 hover:bg-secondary-600"
		>
			Save
		</button>
	{/snippet}
</Modal>
