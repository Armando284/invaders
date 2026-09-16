import { COLS } from './constants.ts'
import type { Rect } from './geometry.ts'

// Patterns: 0 = straight, 1 = diagonal drift, 2 = sine weave.
export const PATTERN_STRAIGHT = 0
export const PATTERN_DIAGONAL = 1
export const PATTERN_SINE = 2

const SINE_OMEGA = 9 // radians per second
const SINE_AMP = 2 // cells of horizontal swing

export interface Projectile {
	x: number
	y: number
	vy: number
	vx: number
	pattern: number
	anchorX: number
	phase: number
	t: number
	alive: boolean
}

export const BULLET_W = 0.5
export const BULLET_H = 0.5

export function makeProjectile(
	x: number,
	y: number,
	vy: number,
	options: { vx?: number; pattern?: number; phase?: number } = {},
): Projectile {
	return {
		x,
		y,
		vy,
		vx: options.vx ?? 0,
		pattern: options.pattern ?? PATTERN_STRAIGHT,
		phase: options.phase ?? 0,
		anchorX: x,
		t: 0,
		alive: true,
	}
}

export function updateProjectiles(
	list: Projectile[],
	dt: number,
	minY: number,
	maxY: number,
): void {
	for (const bullet of list) {
		if (!bullet.alive) {
			continue
		}

		bullet.t += dt / 1000
		bullet.y += (bullet.vy * dt) / 1000

		if (bullet.pattern === PATTERN_SINE) {
			bullet.x =
				bullet.anchorX +
				Math.sin(bullet.t * SINE_OMEGA + bullet.phase) * SINE_AMP
		} else {
			bullet.x += (bullet.vx * dt) / 1000
		}

		if (
			bullet.y < minY ||
			bullet.y > maxY ||
			bullet.x < -2 ||
			bullet.x > COLS + 1
		) {
			bullet.alive = false
		}
	}
}

export function bulletRect(bullet: Projectile): Rect {
	return { x: bullet.x + 0.25, y: bullet.y, w: BULLET_W, h: BULLET_H }
}

export function prune(list: Projectile[]): void {
	for (let i = list.length - 1; i >= 0; i--) {
		if (!list[i].alive) {
			list.splice(i, 1)
		}
	}
}