export interface ParsedPathTemplate {
	folder: string;
	filename: string;
}

export function parsePathTemplate(template: string): ParsedPathTemplate {
	const lastSlash = template.lastIndexOf('/');
	const folder = lastSlash >= 0 ? template.slice(0, lastSlash) : '';
	const tail = lastSlash >= 0 ? template.slice(lastSlash + 1) : template;
	const withoutFormatToken = tail.replace(/\.\{format\}$/i, '');
	// Only fall back to a literal extension strip when no {format} token was present.
	// Otherwise filenames containing dots ("recording.with.dots") get truncated.
	const filename =
		withoutFormatToken === tail
			? withoutFormatToken.replace(/\.[^./{}]+$/, '')
			: withoutFormatToken;
	return { folder, filename };
}

export function composePathTemplate(folder: string, filename: string): string {
	const cleanFilename = filename.trim() || 'recording';
	const cleanFolder = folder.replace(/\/$/, '');
	return cleanFolder ? `${cleanFolder}/${cleanFilename}.{format}` : `${cleanFilename}.{format}`;
}
