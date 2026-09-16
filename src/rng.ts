// Deterministic PRNG (mulberry32) so the same seed replays the same invasion.

export function mulberry32(seed: number): () => number {
	let a = seed >>> 0

	return () => {
		a = (a + 0x6d2b79f5) | 0
		let t = Math.imul(a ^ (a >>> 15), 1 | a)
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t

		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}

export function dailySeed(): number {
	const now = new Date()

	return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate()
}

export function seedLabel(seed: number): string {
	return String(seed).padStart(8, '0')
}

export function todayIso(): string {
	return new Date().toISOString().slice(0, 10)
}