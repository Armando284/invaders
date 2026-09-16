import {
	BREACH_ROW,
	FORMATION_COLS,
	FORMATION_ROWS,
	FORMATION_TOP,
	FORMATION_X,
	INVADER_COLORS,
	INVADER_GLYPHS,
	INVADER_KINDS,
	PALETTE,
	PLAY_LEFT,
	PLAY_RIGHT,
	ROW_POINTS,
	SLOT_W,
	STEP_DOWN,
	STEP_X,
} from './constants.ts'
import { rectsOverlap, type Rect } from './geometry.ts'

export const INVADER_W = 3 // glyph characters wide
export const INVADER_H = 1 // glyph rows tall

export interface Invader {
	row: number
	col: number
	x: number
	y: number
	kind: number
	alive: boolean
}

export class Formation {
	invaders: Invader[] = []
	direction: 1 | -1 = 1
	frame = 0
	stepTimer = 0
	breached = false
	aliveCount = 0

	constructor() {
		this.reset()
	}

	reset(): void {
		this.invaders = []

		for (let row = 0; row < FORMATION_ROWS; row++) {
			for (let col = 0; col < FORMATION_COLS; col++) {
				this.invaders.push({
					row,
					col,
					x: FORMATION_X + col * SLOT_W,
					y: FORMATION_TOP + row * 2,
					kind: INVADER_KINDS[row] ?? 0,
					alive: true,
				})
			}
		}

		this.direction = 1
		this.frame = 0
		this.stepTimer = 0
		this.breached = false
		this.aliveCount = FORMATION_COLS * FORMATION_ROWS
	}

	pointsFor(row: number): number {
		return ROW_POINTS[row] ?? 0
	}

	glyphFor(invader: Invader, frame: number): string {
		const variants = INVADER_GLYPHS[invader.kind]
		return variants?.[frame % 2] ?? ''
	}

	colorFor(invader: Invader): string {
		return INVADER_COLORS[invader.kind] ?? PALETTE.green
	}

	aliveInvaders(): Invader[] {
		return this.invaders.filter((invader) => invader.alive)
	}

	update(dt: number, interval: number): void {
		if (this.aliveCount === 0 || this.breached) {
			return
		}

		this.stepTimer += dt

		let guard = 0

		while (this.stepTimer >= interval && guard < 16) {
			this.stepTimer -= interval
			this.step()
			guard++
		}
	}

	step(): void {
		const alive = this.aliveInvaders()

		if (alive.length === 0) {
			return
		}

		let minX = Infinity
		let maxRight = -Infinity

		for (const invader of alive) {
			minX = Math.min(minX, invader.x)
			maxRight = Math.max(maxRight, invader.x + INVADER_W)
		}

		if (
			(this.direction > 0 && maxRight + STEP_X > PLAY_RIGHT) ||
			(this.direction < 0 && minX - STEP_X < PLAY_LEFT)
		) {
			this.descend()
		} else {
			for (const invader of alive) {
				invader.x += this.direction * STEP_X
			}
		}

		this.frame ^= 1

		for (const invader of alive) {
			if (invader.y >= BREACH_ROW) {
				this.breached = true
				break
			}
		}
	}

	private descend(): void {
		for (const invader of this.invaders) {
			if (invader.alive) {
				invader.y += STEP_DOWN
			}
		}

		this.direction = (this.direction * -1) as 1 | -1
	}

	// Bottom-most alive invaders per column — only those can shoot.
	// Deeper columns (perColumn > 1) unlock extra shooters on harder waves.
	shooters(perColumn = 1): Invader[] {
		const shooters: Invader[] = []

		for (let col = 0; col < FORMATION_COLS; col++) {
			const alive = this.invaders.filter(
				(invader) => invader.alive && invader.col === col,
			)
			alive.sort((a, b) => b.y - a.y)

			for (let i = 0; i < perColumn; i++) {
				const shooter = alive[i]

				if (shooter) {
					shooters.push(shooter)
				}
			}
		}

		return shooters
	}

	hitTest(rect: Rect): Invader | null {
		for (const invader of this.invaders) {
			if (invader.alive && rectsOverlap(rect, this.rectOf(invader))) {
				return invader
			}
		}

		return null
	}

	rectOf(invader: Invader): Rect {
		return { x: invader.x, y: invader.y, w: INVADER_W, h: INVADER_H }
	}

	remove(invader: Invader): void {
		if (!invader.alive) {
			return
		}

		invader.alive = false
		this.aliveCount--
	}
}