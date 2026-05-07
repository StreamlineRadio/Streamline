<script lang="ts">
	import type { EncoderConfig } from '@streamline/shared';

	interface Props {
		config?: EncoderConfig;
		onSave: (config: EncoderConfig) => void;
		onCancel: () => void;
	}
	const { config, onSave, onCancel }: Props = $props();

	let name = $state(config?.name ?? '');
	let type = $state<EncoderConfig['type']>(config?.type ?? 'icecast');
	let format = $state<EncoderConfig['format']>(config?.format ?? 'mp3');
	let bitrateKbps = $state(config?.bitrateKbps ?? 128);
	let sampleRate = $state<EncoderConfig['sampleRate']>(config?.sampleRate ?? 48000);
	let channels = $state<1 | 2>(config?.channels ?? 2);
	let host = $state(config?.type !== 'file' ? (config?.host ?? '') : '');
	let port = $state(config?.type !== 'file' ? (config?.port ?? 8000) : 8000);
	let mount = $state(config?.type !== 'file' ? (config?.mount ?? '/stream') : '/stream');
	let username = $state(config?.type !== 'file' ? (config?.username ?? 'source') : 'source');
	let password = $state(''); // never pre-filled — secrets are one-way
	let pathTemplate = $state(
		config?.type === 'file'
			? (config?.pathTemplate ?? '~/recordings/{date}-{time}.{format}')
			: '~/recordings/{date}-{time}.{format}'
	);

	async function save() {
		const id = config?.id ?? crypto.randomUUID();
		let passwordRef = config?.type !== 'file' ? config?.passwordRef : undefined;

		if (password) {
			passwordRef = `encoder-pw-${id}`;
			await window.streamline.api.secret.set(passwordRef, password);
		}

		if (type === 'file') {
			onSave({ id, name, type, format, bitrateKbps, sampleRate, channels, pathTemplate });
		} else {
			onSave({
				id,
				name,
				type,
				format,
				bitrateKbps,
				sampleRate,
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

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
	<div class="flex w-96 flex-col gap-4 rounded-lg border border-primary-700 bg-primary-900 p-6">
		<h2 class="text-lg font-semibold">{config ? 'Edit Encoder' : 'Add Encoder'}</h2>

		<label class="flex flex-col gap-1 text-sm">
			<span class="text-primary-400">Name</span>
			<input
				bind:value={name}
				class="rounded border border-primary-700 bg-primary-800 px-2 py-1 text-primary-100"
			/>
		</label>

		<div class="grid grid-cols-2 gap-2 text-sm">
			<label class="flex flex-col gap-1">
				<span class="text-primary-400">Type</span>
				<select
					bind:value={type}
					class="rounded border border-primary-700 bg-primary-800 px-2 py-1 text-primary-100"
				>
					<option value="icecast">Icecast 2</option>
					<option value="shoutcast">Shoutcast 2</option>
					<option value="file">File</option>
				</select>
			</label>
			<label class="flex flex-col gap-1">
				<span class="text-primary-400">Format</span>
				<select
					bind:value={format}
					class="rounded border border-primary-700 bg-primary-800 px-2 py-1 text-primary-100"
				>
					<option value="mp3">MP3</option>
					<option value="aac">AAC</option>
					<option value="ogg-vorbis">Ogg Vorbis</option>
					<option value="opus">Opus</option>
					{#if type === 'file'}<option value="flac">FLAC</option>{/if}
				</select>
			</label>
		</div>

		<div class="grid grid-cols-3 gap-2 text-sm">
			<label class="flex flex-col gap-1">
				<span class="text-primary-400">Bitrate (kbps)</span>
				<input
					type="number"
					bind:value={bitrateKbps}
					class="rounded border border-primary-700 bg-primary-800 px-2 py-1 text-primary-100"
				/>
			</label>
			<label class="flex flex-col gap-1">
				<span class="text-primary-400">Sample Rate</span>
				<select
					bind:value={sampleRate}
					class="rounded border border-primary-700 bg-primary-800 px-2 py-1 text-primary-100"
				>
					<option value={22050}>22050 Hz</option>
					<option value={32000}>32000 Hz</option>
					<option value={44100}>44100 Hz</option>
					<option value={48000}>48000 Hz</option>
				</select>
			</label>
			<label class="flex flex-col gap-1">
				<span class="text-primary-400">Channels</span>
				<select
					bind:value={channels}
					class="rounded border border-primary-700 bg-primary-800 px-2 py-1 text-primary-100"
				>
					<option value={1}>Mono</option>
					<option value={2}>Stereo</option>
				</select>
			</label>
		</div>

		{#if type !== 'file'}
			<div class="grid grid-cols-2 gap-2 text-sm">
				<label class="flex flex-col gap-1">
					<span class="text-primary-400">Host</span>
					<input
						bind:value={host}
						class="rounded border border-primary-700 bg-primary-800 px-2 py-1 text-primary-100"
					/>
				</label>
				<label class="flex flex-col gap-1">
					<span class="text-primary-400">Port</span>
					<input
						type="number"
						bind:value={port}
						class="rounded border border-primary-700 bg-primary-800 px-2 py-1 text-primary-100"
					/>
				</label>
			</div>
			<label class="flex flex-col gap-1 text-sm">
				<span class="text-primary-400">Mount</span>
				<input
					bind:value={mount}
					class="rounded border border-primary-700 bg-primary-800 px-2 py-1 text-primary-100"
				/>
			</label>
			<div class="grid grid-cols-2 gap-2 text-sm">
				<label class="flex flex-col gap-1">
					<span class="text-primary-400">Username</span>
					<input
						bind:value={username}
						class="rounded border border-primary-700 bg-primary-800 px-2 py-1 text-primary-100"
					/>
				</label>
				<label class="flex flex-col gap-1">
					<span class="text-primary-400">Password</span>
					<input
						type="password"
						bind:value={password}
						placeholder={config?.type !== 'file' && config?.passwordRef ? '(unchanged)' : ''}
						class="rounded border border-primary-700 bg-primary-800 px-2 py-1 text-primary-100"
					/>
				</label>
			</div>
		{:else}
			<label class="flex flex-col gap-1 text-sm">
				<span class="text-primary-400">Path Template</span>
				<input
					bind:value={pathTemplate}
					class="rounded border border-primary-700 bg-primary-800 px-2 py-1 font-mono text-xs text-primary-100"
				/>
			</label>
		{/if}

		<div class="flex justify-end gap-2">
			<button
				onclick={onCancel}
				class="rounded bg-primary-700 px-4 py-2 text-sm hover:bg-primary-600">Cancel</button
			>
			<button
				onclick={save}
				class="rounded bg-secondary-700 px-4 py-2 text-sm hover:bg-secondary-600">Save</button
			>
		</div>
	</div>
</div>
