import { describe, it, expect } from 'vitest';
import { parsePathTemplate, composePathTemplate } from './path-template';

describe('parsePathTemplate', () => {
	it('splits folder and filename, stripping the {format} token', () => {
		expect(parsePathTemplate('~/Music/Recordings/show.{format}')).toEqual({
			folder: '~/Music/Recordings',
			filename: 'show'
		});
	});

	it('preserves dots inside the filename when {format} is present', () => {
		expect(parsePathTemplate('~/Music/recording.with.dots.{format}')).toEqual({
			folder: '~/Music',
			filename: 'recording.with.dots'
		});
	});

	it('keeps {date}/{time} tokens in the filename', () => {
		expect(parsePathTemplate('~/recordings/{date}-{time}.{format}')).toEqual({
			folder: '~/recordings',
			filename: '{date}-{time}'
		});
	});

	it('falls back to literal extension strip when no {format} token is present', () => {
		expect(parsePathTemplate('~/Music/show.mp3')).toEqual({
			folder: '~/Music',
			filename: 'show'
		});
	});

	it('does not strip dots from inside a filename in legacy mode', () => {
		expect(parsePathTemplate('~/Music/show.draft.mp3')).toEqual({
			folder: '~/Music',
			filename: 'show.draft'
		});
	});

	it('handles missing folder', () => {
		expect(parsePathTemplate('show.{format}')).toEqual({
			folder: '',
			filename: 'show'
		});
	});

	it('handles missing extension', () => {
		expect(parsePathTemplate('~/Music/show')).toEqual({
			folder: '~/Music',
			filename: 'show'
		});
	});
});

describe('composePathTemplate', () => {
	it('joins folder and filename with the {format} token', () => {
		expect(composePathTemplate('~/Music', 'show')).toBe('~/Music/show.{format}');
	});

	it('trims trailing slashes from folder', () => {
		expect(composePathTemplate('~/Music/', 'show')).toBe('~/Music/show.{format}');
	});

	it('falls back to "recording" when filename is empty or whitespace', () => {
		expect(composePathTemplate('~/Music', '')).toBe('~/Music/recording.{format}');
		expect(composePathTemplate('~/Music', '   ')).toBe('~/Music/recording.{format}');
	});

	it('omits the leading slash when folder is empty', () => {
		expect(composePathTemplate('', 'show')).toBe('show.{format}');
	});

	it('round-trips through parse and compose', () => {
		const original = '~/Music/Recordings/my.show.{format}';
		const parsed = parsePathTemplate(original);
		expect(composePathTemplate(parsed.folder, parsed.filename)).toBe(original);
	});
});
