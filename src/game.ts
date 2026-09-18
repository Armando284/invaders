import {
	ACHIEVEMENTS_KEY,
	BURST_GAP,
	BUFF_DURATION,
	CAMPAIGN_WAVES,
	CHAIN_MAX,
	CHAIN_WINDOW,
	CLEAR_DELAY,
	DEATH_DURATION,
	DIAGONAL_CHANCE,
	DIAGONAL_MIN_WAVE,
	DOUBLE_SLOT,
	DROP_CHANCE,
	DROP_SPEED,
	DROP_TYPES,
	ENEMY_BULLET_SPEED,
	EXTRA_LIFE_CAP,
	EXTRA_LIFE_STEP,
	FIRE_COOLDOWN,
	FORMATION_COLS,
	FORMATION_ROWS,
	HI_SCORE_KEY,
	HITSTOP_MAX,
	HITSTOP_MIN,
	HITSTOP_PER_POINT,
	HITSTOP_UFO,
	INVINCIBLE_DURATION,
	MAX_ENEMY_SHOTS,
	MAX_LIVES,
	MAX_PLAYER_SHOTS,
	MAX_POPUPS,
	MAX_PARTICLES,
	MAX_SCORES,
	MUTED_KEY,
	PLAY_BOTTOM,
	PLAYER_ROW,
	PLAYER_SPEED,
	PLAYER_BULLET_SPEED,
	POPUP_LIFE,
	RAPID_COOLDOWN,
	SCORES_KEY,
	SHIELD_BUFF_DURATION,
	SHIELD_ROW,
	SINE_CHANCE,
	SINE_MIN_WAVE,
	SLOWMO_FACTOR,
	SLOWMO_TIME,
	STATS_KEY,
	WAVE_CLEAR_BONUS,

      MISSION_TYPES,
      MISSION_LABELS,
      MISSION_BONUS_MULT,
	WAVE_INTRO_DURATION,
	type DropType,
} from './constants.ts'
import { Sfx } from './audio.ts'
import type { GameState, ScoreEntry } from './game-state.ts'
import { rectsOverlap } from './geometry.ts'
import { Formation, type Invader } from './invader.ts'
import { Player } from './player.ts'
import {
	bulletRect,
	makeProjectile,
	PATTERN_DIAGONAL,
	PATTERN_SINE,
	prune,
	updateProjectiles,
	type Projectile,
} from './projectile.ts'
import { Shield } from './shield.ts'
import { Ufo } from './ufo.ts'
import { Renderer } from './renderer.ts'
import { dailySeed, mulberry32, seedLabel, todayIso } from './rng.ts'

const PALETTE_GOLD = '#ffcc33'
const PALETTE_RED = '#ff3333'
const PALETTE_ORANGE = '#ff8833'
const PALETTE_SHIELD_SPARK = '#88ffaa'
const PALETTE_TEAL = '#00ffd0'
const CENTER_X = 20
const CENTER_Y = 8

const ACHIEVEMENTS: Record<string, { name: string; desc: string }> = {
	firstWave: { name: 'FIRST BLOOD', desc: 'clear wave 1' },
	flawlessWave: { name: 'FLAWLESS', desc: 'clear a wave without damage' },
	tenK: { name: 'HIGH ROLLER', desc: 'score 10,000+ in one run' },
	chain5: { name: 'ON FIRE', desc: 'reach a x5 chain' },
	ufo5: { name: 'UFO HUNTER', desc: 'destroy 5 UFOs' },
}

const MOVEMENT_KEYS: Record<string, -1 | 0 | 1> = {
	ArrowLeft: -1,
	a: -1,
	A: -1,
	ArrowRight: 1,
	d: 1,
	D: 1,
}

const INITIALS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

export class Game {
	private readonly audio = new Sfx()
	private readonly state: GameState = {
		status: 'title',
		score: 0,
		hiScore: 0,
		wave: 1,
		lives: MAX_LIVES,
		muted: false,
		scoreDisplay: 0,
		waveIntro: 0,
		clearTimer: 0,
		deathTimer: 0,
		invincible: 0,
		flash: 0,
		shake: 0,
		hitstop: 0,
		chain: 0,
		chainTimer: 0,
		slowmo: 0,
		buff: null,
		buffTimer: 0,
		mission: null,
		drops: [],
		popups: [],
		particles: [],
		scores: [],
		seed: 0,
		unlockedCount: 0,
		newHi: false,
		hsEntry: false,
		hsName: 'AAA',
		hsIndex: 0,
	}

	private readonly player = new Player()
	private readonly formation = new Formation()
	private readonly shields: Shield[] = []
	private readonly playerShots: Projectile[] = []
	private readonly enemyShots: Projectile[] = []
	private readonly ufo = new Ufo()
	private renderer!: Renderer

	private lastTime = 0
	private started = false
	private readonly heldKeys = new Set<string>()
	private fireHeld = false
	private fireTimer = 0
	private burstShot = 0
	private burstTimer = 0
	private enemyFireTimer = 0
	private extraNext = EXTRA_LIFE_STEP
	private currentSeed = 0
	private rng: () => number = Math.random
	private waveDamaged = false
	private ufoKills = 0
	private readonly unlocked = new Set<string>()

	constructor(context: CanvasRenderingContext2D) {
		this.state.muted = this.loadMuted()
		this.audio.setMuted(this.state.muted)
		this.state.hiScore = this.loadHiScore()
		this.state.scores = this.loadScores()

		this.currentSeed = dailySeed()
		this.state.seed = this.currentSeed
		this.rng = mulberry32(this.currentSeed)
		this.ufoKills = this.loadUfoKills()

		for (const id of this.loadAchievements()) {
			this.unlocked.add(id)
		}

		this.state.unlockedCount = this.unlocked.size

		for (const x of [5, 14, 23, 32]) {
			this.shields.push(new Shield(x, SHIELD_ROW))
		}

		this.renderer = new Renderer(
			context,
			this.player,
			this.formation,
			this.playerShots,
			this.enemyShots,
			this.shields,
			this.ufo,
			this.state,
		)

		window.addEventListener('keydown', (event) => this.handleKeyDown(event))
		window.addEventListener('keyup', (event) => this.handleKeyUp(event))
	}

	unlockAudio(): void {
		this.audio.unlock()
	}

	start(): void {
		if (this.started) {
			return
		}

		this.started = true
		requestAnimationFrame((time) => this.loop(time))
	}

	private loop(time: number): void {
		const step = Math.min(time - this.lastTime, 50)
		this.lastTime = time

		this.update(step)
		this.renderer.render()

		requestAnimationFrame((nextTime) => this.loop(nextTime))
	}

	private update(dt: number): void {
		if (this.state.status === 'paused') {
			return
		}

		switch (this.state.status) {
			case 'title':
				return

			case 'levelclear':
				this.state.clearTimer -= dt / 1000

				if (this.state.clearTimer <= 0) {
					this.nextWave()
				}
				return

			case 'gameover':
			case 'victory':
				this.updateScoreDisplay(dt)
				this.ageFx(dt)
				return

			case 'playing':
				if (this.state.hitstop > 0) {
					this.state.hitstop -= dt / 1000
					return
				}

				let runDt = dt

				if (this.state.slowmo > 0) {
					this.state.slowmo -= dt / 1000
					runDt = dt * SLOWMO_FACTOR
				}

				this.updatePlaying(runDt)
				return
		}
	}

	private updatePlaying(dt: number): void {
		if (this.state.waveIntro > 0) {
			this.state.waveIntro -= dt / 1000
			this.audio.setTempo(0.9)
			return
		}

		if (this.state.deathTimer > 0) {
			this.state.deathTimer -= dt / 1000
			this.state.flash = Math.max(0, this.state.flash - dt / 1000)
			this.state.shake = Math.max(0, this.state.shake - dt / 50)
			this.spawnDeathEmbers()
			this.ageFx(dt * 0.35)
			this.audio.setTempo(0.55)

			if (this.state.deathTimer <= 0) {
				this.state.deathTimer = 0
				this.finishDeath()
			}
			return
		}

		this.audio.setTempo(this.musicTempo())

		this.applyPlayerInput()
		this.player.update(dt)
		this.state.invincible = Math.max(0, this.state.invincible - dt / 1000)

		if (this.state.chainTimer > 0) {
			this.state.chainTimer -= dt / 1000

			if (this.state.chainTimer <= 0) {
				this.state.chain = 0
				this.state.chainTimer = 0
			}
		}

		this.handleFire(dt)
		this.updateBullets(dt)
		this.formation.update(dt, this.formationInterval)
		this.handleEnemyFire(dt)
		this.ufo.update(dt)
		this.updateDrops(dt)
		this.ageFx(dt)

		if (this.state.buffTimer > 0) {
			this.state.buffTimer -= dt / 1000

			if (this.state.buffTimer <= 0) {
				this.state.buff = null
				this.state.buffTimer = 0
			}
		}

		this.handleBulletCollisions()
		this.handlePlayerPickups()

		if (this.formation.breached) {
			this.gameOver()
			return
		}

		if (this.formation.aliveCount === 0) {
			this.waveCleared()
		}
	}

	private applyPlayerInput(): void {
		this.player.vx = 0

		for (const key of this.heldKeys) {
			const direction = MOVEMENT_KEYS[key]

			if (direction) {
				this.player.vx = direction * PLAYER_SPEED
				return
			}
		}
	}

	private handleFire(dt: number): void {
		this.fireTimer -= dt
		this.burstTimer -= dt

		if (this.burstShot === 1 && this.burstTimer <= 0) {
			this.shoot()
			this.burstShot = 0
			return
		}

		if (this.fireTimer > 0 || !this.fireHeld) {
			return
		}

		if (this.playerShots.length >= this.playerShotLimit) {
			return
		}

		this.shoot()
		this.fireTimer = this.fireCooldown
		this.burstShot = 1
		this.burstTimer = BURST_GAP
	}

	private shoot(): void {
		this.playerShots.push(
			makeProjectile(this.player.x + 1, PLAYER_ROW - 0.4, -PLAYER_BULLET_SPEED),
		)
		this.player.recoil = 0.5
		this.spawnMuzzleFlash()
		this.audio.fire()
	}

	private spawnMuzzleFlash(): void {
		if (this.state.particles.length >= MAX_PARTICLES) {
			return
		}

		this.state.particles.push({
			x: this.player.x + 1.15,
			y: this.player.y - 0.6,
			vx: 0.2,
			vy: -1.5,
			life: 0.11,
			maxLife: 0.11,
			color: PALETTE_TEAL,
			size: 2.4,
		})
	}

	private updateBullets(dt: number): void {
		updateProjectiles(this.playerShots, dt, 1, PLAYER_ROW)

		for (const bullet of this.playerShots) {
			if (bullet.alive && bullet.vy < 0 && bullet.y <= 1) {
				this.resetChain()
				break
			}
		}

		updateProjectiles(this.enemyShots, dt, 0, PLAY_BOTTOM + 1)
		prune(this.playerShots)
		prune(this.enemyShots)
	}

	private resetChain(): void {
		if (this.state.chain === 0) {
			return
		}

		this.state.chain = 0
		this.state.chainTimer = 0
	}

	private handleEnemyFire(dt: number): void {
		this.enemyFireTimer -= dt

		if (this.enemyFireTimer > 0) {
			return
		}

		const shooters = this.formation.shooters(this.shootersPerColumn)

		if (shooters.length > 0 && this.enemyShots.length < this.enemyShotLimit) {
			const shooter =
				shooters[Math.floor(this.rng() * shooters.length)]

			if (shooter) {
				const pattern = this.bulletPattern()
				const speed = this.enemyBulletSpeed
				const options =
					pattern === PATTERN_DIAGONAL
						? { pattern, vx: (this.rng() < 0.5 ? -1 : 1) * speed * 0.55 }
						: pattern === PATTERN_SINE
							? { pattern, phase: this.rng() * Math.PI * 2 }
							: {}

				this.enemyShots.push(
					makeProjectile(shooter.x + 1, shooter.y + 1, speed, options),
				)
				this.audio.alienFire()
			}
		}

		this.enemyFireTimer = this.shootInterval
	}

	// --- collisions ------------------------------------------------------

	private handleBulletCollisions(): void {
		this.handlePlayerShots()
		this.handleEnemyShots()
	}

	private handlePlayerShots(): void {
		for (const bullet of this.playerShots) {
			if (!bullet.alive) {
				continue
			}

			const shotRect = bulletRect(bullet)

			if (this.ufo.active && rectsOverlap(shotRect, this.ufo.rect())) {
				this.destroyUfo(bullet)
				continue
			}

			const hit = this.formation.hitTest(shotRect)

			if (hit) {
				this.destroyInvader(hit, bullet)
				continue
			}

			if (this.damageShield(shotRect)) {
				bullet.alive = false
				this.spawnBurst(
					bullet.x + 0.5,
					bullet.y,
					PALETTE_SHIELD_SPARK,
					4,
					1.6,
					1.6,
				)
				this.audio.shield()
			}
		}
	}

	private handleEnemyShots(): void {
		for (const bullet of this.enemyShots) {
			if (!bullet.alive) {
				continue
			}

			const shotRect = bulletRect(bullet)

			if (this.damageShield(shotRect)) {
				bullet.alive = false
				this.spawnBurst(
					bullet.x + 0.5,
					bullet.y,
					PALETTE_SHIELD_SPARK,
					4,
					1.6,
					1.6,
				)
				this.audio.shield()
				continue
			}

			if (
				this.state.invincible <= 0 &&
				this.state.deathTimer <= 0 &&
				rectsOverlap(shotRect, this.player.rect())
			) {
				bullet.alive = false
				this.loseLife()
			}
		}
	}

	private damageShield(shotRect: { x: number; y: number; w: number; h: number }): boolean {
		for (const shield of this.shields) {
			if (shield.vacateBullet(shotRect)) {
				return true
			}
		}

		return false
	}

	private destroyInvader(invader: Invader, bullet: Projectile): void {
		const points = this.formation.pointsFor(invader.row)
		const multiplier = this.registerKill()
		const gained = points * multiplier

		bullet.alive = false
		this.formation.remove(invader)
		this.addScore(gained)
		this.addPopup(
			`+${gained}${multiplier > 1 ? ` x${multiplier}` : ''}`,
			invader.x,
			invader.y,
			multiplier > 1 ? PALETTE_GOLD : this.formation.colorFor(invader),
		)
		this.spawnBurst(
			invader.x + 1.5,
			invader.y + 0.5,
			this.formation.colorFor(invader),
			8,
			2.4,
			2.2,
		)
		this.state.hitstop = Math.min(
			HITSTOP_MAX,
			HITSTOP_MIN + points * HITSTOP_PER_POINT,
		)

		if (this.rng() < DROP_CHANCE) {
			this.spawnDrop(invader.x + 1, invader.y)
		}

		this.audio.hit(multiplier)
	}

	private spawnDrop(x: number, y: number): void {
		const type = DROP_TYPES[Math.floor(this.rng() * DROP_TYPES.length)]

		if (!type) {
			return
		}

		this.state.drops.push({ x, y, type, life: 6 })
	}

	private updateDrops(dt: number): void {
		const step = dt / 1000
		let alive = 0

		for (const drop of this.state.drops) {
			drop.y += DROP_SPEED * step
			drop.life -= step

			if (drop.life > 0 && drop.y <= PLAYER_ROW) {
				this.state.drops[alive] = drop
				alive++
			}
		}

		this.state.drops.length = alive
	}

	private handlePlayerPickups(): void {
		for (const drop of this.state.drops) {
			if (rectsOverlap(this.player.rect(), { x: drop.x, y: drop.y, w: 1, h: 1 })) {
				this.applyDrop(drop.type)
				drop.life = 0
			}
		}

		this.state.drops = this.state.drops.filter((drop) => drop.life > 0)
	}

	private applyDrop(type: DropType): void {
		const labels: Record<DropType, string> = {
			rapid: 'RAPID FIRE!',
			double: 'DOUBLE SHOT!',
			shield: 'SHIELD UP!',
			bomb: 'BOMB!',
		}

		this.addPopup(labels[type], this.player.x, this.player.y - 1, PALETTE_GOLD)

		if (type === 'rapid') {
			this.state.buff = 'rapid'
			this.state.buffTimer = BUFF_DURATION
			this.audio.extra()
			return
		}

		if (type === 'double') {
			this.state.buff = 'double'
			this.state.buffTimer = BUFF_DURATION
			this.audio.extra()
			return
		}

		if (type === 'shield') {
			this.state.invincible = Math.max(this.state.invincible, SHIELD_BUFF_DURATION)
			this.state.buff = 'shield'
			this.state.buffTimer = SHIELD_BUFF_DURATION
			this.audio.extra()
			return
		}

		this.triggerBomb()
	}

	private triggerBomb(): void {
		this.enemyShots.length = 0

		for (const invader of this.formation.invaders) {
			if (invader.alive && !this.formation.breached) {
				this.destroyInvader(invader, this.invaderBombBullet())
			}
		}

		this.state.shake = 6
		this.audio.ufo()
	}

	private invaderBombBullet(): Projectile {
		return { x: -99, y: -99, vy: 0, vx: 0, pattern: 0, anchorX: -99, phase: 0, t: 0, alive: true }
	}

	private destroyUfo(bullet: Projectile): void {
		const multiplier = this.registerKill()
		const gained = this.ufo.value * multiplier

		this.ufoKills++
		this.saveStats()

		if (this.ufoKills >= 5) {
			this.unlock('ufo5')
		}

		this.ufo.active = false
		this.ufo.respawnRandom()
		// Misión variante determinista (misma semilla → misma misión).
		if (this.state.wave >= 3) {
			const mi = MISSION_TYPES[Math.floor(this.rng() * MISSION_TYPES.length)] ?? 'sniper'
			this.state.mission = mi
if (mi === 'brokenShields' && this.shields.length > 0) {
				this.shields.splice(0, 2)
			}
		} else {
			this.state.mission = null
		}

		bullet.alive = false
		this.addScore(gained)
		this.addPopup(
			`+${gained}${multiplier > 1 ? ` x${multiplier}` : ''}`,
			this.ufo.x,
			this.ufo.y,
			PALETTE_GOLD,
		)
		this.spawnBurst(this.ufo.x + 0.75, this.ufo.y + 0.5, PALETTE_GOLD, 10, 2.6, 2.4)
		this.state.hitstop = HITSTOP_UFO
		this.audio.ufo()
	}

	private registerKill(): number {
		this.state.chain = this.state.chainTimer > 0 ? this.state.chain + 1 : 1
		this.state.chainTimer = CHAIN_WINDOW

		const multiplier = this.state.chain >= 2 ? Math.min(CHAIN_MAX, this.state.chain) : 1

		if (multiplier >= CHAIN_MAX) {
			this.unlock('chain5')
		}

		return multiplier
	}

	private loseLife(): void {
		this.state.lives--
		this.waveDamaged = true
		this.state.flash = 0.3
		this.state.shake = 8
		this.state.deathTimer = DEATH_DURATION
		this.state.slowmo = SLOWMO_TIME
		this.resetChain()
		this.audio.loseLife()
		this.spawnBurst(
			this.player.x + 1,
			this.player.y + 1,
			PALETTE_RED,
			18,
			3,
			3,
		)
	}

	private finishDeath(): void {
		if (this.state.lives <= 0) {
			this.gameOver()
			return
		}

		this.player.reset()
		this.playerShots.length = 0
		this.enemyShots.length = 0
		this.state.invincible = INVINCIBLE_DURATION
	}

	// --- scoring & progression -------------------------------------------

	private addScore(gained: number): void {
		this.state.score += gained

		if (this.state.score >= this.extraNext && this.state.lives < EXTRA_LIFE_CAP) {
			this.state.lives++
			this.extraNext += EXTRA_LIFE_STEP
			this.addPopup('1UP', this.player.x, this.player.y, PALETTE_GOLD)
			this.audio.extra()
		}

		this.updateHiScore()
	}

	private waveCleared(): void {
		if (this.state.wave === 1) {
			this.unlock('firstWave')
		}

		if (!this.waveDamaged) {
			this.unlock('flawlessWave')
		}

		// Bonus de misión: la variante activa se completó al limpiar la ola (determinista).
		if (this.state.mission !== null) {
			const mb = MISSION_BONUS_MULT * this.state.wave
			this.addScore(mb)

			this.addPopup(`MISIÓN +${mb}`, CENTER_X, CENTER_Y, PALETTE_GOLD)
			this.state.mission = null
		}

		const bonus = WAVE_CLEAR_BONUS * this.state.wave

		this.addScore(bonus)
		this.addPopup(`WAVE BONUS +${bonus}`, CENTER_X, CENTER_Y, PALETTE_GOLD)
		this.state.clearTimer = CLEAR_DELAY

		if (this.state.wave >= CAMPAIGN_WAVES) {
			this.state.status = 'victory'
			this.state.scoreDisplay = this.state.score
			this.audio.victory()
			this.updateHiScore()
			return
		}

		this.state.status = 'levelclear'
		this.audio.wave()
		this.updateHiScore()
	}

	private nextWave(): void {
		this.state.wave++
		this.startWave()
	}

	private startWave(): void {
		this.clearArena()
		this.player.reset()
		this.formation.reset()
		this.ufo.respawnRandom()

		for (const shield of this.shields) {
			shield.reset()
		}

		this.state.waveIntro = WAVE_INTRO_DURATION
		this.state.status = 'playing'
		this.state.hitstop = 0
		this.state.chain = 0
		this.state.chainTimer = 0
		this.state.slowmo = 0
		this.state.buff = null
		this.state.buffTimer = 0
		this.state.drops.length = 0
		this.waveDamaged = false
		this.ufo.wave = this.state.wave
		this.burstShot = 0
		this.burstTimer = 0
		this.enemyFireTimer = 900
	}

	private startRun(seed = this.currentSeed): void {
		this.currentSeed = seed
		this.state.seed = seed
		this.rng = mulberry32(seed)
		this.ufo.rng = this.rng
		this.waveDamaged = false

		this.state.score = 0
		this.state.scoreDisplay = 0
		this.state.wave = 1
		this.state.lives = MAX_LIVES
		this.state.newHi = false
		this.state.hsEntry = false
		this.state.hsName = 'AAA'
		this.state.hsIndex = 0
		this.state.deathTimer = 0
		this.state.invincible = 0
		this.state.status = 'playing'
		this.extraNext = EXTRA_LIFE_STEP

		const best = this.state.scores[0]?.score ?? 0
		this.state.hiScore = Math.max(this.loadHiScore(), best)

		this.audio.start()
		this.audio.startMusic()
		this.startWave()
	}

	private clearArena(): void {
		this.playerShots.length = 0
		this.enemyShots.length = 0
		this.state.popups.length = 0
		this.state.particles.length = 0
		this.ufo.active = false
	}

	private gameOver(): void {
		this.audio.stopMusic()

		if (this.state.score >= 10000) {
			this.unlock('tenK')
		}

		const newHi = this.state.score > this.state.hiScore

		this.state.status = 'gameover'
		this.state.newHi = newHi
		this.state.flash = 0
		this.state.shake = 0
		this.audio.gameOver()

		if (newHi) {
			this.updateHiScore()
		}

		if (this.qualifiesForScores(this.state.score)) {
			this.state.hsEntry = true
			this.state.hsName = 'AAA'
			this.state.hsIndex = 0
		} else {
			this.state.hsEntry = false
		}
	}

	// --- input -----------------------------------------------------------

	private handleKeyDown(event: KeyboardEvent): void {
		this.audio.unlock()

		if (!this.started || event.repeat) {
			return
		}

		const key = event.key

		if (key === 'm' || key === 'M') {
			this.toggleMute()
			return
		}

		switch (this.state.status) {
			case 'title':
				if (key === 'Enter' || key === ' ') {
					this.startRun(dailySeed())
				}
				return

			case 'playing':
				if (key === 'p' || key === 'P' || key === 'Escape') {
					this.state.status = 'paused'
					this.audio.pauseMusic()
					return
				}

				if (key === 'ArrowLeft' || key === 'ArrowRight' || key === 'a' || key === 'A' || key === 'd' || key === 'D') {
					this.heldKeys.add(key)
					return
				}

				if (key === ' ') {
					this.fireHeld = true
				}
				return

			case 'paused':
				if (key === 'p' || key === 'P' || key === 'Escape') {
					this.state.status = 'playing'
					this.audio.resumeMusic()
					return
				}

				if (key === 'r' || key === 'R') {
					this.startRun()
					return
				}

				if (key === 'q' || key === 'Q') {
					this.state.status = 'title'
					this.audio.stopMusic()
				}
				return

			case 'levelclear':
				if (key === 'Enter' || key === ' ') {
					this.nextWave()
				}
				return

			case 'victory':
				if (key === 'Enter' || key === ' ') {
					this.nextWave()
				}

				if (key === 'c' || key === 'C') {
					this.copyResult()
				}
				return

			case 'gameover':
				this.handleGameOverKey(key)
				return
		}
	}

	private handleKeyUp(event: KeyboardEvent): void {
		if (!this.started) {
			return
		}

		this.heldKeys.delete(event.key)

		if (event.key === ' ') {
			this.fireHeld = false
		}
	}

	private handleGameOverKey(key: string): void {
		if (this.state.hsEntry) {
			if (key === 'ArrowUp' || key === 'w' || key === 'W') {
				this.cycleInitial(-1)
				return
			}

			if (key === 'ArrowDown' || key === 's' || key === 'S') {
				this.cycleInitial(1)
				return
			}

			if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
				this.state.hsIndex = Math.max(0, this.state.hsIndex - 1)
				return
			}

			if (key === 'ArrowRight' || key === 'd' || key === 'D') {
				this.state.hsIndex = Math.min(2, this.state.hsIndex + 1)
				return
			}

			if (key === 'Enter' || key === ' ') {
				this.submitScore()
			}
			return
		}

		if (key === 'Enter' || key === ' ') {
			this.startRun()
			return
		}

		if (key === 't' || key === 'T') {
			this.state.status = 'title'
			return
		}

		if (key === 'c' || key === 'C') {
			this.copyResult()
		}
	}

	private cycleInitial(step: number): void {
		const letter = this.state.hsName[this.state.hsIndex]

		if (!letter) {
			return
		}

		const index = INITIALS.indexOf(letter)
		const next = (index + step + INITIALS.length) % INITIALS.length
		const updated = this.state.hsName.split('')
		updated[this.state.hsIndex] = INITIALS[next] ?? 'A'
		this.state.hsName = updated.join('')
	}

	private submitScore(): void {
		const entry: ScoreEntry = {
			name: this.state.hsName,
			score: this.state.score,
		}

		this.state.scores = [...this.state.scores, entry]
			.sort((a, b) => b.score - a.score)
			.slice(0, MAX_SCORES)
		this.state.hsEntry = false

		try {
			localStorage.setItem(SCORES_KEY, JSON.stringify(this.state.scores))
		} catch {
			// storage unavailable, ignore
		}
	}

	private toggleMute(): void {
		const muted = !this.audio.isMuted

		this.audio.setMuted(muted)
		this.state.muted = muted

		try {
			localStorage.setItem(MUTED_KEY, muted ? '1' : '0')
		} catch {
			// storage unavailable, ignore
		}
	}

	// --- persistence -----------------------------------------------------

	private loadMuted(): boolean {
		try {
			return localStorage.getItem(MUTED_KEY) === '1'
		} catch {
			return false
		}
	}

	private loadHiScore(): number {
		try {
			const stored = Number(localStorage.getItem(HI_SCORE_KEY)) || 0
			const best = this.state.scores[0]?.score ?? 0

			return Math.max(stored, best)
		} catch {
			return 0
		}
	}

	private loadScores(): ScoreEntry[] {
		try {
			const raw = localStorage.getItem(SCORES_KEY)

			if (!raw) {
				return []
			}

			const parsed = JSON.parse(raw) as unknown

			if (!Array.isArray(parsed)) {
				return []
			}

			return parsed.filter(isScoreEntry)
		} catch {
			return []
		}
	}

	private qualifiesForScores(score: number): boolean {
		if (score <= 0) {
			return false
		}

		const list = this.state.scores

		if (list.length < MAX_SCORES) {
			return true
		}

		return score > (list[list.length - 1]?.score ?? 0)
	}

	private updateHiScore(): void {
		if (this.state.score <= this.state.hiScore) {
			return
		}

		this.state.hiScore = this.state.score

		try {
			localStorage.setItem(HI_SCORE_KEY, String(this.state.hiScore))
		} catch {
			// storage unavailable, ignore
		}
	}

	private loadAchievements(): string[] {
		try {
			const raw = localStorage.getItem(ACHIEVEMENTS_KEY)

			if (!raw) {
				return []
			}

			const parsed = JSON.parse(raw) as unknown

			if (!Array.isArray(parsed)) {
				return []
			}

			return parsed.filter((id): id is string => typeof id === 'string')
		} catch {
			return []
		}
	}

	private saveAchievements(): void {
		try {
			localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify([...this.unlocked]))
		} catch {
			// storage unavailable, ignore
		}
	}

	private loadUfoKills(): number {
		try {
			const raw = localStorage.getItem(STATS_KEY)

			if (!raw) {
				return 0
			}

			const parsed = JSON.parse(raw) as { ufoKills?: unknown }

			return Number(parsed.ufoKills) || 0
		} catch {
			return 0
		}
	}

	private saveStats(): void {
		try {
			localStorage.setItem(STATS_KEY, JSON.stringify({ ufoKills: this.ufoKills }))
		} catch {
			// storage unavailable, ignore
		}
	}

	private unlock(id: string): void {
		if (this.unlocked.has(id)) {
			return
		}

		this.unlocked.add(id)
		this.state.unlockedCount = this.unlocked.size
		this.saveAchievements()

		const achievement = ACHIEVEMENTS[id]

		if (achievement) {
			this.addPopup(`LOGRO: ${achievement.name}`, CENTER_X, 7, PALETTE_GOLD)
			this.audio.extra()
		}
	}

	private copyResult(): void {
		const text = `INVADERS.EXE // ${todayIso()} // SEED ${seedLabel(this.state.seed)} // SCORE ${this.state.score} // WAVE ${this.state.wave}`

		const report = (ok: boolean) => {
			this.addPopup(
				ok ? 'COPIED!' : 'COPY FAILED',
				CENTER_X,
				7,
				ok ? PALETTE_TEAL : PALETTE_RED,
			)
		}

		if (navigator.clipboard?.writeText) {
			navigator.clipboard
				.writeText(text)
				.then(() => report(true))
				.catch(() => report(false))
			return
		}

		const textarea = document.createElement('textarea')
		textarea.value = text
		textarea.style.position = 'fixed'
		textarea.style.opacity = '0'
		document.body.appendChild(textarea)
		textarea.select()

		try {
			document.execCommand('copy')
			report(true)
		} catch {
			report(false)
		} finally {
			document.body.removeChild(textarea)
		}
	}

	// --- difficulty getters ----------------------------------------------

	private get formationInterval(): number {
		const total = FORMATION_COLS * FORMATION_ROWS
		const aliveFactor = 0.55 + 0.45 * (this.formation.aliveCount / total)
		const waveFactor = Math.max(0.4, 1 - 0.09 * (this.state.wave - 1))

		// Clutch: with three or fewer hostiles left the formation barrels
		// down at double pace — the final-man sprint to the shield line.
		const clutchFactor =
			this.formation.aliveCount > 3 || this.formation.aliveCount === 0
				? 1
				: 0.55

		return 1000 * aliveFactor * waveFactor * clutchFactor
	}

	private get shootInterval(): number {
		const total = FORMATION_COLS * FORMATION_ROWS
		const aliveFactor = 0.55 + 0.45 * (this.formation.aliveCount / total)
		const waveFactor = Math.max(0.4, 1 - 0.09 * (this.state.wave - 1))

		return Math.max(600, 1700 * aliveFactor * waveFactor)
	}

	private get enemyBulletSpeed(): number {
		return ENEMY_BULLET_SPEED + Math.min(2, 0.25 * (this.state.wave - 1))
	}

	// Wave modifiers escalate over the campaign.
	private get shootersPerColumn(): number {
		if (this.state.wave >= 6) {
			return 3
		}

		return this.state.wave >= 2 ? 2 : 1
	}

	private get enemyShotLimit(): number {
		return Math.min(5, MAX_ENEMY_SHOTS + Math.floor((this.state.wave - 1) / 3))
	}

	private get fireCooldown(): number {
		return this.state.buff === 'rapid' ? RAPID_COOLDOWN : FIRE_COOLDOWN
	}

	private get playerShotLimit(): number {
		return this.state.buff === 'double' ? DOUBLE_SLOT : MAX_PLAYER_SHOTS
	}

	private bulletPattern(): 0 | 1 | 2 {
		if (this.state.wave >= SINE_MIN_WAVE && this.rng() < SINE_CHANCE) {
			return PATTERN_SINE
		}

		if (this.state.wave >= DIAGONAL_MIN_WAVE && this.rng() < DIAGONAL_CHANCE) {
			return PATTERN_DIAGONAL
		}

		return 0
	}

	// --- visual effects ---------------------------------------------------

	private ageFx(dt: number): void {
		const step = dt / 1000
		let alive = 0

		for (const popup of this.state.popups) {
			popup.life -= step

			if (popup.life > 0) {
				this.state.popups[alive] = popup
				alive++
			}
		}

		this.state.popups.length = alive

		alive = 0

		for (const particle of this.state.particles) {
			particle.life -= step
			particle.x += particle.vx * step
			particle.y += particle.vy * step

			if (particle.life > 0) {
				this.state.particles[alive] = particle
				alive++
			}
		}

		this.state.particles.length = alive
	}

	private musicTempo(): number {
		const total = FORMATION_COLS * FORMATION_ROWS
		const remaining = this.formation.aliveCount
		const ratio = total > 0 ? Math.max(0, remaining) / total : 0

		// Intensity is driven purely by how many hostiles are left on the
		// grid: a full formation keeps the track in the normal time zone
		// (ratio 1 → tempo 1.0); as the grid thins it continuously ramps up
		// to a frantic 0.5 when only a handful remain.
		return 0.5 + 0.5 * ratio
	}

	private addPopup(text: string, x: number, y: number, color: string): void {
		if (this.state.popups.length >= MAX_POPUPS) {
			this.state.popups.shift()
		}

		this.state.popups.push({ text, x, y, life: POPUP_LIFE, color })
	}

	private spawnBurst(
		x: number,
		y: number,
		color: string,
		count: number,
		speed: number,
		size: number,
	): void {
		for (let index = 0; index < count; index++) {
			if (this.state.particles.length >= MAX_PARTICLES) {
				break
			}

			const angle = Math.random() * Math.PI * 2
			const velocity = speed * (0.3 + Math.random() * 0.7)

			this.state.particles.push({
				x,
				y,
				vx: Math.cos(angle) * velocity,
				vy: Math.sin(angle) * velocity,
				life: 0.3 + Math.random() * 0.3,
				maxLife: 0.6,
				color,
				size: size * (0.6 + Math.random() * 0.8),
			})
		}
	}

	private spawnDeathEmbers(): void {
		const position = this.player.rect()
		const palette = [PALETTE_RED, PALETTE_ORANGE, PALETTE_GOLD]

		for (let index = 0; index < 2; index++) {
			this.spawnBurst(
				position.x + 1,
				position.y + 1,
				palette[Math.floor(Math.random() * palette.length)] ?? PALETTE_RED,
				1,
				2.2,
				2.5,
			)
		}
	}

	private updateScoreDisplay(dt: number): void {
		const step = dt / 1000
		this.state.scoreDisplay = Math.min(
			this.state.score,
			this.state.scoreDisplay + (this.state.score * 0.6 + 40) * step,
		)
	}
}

function isScoreEntry(value: unknown): value is ScoreEntry {
	if (typeof value !== 'object' || value === null) {
		return false
	}

	const entry = value as Partial<ScoreEntry>

	return (
		typeof entry.name === 'string' &&
		typeof entry.score === 'number' &&
		entry.name.length > 0 &&
		entry.name.length <= 3
	)
}
