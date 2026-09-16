const AUTO_START_DELAY = 1800

const BOOT_TEMPLATES = [
	[
		'INVADERS.EXE - GRID DEFENSE v1.0',
		'',
		'MEMORY CHECK .............. OK',
		'LOADING INVASION FIELD .... OK',
		'HOSTILE FORMATION ......... 30 DETECTED',
		'SHIELD ARRAY .............. ONLINE',
		'ACOUSTIC CHANNEL .......... STANDBY',
	],
	[
		'INVADERS.EXE v1.0 // SENTRY-BIOS',
		'',
		'RADAR SWEEP ............. ACTIVE',
		'LASER COILS ............. CHARGED',
		'ENEMY SIGNATURES ........ 30 CONFIRMED',
		'BUNKER GRID ......... 4 DEPLOYED',
		'KEYBOARD ............... UNLOCKED',
	],
	[
		'INVADERS.EXE v1.0 // FRONTLINE',
		'',
		'UPLINK ................ 300 BAUD',
		'THREAT LEVEL ........... ELEVATED',
		'FORMATION DRIFT ........ SEISMIC',
		'FIRE CONTROL ............ READY',
		'SCANNER ................. ACTIVE',
	],
]

function pickBootTemplate(): string[] {
	const index = Math.floor(Math.random() * BOOT_TEMPLATES.length)
	const template = BOOT_TEMPLATES[index] ?? []

	return [...template, '', 'PRESS ANY KEY OR AUTO-BOOT']
}

const BOOT_LINES = pickBootTemplate()

export class Boot {
	private readonly overlay: HTMLElement
	private readonly output: HTMLElement
	private onComplete: (() => void) | null = null
	private lineIndex = 0
	private charIndex = 0
	private timer = 0
	private done = false

	constructor() {
		const overlay = document.getElementById('boot')
		const output = document.getElementById('boot-text')

		if (!overlay || !output) {
			throw new Error('Boot overlay elements not found')
		}

		this.overlay = overlay
		this.output = output
	}

	start(onComplete: () => void): void {
		this.onComplete = onComplete
		window.addEventListener('keydown', this.handleKeyDown)
		this.overlay.addEventListener('pointerdown', this.handleKeyDown)
		this.typeNextChar()
	}

	private typeNextChar = (): void => {
		const line = BOOT_LINES[this.lineIndex]

		if (line && this.charIndex < line.length) {
			this.output.textContent += line[this.charIndex]
			this.charIndex++
			this.timer = window.setTimeout(this.typeNextChar, 14)
			return
		}

		this.output.textContent += '\n'
		this.lineIndex++
		this.charIndex = 0

		if (this.lineIndex < BOOT_LINES.length) {
			this.timer = window.setTimeout(this.typeNextChar, 120)
			return
		}

		this.timer = window.setTimeout(this.finish, AUTO_START_DELAY)
	}

	private finish = (): void => {
		if (this.done) {
			return
		}

		this.done = true
		window.removeEventListener('keydown', this.handleKeyDown)
		this.overlay.removeEventListener('pointerdown', this.handleKeyDown)
		window.clearTimeout(this.timer)

		this.overlay.classList.add('boot-hidden')

		window.setTimeout(() => {
			this.overlay.remove()
			this.onComplete?.()
		}, 320)
	}

	private handleKeyDown = (): void => {
		if (this.done) {
			return
		}

		this.finish()
	}
}