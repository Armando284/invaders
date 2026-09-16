import {
	UFO_MAX_GAP,
	UFO_MIN_GAP,
	UFO_ROW,
	UFO_SPEED,
} from './constants.ts'
import type { Rect } from './geometry.ts'

const UFO_VALUES = [50, 100, 150] as const

export class Ufo {
	readonly y = UFO_ROW
	x = -4
	vx = UFO_SPEED
	active = false
	timer = 0
	value = 100
	wave = 1
	rng: () => number = Math.random

	update(dt: number): void {
		if (this.active) {
			this.x += (this.vx * dt) / 1000

			if (this.x > 44 || this.x < -6) {
				this.active = false
			}
			return
		}

		this.timer -= dt

		if (this.timer <= 0) {
			this.spawn()
		}
	}

	spawn(): void {
		const fromLeft = this.rng() < 0.5
		this.active = true
		this.x = fromLeft ? -6 : 40
		this.vx = fromLeft ? UFO_SPEED : -UFO_SPEED
		const base =
			UFO_VALUES[Math.floor(this.rng() * UFO_VALUES.length)] ?? 100
		this.value = base * Math.max(1, Math.ceil(this.wave / 2))
	}

	respawnRandom(): void {
		this.active = false
		this.timer = UFO_MIN_GAP + this.rng() * (UFO_MAX_GAP - UFO_MIN_GAP)
	}

	rect(): Rect {
		return { x: this.x, y: this.y, w: 1.5, h: 1 }
	}
}