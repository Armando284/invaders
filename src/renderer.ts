import {
	BUFF_DURATION,
	CANVAS_HEIGHT,
	CANVAS_WIDTH,
	CELL_SIZE,
	COLS,
	PALETTE,
	PLAY_TOP,
	POPUP_LIFE,
	SHIELD_BUFF_DURATION,
} from './constants.ts'
import { pad } from './geometry.ts'
import type { GameState } from './game-state.ts'
import type { Player } from './player.ts'
import type { Formation } from './invader.ts'
import type { Projectile } from './projectile.ts'
import type { Shield } from './shield.ts'
import type { Ufo } from './ufo.ts'

const SHIP_ROWS = [' /\\ ', '/==\\']
const BUFF_SHIP_COLORS: Record<string, string> = {
	rapid: PALETTE.teal,
	double: PALETTE.gold,
	shield: PALETTE.pale,
}
const FLAME_GLYPH = '≈'
const UFO_GLYPH = '<=>'
const PLAYER_BULLET = '|'
const ENEMY_BULLET = '*'
const SHIELD_GLYPH = '#'

const DROP_GLYPHS: Record<string, string> = {
	rapid: 'R',
	double: 'D',
	shield: 'S',
	bomb: 'B',
}

const DROP_COLORS: Record<string, string> = {
	rapid: PALETTE.teal,
	double: PALETTE.gold,
	shield: PALETTE.pale,
	bomb: PALETTE.red,
}

const STAR_COUNT = 48

// UI elements are laid out in the original 16px-cell design space and
// scaled up so they stay proportional as CELL_SIZE grows.
const UI_SCALE = CELL_SIZE / 16
const ui = (value: number): number => Math.round(value * UI_SCALE)
const uiFont = (size: number): string => `${ui(size)}px monospace`

export class Renderer {
	private readonly context: CanvasRenderingContext2D
	private readonly background: HTMLCanvasElement
	private readonly backgroundContext: CanvasRenderingContext2D | null
	private readonly player: Player
	private readonly formation: Formation
	private readonly playerShots: readonly Projectile[]
	private readonly enemyShots: readonly Projectile[]
	private readonly shields: readonly Shield[]
	private readonly ufo: Ufo
	private readonly state: GameState

	constructor(
		context: CanvasRenderingContext2D,
		player: Player,
		formation: Formation,
		playerShots: readonly Projectile[],
		enemyShots: readonly Projectile[],
		shields: readonly Shield[],
		ufo: Ufo,
		state: GameState,
	) {
		this.context = context
		this.player = player
		this.formation = formation
		this.playerShots = playerShots
		this.enemyShots = enemyShots
		this.shields = shields
		this.ufo = ufo
		this.state = state

		this.background = document.createElement('canvas')
		this.background.width = CANVAS_WIDTH
		this.background.height = CANVAS_HEIGHT
		this.backgroundContext = this.background.getContext('2d')
		this.buildBackground()
	}

	private buildBackground(): void {
		const context = this.backgroundContext

		if (!context) {
			return
		}

		context.fillStyle = '#000'
		context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

		context.font = `${CELL_SIZE}px monospace`
		context.textBaseline = 'top'

		context.fillStyle = '#0f3a1e'
		for (let x = 0; x < COLS; x++) {
			context.fillText('#', x * CELL_SIZE, CELL_SIZE)
			context.fillText('#', x * CELL_SIZE, CANVAS_HEIGHT - CELL_SIZE)
		}

		context.fillStyle = '#144a24'
		for (let i = 0; i < STAR_COUNT; i++) {
			const x = (i * 23 + 7) % (COLS - 2) + 1
			const y = PLAY_TOP + ((i * 37 + 11) % 19)
			context.fillText('\u00b7', x * CELL_SIZE, y * CELL_SIZE)
		}
	}

	private drawBackground(): void {
		this.context.drawImage(this.background, 0, 0)
	}

	render(): void {
		switch (this.state.status) {
			case 'title':
				this.renderTitle()
				return

			case 'gameover':
				this.renderGameOver()
				return

			case 'victory':
				this.renderVictory()
				return
		}

		this.renderHud()
		this.renderGame()

		if (this.state.status === 'paused') {
			this.renderPauseOverlay()
		} else if (this.state.status === 'levelclear') {
			this.renderLevelClearOverlay()
		}
	}

	private clear(): void {
		this.context.fillStyle = '#000'
		this.context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
	}

	private renderHud(): void {
		const ctx = this.context

		ctx.font = uiFont(12)
		ctx.textBaseline = 'top'
		ctx.textAlign = 'left'

		this.drawHudField(ui(16), 'SCORE', pad(this.state.score, 6))
		this.drawHudField(ui(148), 'LVL', pad(this.state.wave, 2))
		this.drawHudField(ui(224), 'LIVES', pad(this.state.lives, 2))

		if (this.state.chain >= 2 && this.state.chainTimer > 0) {
			const multiplier = Math.min(5, this.state.chain)
			const urgent = this.state.chainTimer < 0.5
			const alpha = urgent ? (Math.floor(Date.now() / 150) % 2 === 0 ? 1 : 0.35) : 1

			ctx.fillStyle = PALETTE.gold
			ctx.globalAlpha = alpha
			ctx.fillText(`x${multiplier} CHAIN`, ui(300), ui(6))
			ctx.globalAlpha = 1
		}

		if (this.state.buff && this.state.buffTimer > 0) {
			const label = `${this.state.buff.toUpperCase()} ${Math.ceil(this.state.buffTimer)}`
			const total =
				this.state.buff === 'shield' ? SHIELD_BUFF_DURATION : BUFF_DURATION
			const fraction = Math.max(0, Math.min(1, this.state.buffTimer / total))
			const warning = this.state.buffTimer <= 2
			const alpha = warning
				? Math.floor(Date.now() / 200) % 2 === 0
					? 1
					: 0.35
				: 1
			const color = warning ? PALETTE.red : PALETTE.teal
			const barX = ui(380)
			const barY = ui(22)
			const barWidth = ui(44)

			ctx.globalAlpha = alpha
			ctx.fillStyle = color
			ctx.fillText(label, barX, ui(6))

			ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'
			ctx.fillRect(barX, barY, barWidth, ui(3))
			ctx.fillStyle = color
			ctx.fillRect(barX, barY, Math.max(ui(2), Math.round(barWidth * fraction)), ui(3))
			ctx.globalAlpha = 1
		}

		ctx.textAlign = 'right'
		ctx.fillStyle = PALETTE.gold
		ctx.fillText(`HI ${pad(this.state.hiScore, 6)}`, CANVAS_WIDTH - ui(16), ui(6))
		ctx.textAlign = 'left'
	}

	private drawHudField(x: number, label: string, value: string): void {
		const ctx = this.context

		ctx.fillStyle = '#5a9a6a'
		ctx.fillText(label, x, ui(6))

		const width = ctx.measureText(label).width
		ctx.fillStyle = PALETTE.bright
		ctx.fillText(value, x + width + ui(10), ui(6))
	}

	private renderGame(): void {
		const ctx = this.context

		if (this.state.shake > 0) {
			const magnitude = this.state.shake * 0.5
			ctx.save()
			ctx.translate(
				(Math.random() * 2 - 1) * magnitude,
				(Math.random() * 2 - 1) * magnitude,
			)
		}

		ctx.font = `${CELL_SIZE}px monospace`
		ctx.textBaseline = 'top'
		ctx.textAlign = 'left'

		this.drawBackground()
		this.renderShields()
		this.renderUfo()
		this.renderFormation()
		this.renderEnemyBullets()
		this.renderPlayerBullets()
		this.renderDrops()
		this.renderPlayer()
		this.renderParticles()
		this.renderPopups()

		if (this.state.flash > 0) {
			const alpha = Math.min(1, this.state.flash * 4)
			ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
			ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
		}

		if (this.state.waveIntro > 0) {
			this.renderWaveIntro()
		}

		if (this.state.shake > 0) {
			ctx.restore()
		}
	}

	private renderFormation(): void {
		const ctx = this.context
		const frame = this.formation.frame

		for (const invader of this.formation.invaders) {
			if (!invader.alive) {
				continue
			}

			const color = this.formation.colorFor(invader)
			const glyph = this.formation.glyphFor(invader, frame)

			ctx.globalAlpha = frame === 0 ? 1 : 0.72

			this.withGlow(ui(4), color, () => {
				ctx.fillStyle = color
				ctx.fillText(glyph, invader.x * CELL_SIZE, invader.y * CELL_SIZE)
			})
		}

		ctx.globalAlpha = 1
	}

	private renderUfo(): void {
		if (!this.ufo.active) {
			return
		}

		const blink = Math.floor(Date.now() / 140) % 2 === 0

		this.context.globalAlpha = blink ? 1 : 0.55

		this.withGlow(ui(5), PALETTE.gold, () => {
			this.context.fillStyle = PALETTE.gold
			this.context.fillText(
				UFO_GLYPH,
				this.ufo.x * CELL_SIZE,
				this.ufo.y * CELL_SIZE,
			)
		})

		this.context.globalAlpha = 1
	}

	private renderPlayerBullets(): void {
		this.context.fillStyle = PALETTE.teal

		for (const bullet of this.playerShots) {
			if (bullet.alive) {
				this.context.fillText(
					PLAYER_BULLET,
					bullet.x * CELL_SIZE,
					bullet.y * CELL_SIZE,
				)
			}
		}
	}

	private renderEnemyBullets(): void {
		this.context.fillStyle = '#ff9a58'

		for (const bullet of this.enemyShots) {
			if (bullet.alive) {
				this.context.fillText(
					ENEMY_BULLET,
					bullet.x * CELL_SIZE,
					bullet.y * CELL_SIZE,
				)
			}
		}
	}

	private renderShields(): void {
		const ctx = this.context
		ctx.fillStyle = PALETTE.shield

		for (const shield of this.shields) {
			for (let r = 0; r < shield.cells.length; r++) {
				const row = shield.cells[r]

				for (let c = 0; c < row.length; c++) {
					if (row[c]) {
						ctx.fillText(
							SHIELD_GLYPH,
							(shield.x + c) * CELL_SIZE,
							(shield.y + r) * CELL_SIZE,
						)
					}
				}
			}
		}
	}

	private renderDrops(): void {
		const now = Date.now()

		for (const drop of this.state.drops) {
			const glyph = DROP_GLYPHS[drop.type] ?? '?'
			const color = DROP_COLORS[drop.type] ?? PALETTE.green
			const blink = Math.floor(now / 160) % 2 === 0

			this.context.globalAlpha = blink ? 1 : 0.45

			this.withGlow(ui(6), color, () => {
				this.context.fillStyle = color
				this.context.fillText(glyph, drop.x * CELL_SIZE, drop.y * CELL_SIZE)
			})
		}

		this.context.globalAlpha = 1
	}

	private renderPlayer(): void {
		if (this.state.deathTimer > 0) {
			this.context.fillStyle = PALETTE.red
			this.context.fillText(
				'X',
				this.player.x * CELL_SIZE + CELL_SIZE * 0.75,
				this.player.y * CELL_SIZE + CELL_SIZE,
			)
			return
		}

		if (
			this.state.invincible > 0 &&
			Math.floor(Date.now() / 130) % 2 === 0
		) {
			return
		}

		// Powered-up ship: the hull tints with the buff (RAPID wave blue,
		// DOUBLE gold, SHIELD pale), pumps a stronger glow and throws a
		// flickering engine flame behind it.
		const buffColor = this.state.buff
			? BUFF_SHIP_COLORS[this.state.buff]
			: undefined
		const flameOn = this.state.buff && Math.floor(Date.now() / 90) % 2 === 0
		const flameAlpha = this.state.buff && this.state.buffTimer > 0 ? 0.95 : 0

		this.withGlow(buffColor ? ui(9) : ui(5), buffColor ?? PALETTE.green, () => {
			this.context.fillStyle = PALETTE.bright

			SHIP_ROWS.forEach((row, index) => {
				const drawX = this.player.x * CELL_SIZE - this.player.recoil * CELL_SIZE

				if (buffColor && (this.state.buff === 'rapid' || this.state.buff === 'double')) {
					// tinted hull + tiny accent pixel where the cannon pulse comes out
					this.context.globalAlpha = 0.15
					this.context.fillStyle = buffColor
					this.context.fillText(row, drawX, (this.player.y + index) * CELL_SIZE)
					this.context.globalAlpha = 1
				}

				this.context.fillStyle = PALETTE.white
				this.context.fillText(row, drawX, (this.player.y + index) * CELL_SIZE)
			})
		})

		// engine flame: a flickering 2-cell afterglow behind the cannon
		if (flameOn && this.state.buffTimer > 0) {
			this.context.globalAlpha = flameAlpha
			this.context.fillStyle = buffColor ?? PALETTE.green
			this.context.fillText(
				FLAME_GLYPH,
				this.player.x * CELL_SIZE - CELL_SIZE,
				(this.player.y + 1) * CELL_SIZE,
			)
			this.context.globalAlpha = 1
		}

		// shield bubble: pulsing rounded bracket all around the ship
		if (this.state.buff === 'shield' && this.state.buffTimer > 0) {
			const pulse = 1 + 0.15 * Math.sin(Date.now() / 120)
			this.withGlow(ui(10), PALETTE.pale, () => {
				this.context.fillStyle = 'rgba(160, 255, 210, 0.55)'
				this.context.font = uiFont(13 * pulse)
				this.context.fillText(
					'([O])',
					this.player.x * CELL_SIZE - CELL_SIZE * 0.5,
					this.player.y * CELL_SIZE,
				)
			})
		}
	}

	private renderParticles(): void {
		for (const particle of this.state.particles) {
			const px = particle.x * CELL_SIZE
			const py = particle.y * CELL_SIZE
			const size = particle.size * UI_SCALE
			const alpha = Math.max(0, particle.life / particle.maxLife)

			this.context.fillStyle = particle.color
			this.context.globalAlpha = alpha
			this.context.fillRect(
				px + CELL_SIZE / 2 - size / 2,
				py + CELL_SIZE / 2 - size / 2,
				size,
				size,
			)
		}

		this.context.globalAlpha = 1
	}

	private renderPopups(): void {
		this.context.textAlign = 'left'
		this.context.font = uiFont(10)

		for (const popup of this.state.popups) {
			const px = popup.x * CELL_SIZE
			const py = popup.y * CELL_SIZE
			const progress = 1 - popup.life / POPUP_LIFE

			this.context.globalAlpha = Math.max(
				0,
				Math.min(1, popup.life / POPUP_LIFE),
			)
			this.context.fillStyle = popup.color
			this.context.fillText(popup.text, px + ui(4), py - progress * ui(26))
		}

		this.context.globalAlpha = 1
	}

	private renderWaveIntro(): void {
		const ctx = this.context
		const ready = Math.floor(Date.now() / 400) % 2 === 0

		ctx.textAlign = 'center'

		this.withGlow(ui(8), PALETTE.green, () => {
			ctx.fillStyle = PALETTE.green
			ctx.font = uiFont(22)
			ctx.fillText(`WAVE ${pad(this.state.wave, 2)}`, CANVAS_WIDTH / 2, ui(132))

		if (this.state.mission !== null && this.state.mission !== undefined) {
			ctx.fillStyle = PALETTE.gold
			ctx.font = uiFont(11)
			ctx.textAlign = 'center'
			ctx.fillText(`MISIÓN: ${MISSION_LABELS[this.state.mission]}`, CANVAS_WIDTH / 2, ui(152))
		}
		})

		ctx.fillStyle = ready ? PALETTE.white : '#5a7a5a'
		ctx.font = uiFont(12)
		ctx.fillText('READY?', CANVAS_WIDTH / 2, ui(166))

		ctx.textAlign = 'left'
	}

	private renderPauseOverlay(): void {
		const ctx = this.context

		ctx.fillStyle = 'rgba(0, 0, 0, 0.72)'
		ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

		ctx.textAlign = 'center'
		ctx.fillStyle = PALETTE.green
		ctx.font = uiFont(20)
		ctx.fillText('PAUSED', CANVAS_WIDTH / 2, ui(104))

		ctx.fillStyle = PALETTE.white
		ctx.font = uiFont(11)
		ctx.fillText('P RESUME // R RESTART // Q QUIT', CANVAS_WIDTH / 2, ui(136))

		ctx.textAlign = 'left'
	}

	private renderLevelClearOverlay(): void {
		const ctx = this.context
		const next = Math.floor(Date.now() / 400) % 2 === 0

		ctx.fillStyle = 'rgba(0, 0, 0, 0.72)'
		ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

		ctx.textAlign = 'center'
		ctx.fillStyle = PALETTE.gold
		ctx.font = uiFont(20)
		ctx.fillText(
			`WAVE ${pad(this.state.wave, 2)} CLEARED`,
			CANVAS_WIDTH / 2,
			ui(104),
		)

		ctx.fillStyle = next ? PALETTE.teal : '#2a5a4a'
		ctx.font = uiFont(11)
		ctx.fillText(
			`NEXT WAVE IN ${Math.max(1, Math.ceil(this.state.clearTimer))} // ENTER SKIPS`,
			CANVAS_WIDTH / 2,
			ui(136),
		)

		ctx.textAlign = 'left'
	}

	private renderVictory(): void {
		const ctx = this.context
		const prompt = Math.floor(Date.now() / 500) % 2 === 0

		this.clear()
		this.drawMenuRain()
		ctx.textBaseline = 'top'
		ctx.textAlign = 'center'

		this.withGlow(ui(8), PALETTE.green, () => {
			ctx.fillStyle = PALETTE.green
			ctx.font = uiFont(26)
			ctx.fillText('GRID SECURED', CANVAS_WIDTH / 2, ui(48))
		})

		ctx.fillStyle = PALETTE.teal
		ctx.font = uiFont(13)
		ctx.fillText('DEFENSE COMPLETE // ALL HOSTILES DOWN', CANVAS_WIDTH / 2, ui(88))

		ctx.fillStyle = PALETTE.bright
		ctx.font = uiFont(14)
		ctx.fillText(`SCORE ${pad(this.state.scoreDisplay, 6)}`, CANVAS_WIDTH / 2, ui(118))

		ctx.fillStyle = PALETTE.pale
		ctx.font = uiFont(12)
		ctx.fillText(`WAVE ${pad(this.state.wave, 2)} DEFENDED`, CANVAS_WIDTH / 2, ui(146))

		ctx.fillStyle = prompt ? PALETTE.green : '#0a3d17'
		ctx.font = uiFont(12)
		ctx.fillText('PRESS ENTER FOR ENDLESS DEFENSE', CANVAS_WIDTH / 2, ui(180))

		ctx.fillStyle = '#5a7a5a'
		ctx.font = uiFont(10)
		ctx.fillText(`RUN ${pad(this.state.seed, 8)}  //  C COPY RESULT`, CANVAS_WIDTH / 2, ui(204))

		this.renderPopups()
		ctx.textAlign = 'left'
	}

	private renderGameOver(): void {
		const ctx = this.context

		this.clear()
		this.drawMenuRain()
		ctx.textBaseline = 'top'
		ctx.textAlign = 'center'

		ctx.fillStyle = PALETTE.red
		ctx.font = uiFont(26)
		ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, ui(36))

		ctx.fillStyle = PALETTE.bright
		ctx.font = uiFont(15)
		ctx.fillText(
			`SCORE ${pad(this.state.scoreDisplay, 6)}  //  WAVE ${pad(this.state.wave, 2)}`,
			CANVAS_WIDTH / 2,
			ui(72),
		)

		ctx.fillStyle = '#5a7a5a'
		ctx.font = uiFont(10)
		ctx.fillText(`RUN ${pad(this.state.seed, 8)}  //  C COPY RESULT`, CANVAS_WIDTH / 2, ui(92))

		let y = ui(120)

		if (this.state.newHi) {
			ctx.fillStyle = PALETTE.gold
			ctx.font = uiFont(15)
			ctx.fillText('NEW HI-SCORE!', CANVAS_WIDTH / 2, y)
			y += ui(22)
		}

		if (this.state.hsEntry) {
			ctx.fillStyle = PALETTE.green
			ctx.font = uiFont(11)
			ctx.fillText('ENTER YOUR INITIALS:', CANVAS_WIDTH / 2, y)
			y += ui(26)

			for (let i = 0; i < this.state.hsName.length; i++) {
				const blinking =
					i === this.state.hsIndex && Math.floor(Date.now() / 300) % 2 === 0
				const character = blinking ? '\u2588' : this.state.hsName[i]

				ctx.font = uiFont(24)
				ctx.fillStyle = PALETTE.white
				ctx.fillText(character, CANVAS_WIDTH / 2 - ui(26) + i * ui(26), y)
			}

			y += ui(40)
		} else {
			ctx.fillStyle = '#5a7a5a'
			ctx.font = uiFont(11)
			ctx.fillText('ENTER RESTART  //  T TITLES  //  C COPY', CANVAS_WIDTH / 2, y)
			y += ui(20)
		}

		y += ui(30)

		ctx.fillStyle = PALETTE.green
		ctx.font = uiFont(13)
		ctx.fillText('--- HIGH SCORES ---', CANVAS_WIDTH / 2, y)
		y += ui(22)

		ctx.font = uiFont(12)

		this.state.scores.forEach((entry, index) => {
			ctx.fillStyle = index === 0 ? PALETTE.gold : PALETTE.green
			ctx.fillText(
				`${index + 1}. ${entry.name}  ${pad(entry.score, 6)}`,
				CANVAS_WIDTH / 2,
				y + index * ui(18),
			)
		})

		this.renderPopups()
		ctx.textAlign = 'left'
	}

	private renderTitle(): void {
		const ctx = this.context
		const prompt = Math.floor(Date.now() / 500) % 2 === 0

		this.clear()
		this.drawMenuRain()
		ctx.textBaseline = 'top'
		ctx.textAlign = 'center'

		this.withGlow(ui(10), '#00ff66', () => {
			ctx.fillStyle = PALETTE.green
			ctx.font = uiFont(28)
			ctx.fillText('INVADERS.EXE', CANVAS_WIDTH / 2, ui(42))
		})

		ctx.fillStyle = PALETTE.teal
		ctx.font = uiFont(13)
		ctx.fillText('DEFEND THE GRID', CANVAS_WIDTH / 2, ui(82))

		ctx.fillStyle = '#1d6b33'
		ctx.font = uiFont(13)
		ctx.fillText('#'.repeat(40), CANVAS_WIDTH / 2, ui(102))

		const lines = [
			'LEFT/RIGHT or A/D ......... MOVE',
			'SPACE ...................... FIRE',
			'P / ESC ................... PAUSE',
			'',
			'DESTROY THE FORMATION TO CLEAR EACH WAVE',
			'ELITE <@> 30   WING ^ 20   WALKER W 10',
		]

		ctx.fillStyle = PALETTE.pale
		ctx.font = uiFont(11)

		lines.forEach((line, index) => {
			ctx.fillText(line, CANVAS_WIDTH / 2, ui(122) + index * ui(16))
		})

		ctx.fillStyle = prompt ? PALETTE.green : '#0a3d17'
		ctx.font = uiFont(14)
		ctx.fillText('> PRESS ENTER TO DEFEND <', CANVAS_WIDTH / 2, ui(226))

		ctx.fillStyle = PALETTE.gold
		ctx.font = uiFont(13)
		ctx.fillText(`HI-SCORE ${pad(this.state.hiScore, 6)}`, CANVAS_WIDTH / 2, ui(256))

		ctx.fillStyle = '#5a7a5a'
		ctx.font = uiFont(10)
		ctx.fillText(
			`TODAY ${pad(this.state.seed, 8)}  //  ${this.state.unlockedCount} LOGROS`,
			CANVAS_WIDTH / 2,
			ui(272),
		)
		ctx.fillText('P PAUSE // M MUTE', CANVAS_WIDTH / 2, ui(286))

		ctx.textAlign = 'left'
	}

	private drawMenuRain(): void {
		const now = Date.now()
		const ctx = this.context

		ctx.fillStyle = 'rgba(48, 120, 70, 0.25)'
		ctx.font = uiFont(14)

		for (let i = 0; i < 60; i++) {
			const x = (i * 83 + 9) % CANVAS_WIDTH
			const y = ((now * 0.01 + i * 131) % (CANVAS_HEIGHT + 40)) - 20
			const glyph = '0123456789ABCDEF'[(i * 5 + Math.floor(now / 400)) % 16]

			ctx.fillText(glyph, x, y)
		}
	}

	private withGlow(blur: number, color: string, draw: () => void): void {
		const ctx = this.context

		ctx.shadowColor = color
		ctx.shadowBlur = blur
		draw()
		ctx.shadowBlur = 0
	}
}