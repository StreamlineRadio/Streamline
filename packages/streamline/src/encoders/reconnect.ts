export class ExponentialBackoff {
	private attempt = 0;
	private readonly base: number;
	private readonly maxDelay: number;

	constructor(baseMs = 1000, maxMs = 30000) {
		this.base = baseMs;
		this.maxDelay = maxMs;
	}

	get attempts(): number {
		return this.attempt;
	}

	next(): number {
		const delay = Math.min(this.base * Math.pow(2, this.attempt), this.maxDelay);
		this.attempt++;
		return delay;
	}

	reset(): void {
		this.attempt = 0;
	}
}
