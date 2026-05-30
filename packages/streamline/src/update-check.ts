import { app, Notification, shell } from 'electron';

const RELEASES_API = 'https://api.github.com/repos/StreamlineRadio/Streamline/releases/latest';
const RELEASES_PAGE = 'https://github.com/StreamlineRadio/Streamline/releases/latest';

export type Channel = 'stable' | 'nightly';

export interface ReleaseInfo {
	tag_name: string;
	name: string | null;
	html_url: string;
}

export interface UpdateNotice {
	version: string;
	url: string;
}

function parseNightlySha(version: string): string | null {
	const match = /-nightly\.([0-9a-f]+)/.exec(version);
	return match ? match[1] : null;
}

function isNewerVersion(remote: string, current: string): boolean {
	const parse = (v: string) => v.replace(/^v/, '').split('.').map(Number);
	const [rMaj, rMin, rPat] = parse(remote);
	const [cMaj, cMin, cPat] = parse(current);
	if (rMaj !== cMaj) return rMaj > cMaj;
	if (rMin !== cMin) return rMin > cMin;
	return rPat > cPat;
}

export function resolveUpdate(args: {
	channel: Channel;
	currentVersion: string;
	release: ReleaseInfo | null;
}): UpdateNotice | null {
	const { channel, currentVersion, release } = args;
	if (!release) return null;

	if (channel === 'stable') {
		if (!release.tag_name || !isNewerVersion(release.tag_name, currentVersion)) return null;
		return { version: release.tag_name.replace(/^v/, ''), url: RELEASES_PAGE };
	}

	const localSha = parseNightlySha(currentVersion);
	const remoteSha = release.name ? parseNightlySha(release.name) : null;
	if (!localSha || !remoteSha || localSha === remoteSha) return null;
	return { version: release.name as string, url: release.html_url };
}

export async function checkForUpdates(): Promise<void> {
	if (!app.isPackaged) return;

	try {
		const releaseResponse = await fetch(RELEASES_API, {
			headers: { 'User-Agent': 'Streamline-App' }
		});
		if (!releaseResponse.ok) return;

		const { tag_name } = (await releaseResponse.json()) as { tag_name: string };
		if (!tag_name || !isNewerVersion(tag_name, app.getVersion())) return;

		const version = tag_name.replace(/^v/, '');
		const notification = new Notification({
			title: 'Streamline update available',
			body: `Version ${version} is available. Click to download.`
		});
		notification.on('click', () => shell.openExternal(RELEASES_PAGE));
		notification.show();
	} catch {
		// silently ignore - a failed check must never crash the app
	}
}
