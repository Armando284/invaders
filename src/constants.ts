// INVADERS.EXE — shared constants and tunables.
// The whole game works in "cell" units: 1 cell = 1 monospace character cell.

export const CELL_SIZE = 24
export const COLS = 40
export const ROWS = 24
export const CANVAS_WIDTH = COLS * CELL_SIZE
export const CANVAS_HEIGHT = ROWS * CELL_SIZE

// Arena bounds, in cells. The top row (0) is reserved for the HUD.
export const PLAY_LEFT = 1
export const PLAY_RIGHT = 38
export const PLAY_TOP = 2
export const PLAY_BOTTOM = 22

export const PLAYER_ROW = 21
export const PLAYER_SPEED = 9 // cells per second
export const SHIP_WIDTH = 4 // glyph characters

export const FIRE_COOLDOWN = 220 // milliseconds between trigger pulls
export const BURST_GAP = 70 // milliseconds between burst bullets
export const MAX_PLAYER_SHOTS = 2
export const PLAYER_BULLET_SPEED = 11 // cells per second, upward
export const ENEMY_BULLET_SPEED = 5 // cells per second, downward
export const MAX_ENEMY_SHOTS = 3

// Enemy bullet patterns unlocked by wave.
export const DIAGONAL_MIN_WAVE = 3
export const DIAGONAL_CHANCE = 0.45
export const SINE_MIN_WAVE = 5
export const SINE_CHANCE = 0.3

// Power-up drops.

// Per-wave side missions (deterministic — same seed, same mission).
export const MISSION_TYPES = ['sniper', 'brokenShields', 'ufoDouble'] as const
export type MissionType = (typeof MISSION_TYPES)[number]
export const MISSION_BONUS_MULT = 400 // × wave at wave clear
export const MISSION_LABELS: Record<MissionType, string> = {
	sniper: 'FUSILERO',
	brokenShields: 'ESCUDOS ROTOS',
	ufoDouble: 'UFO ×2',
}

export const DROP_CHANCE = 0.07
export const DROP_SPEED = 1.5 // cells per second, downward
export const DROP_TYPES = ['rapid', 'double', 'shield', 'bomb'] as const
export type DropType = (typeof DROP_TYPES)[number]
export const BUFF_DURATION = 8 // seconds for rapid / double
export const SHIELD_BUFF_DURATION = 6 // seconds for shield
export const RAPID_COOLDOWN = 90 // milliseconds between trigger pulls
export const DOUBLE_SLOT = 3 // concurrent shots while double is active

export const FORMATION_COLS = 6
export const FORMATION_ROWS = 5
export const FORMATION_TOP = 3
export const FORMATION_X = 8
export const SLOT_W = 4 // cells between columns
export const STEP_X = 2 // cells per horizontal formation step
export const STEP_DOWN = 1 // cells per descent
export const BREACH_ROW = 18 // invaders reaching this row = invasion

export const SHIELD_ROW = 16
export const SHIELD_XS = [5, 14, 23, 32]
export const SHIELD_SHAPE = ['#######', '#######', ' ##### ']

export const UFO_ROW = 1
export const UFO_SPEED = 5
export const UFO_MIN_GAP = 14000
export const UFO_MAX_GAP = 22000

export const ROW_POINTS = [30, 25, 20, 15, 10]
export const INVADER_GLYPHS: readonly string[][] = [
	['<@>', '<·>'], // elite squad, two frames
	[' ^ ', ' V '], // wing squadron, flaps
	[' W ', ' M '], // ground walkers, steps
]
export const INVADER_COLORS = ['#ff8833', '#33ff66', '#00ffd0']
export const INVADER_KINDS = [0, 0, 1, 1, 2] // by row index

export const MAX_LIVES = 3
export const EXTRA_LIFE_STEP = 10000
export const EXTRA_LIFE_CAP = 6
export const INVINCIBLE_DURATION = 2 // seconds after respawn
export const DEATH_DURATION = 0.9 // seconds of death animation
export const WAVE_INTRO_DURATION = 1.3
export const CLEAR_DELAY = 2.6 // seconds on the wave-clear screen
export const CAMPAIGN_WAVES = 6 // waves to clear in one campaign
export const WAVE_CLEAR_BONUS = 500

export const POPUP_LIFE = 0.9
export const MAX_POPUPS = 30
export const MAX_PARTICLES = 120

// Hit-stop: short world freeze to give kills weight. Seconds.
export const HITSTOP_MIN = 0.035
export const HITSTOP_MAX = 0.09
export const HITSTOP_PER_POINT = 0.0016
export const HITSTOP_UFO = 0.12

// Kill chain / multiplier: consecutive kills within a window.
export const CHAIN_WINDOW = 1.2 // seconds to keep the streak alive
export const CHAIN_MAX = 5 // multiplier ceiling

// Death slow-motion: world runs at a reduced tick briefly after a hit.
export const SLOWMO_TIME = 0.3 // real seconds
export const SLOWMO_FACTOR = 0.5

export const MAX_SCORES = 5
export const SCORES_KEY = 'invaders-scores'
export const HI_SCORE_KEY = 'invaders-hi-score'
export const MUTED_KEY = 'invaders-muted'
export const ACHIEVEMENTS_KEY = 'invaders-achievements'
export const STATS_KEY = 'invaders-stats'
export const SEED_LENGTH = 8 // digits in the displayed daily seed

export const PALETTE = {
	green: '#33ff66',
	bright: '#c8ffd8',
	dimGreen: '#1d6b33',
	teal: '#00ffd0',
	gold: '#ffcc33',
	darkGold: '#5a3a00',
	orange: '#ff8833',
	red: '#ff3333',
	pale: '#88ffaa',
	gray: '#5a7a5a',
	dark: '#0a3d17',
	shield: '#66ff99',
	white: '#ffffff',
} as const