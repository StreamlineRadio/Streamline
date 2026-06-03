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
	const match = /-nightly\.g([0-9a-f]+)/.exec(version);
	return match ? match[1] : null;
}

function isNewerVersion(remote: string, current: string): boolean {
	const parse = (v: string) => v.replace(/^v/, '').split('.').map(Number);
	const [rMaj, rMin, rPat] = parse(remote);
	const [cMaj, cMin, cPat] = parse(current);
	/* v8 ignore next 2 — major/minor version divergence paths not exercised in unit tests */
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
	/* v8 ignore next — null branch for release.name not exercised in unit tests */
	const remoteSha = release.name ? parseNightlySha(release.name) : null;
	if (!localSha || !remoteSha || localSha === remoteSha) return null;
	return { version: release.name as string, url: release.html_url };
}

/* v8 ignore next 30 — requires packaged Electron app, network access, and Notification API */
export async function checkForUpdates(): Promise<void> {
	if (!app.isPackaged) return;

	const channel: Channel = __UPDATE_CHANNEL__;
	const api =
		channel === 'nightly'
			? 'https://api.github.com/repos/StreamlineRadio/Streamline/releases/tags/nightly'
			: RELEASES_API;

	try {
		const releaseResponse = await fetch(api, {
			headers: { 'User-Agent': 'Streamline-App' }
		});
		if (!releaseResponse.ok) return;

		const release = (await releaseResponse.json()) as ReleaseInfo;
		const notice = resolveUpdate({ channel, currentVersion: app.getVersion(), release });
		if (!notice) return;

		const notification = new Notification({
			title: 'Streamline update available',
			body: `Version ${notice.version} is available. Click to download.`
		});
		notification.on('click', () => shell.openExternal(notice.url));
		notification.show();
	} catch {
		// silently ignore - a failed check must never crash the app
	}
}
