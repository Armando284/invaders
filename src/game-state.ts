export type GameStatus =
	| 'title'
	| 'playing'
	| 'paused'
	| 'levelclear'
	| 'gameover'
	| 'victory'

export interface Popup {
	text: string
	x: number
	y: number
	life: number
	color: string
}

export interface Particle {
	x: number
	y: number
	vx: number
	vy: number
	life: number
	maxLife: number
	color: string
	size: number
}

export interface Drop {
	x: number
	y: number
	type: 'rapid' | 'double' | 'shield' | 'bomb'
	life: number
}

export interface ScoreEntry {
	name: string
	score: number
}

export interface GameState {
	status: GameStatus
	score: number
	hiScore: number
	wave: number
	lives: number
	muted: boolean
	scoreDisplay: number
	waveIntro: number
	clearTimer: number
	deathTimer: number
	invincible: number
	flash: number
	shake: number
	hitstop: number
	chain: number
	chainTimer: number
	slowmo: number
	buff: 'rapid' | 'double' | 'shield' | null
	buffTimer: number
	mission: 'sniper' | 'brokenShields' | 'ufoDouble' | null
	drops: Drop[]
	popups: Popup[]
	particles: Particle[]
	scores: ScoreEntry[]
	seed: number
	unlockedCount: number
	newHi: boolean
	hsEntry: boolean
	hsName: string
	hsIndex: number
}