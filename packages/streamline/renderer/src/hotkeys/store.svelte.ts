import type { HotkeyBinding } from '@streamline/shared';

const bindings = $state<HotkeyBinding[]>([]);

export const hotkeyStore = {
	get all() {
		return bindings;
	},
	async load(): Promise<void> {
		const loaded = await window.streamline.api.hotkeys.list();
		bindings.splice(0, bindings.length, ...loaded);
	},
	async bind(binding: HotkeyBinding): Promise<{ conflict: HotkeyBinding | null }> {
		const conflict = bindings.find(
			(b) => b.accelerator === binding.accelerator && b.id !== binding.id
		);
		await window.streamline.api.hotkeys.save(binding);
		const index = bindings.findIndex((b) => b.id === binding.id);
		if (index >= 0) bindings[index] = binding;
		else bindings.push(binding);
		return { conflict: conflict ?? null };
	},
	async unbind(id: string): Promise<void> {
		await window.streamline.api.hotkeys.delete(id);
		const index = bindings.findIndex((b) => b.id === id);
		if (index >= 0) bindings.splice(index, 1);
	}
};
