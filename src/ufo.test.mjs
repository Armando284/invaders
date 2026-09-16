import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SHIELD_ROW, UFO_ROW } from './constants.ts'
import { Ufo } from './ufo.ts'

test('ufo starts inactive', () => {
	const ufo = new Ufo()

	assert.equal(ufo.active, false)
})

test('ufo spawns from an edge with a valid value', () => {
	const ufo = new Ufo()
	ufo.spawn()

	assert.ok(ufo.active)
	assert.ok(ufo.x === -6 || ufo.x === 40)
	assert.ok([50, 100, 150].includes(ufo.value))
})

test('ufo moves across and deactivates off-screen', () => {
	const ufo = new Ufo()
	ufo.spawn()
	const fromLeft = ufo.x === -6

	ufo.update(40000)

	if (fromLeft) {
		assert.ok(ufo.x > -6)
	} else {
		assert.ok(ufo.x < 40)
	}

	while (ufo.x > -6 && ufo.x < 44) {
		ufo.update(1000)
	}

	assert.equal(ufo.active, false)
})

test('ufo respawnRandom schedules a later spawn', () => {
	const ufo = new Ufo()
	ufo.active = true
	ufo.respawnRandom()

	assert.equal(ufo.active, false)
	assert.ok(ufo.timer > 0)
})

test('ufo rect sits on the ufo row', () => {
	const rect = new Ufo().rect()

	assert.equal(rect.y, UFO_ROW)
	assert.ok(rect.y !== SHIELD_ROW)
})