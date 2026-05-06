self.onmessage = async (
	e: MessageEvent<{ arrayBuffer: ArrayBuffer; hash: string; pixelWidth: number }>
) => {
	const { arrayBuffer, hash, pixelWidth } = e.data;
	try {
		const ctx = new OfflineAudioContext(1, 1, 44100);
		const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
		const samplesPerPixel = Math.floor(decoded.length / pixelWidth);
		const peaks = new Array(pixelWidth);
		for (let i = 0; i < pixelWidth; i++) {
			let max = 0;
			const start = i * samplesPerPixel;
			for (let ch = 0; ch < decoded.numberOfChannels; ch++) {
				const data = decoded.getChannelData(ch);
				for (let j = 0; j < samplesPerPixel; j++) {
					max = Math.max(max, Math.abs(data[start + j] ?? 0));
				}
			}
			peaks[i] = max;
		}
		self.postMessage({ peaks, hash });
	} catch (err) {
		self.postMessage({ peaks: null, hash, error: String(err) });
	}
};
