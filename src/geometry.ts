// Pure geometry helpers shared by movement, collision and rendering.

export interface Point {
	x: number
	y: number
}

export interface Rect {
	x: number
	y: number
	w: number
	h: number
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
	return (
		a.x < b.x + b.w &&
		b.x < a.x + a.w &&
		a.y < b.y + b.h &&
		b.y < a.y + a.h
	)
}

export function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value))
}

export function pad(value: number, width: number): string {
	return String(Math.floor(value)).padStart(width, '0')
}