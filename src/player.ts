import { PLAY_LEFT, PLAY_RIGHT, PLAYER_ROW, SHIP_WIDTH } from './constants.ts'
import { clamp, type Rect } from './geometry.ts'

export class Player {
	x = 0
	readonly y = PLAYER_ROW
	vx = 0
	recoil = 0

	constructor() {
		this.reset()
	}

	reset(): void {
		this.x = (PLAY_LEFT + PLAY_RIGHT - SHIP_WIDTH / 2) / 2
		this.vx = 0
		this.recoil = 0
	}

	update(dt: number): void {
		this.x = clamp(
			this.x + (this.vx * dt) / 1000,
			PLAY_LEFT,
			PLAY_RIGHT - SHIP_WIDTH / 2,
		)
		this.recoil = Math.max(0, this.recoil - dt * 0.004)
	}

	rect(): Rect {
		return { x: this.x, y: this.y, w: SHIP_WIDTH / 2, h: 2 }
	}
}