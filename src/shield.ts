import { SHIELD_SHAPE } from './constants.ts'
import { rectsOverlap, type Rect } from './geometry.ts'

export const SHIELD_W = SHIELD_SHAPE[0]?.length ?? 7
export const SHIELD_H = SHIELD_SHAPE.length

export class Shield {
	readonly x: number
	readonly y: number
	cells: boolean[][] = []
	aliveCells = 0

	constructor(x: number, y: number) {
		this.x = x
		this.y = y
		this.reset()
	}

	reset(): void {
		this.cells = SHIELD_SHAPE.map((row) =>
			row.split('').map((char) => char === '#'),
		)
		this.aliveCells = this.cells.reduce(
			(sum, row) => sum + row.filter(Boolean).length,
			0,
		)
	}

	// Damages every cell overlapping the bullet. Returns true if it hit.
	vacateBullet(rect: Rect): boolean {
		let hit = false

		for (let r = 0; r < SHIELD_H; r++) {
			for (let c = 0; c < SHIELD_W; c++) {
				if (!this.cells[r][c]) {
					continue
				}

				if (rectsOverlap(rect, { x: this.x + c, y: this.y + r, w: 1, h: 1 })) {
					this.cells[r][c] = false
					this.aliveCells--
					hit = true
				}
			}
		}

		return hit
	}

	hasCells(): boolean {
		return this.aliveCells > 0
	}
}