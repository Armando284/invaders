import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Shield } from './shield.ts'

test('shield resets with the full shape', () => {
	const shield = new Shield(5, 16)

	assert.equal(shield.cells.length, 3)
	assert.equal(shield.cells[0].length, 7)
	assert.equal(shield.aliveCells, 19)
	assert.equal(shield.hasCells(), true)
})

test('vacateBullet empties overlapping cells', () => {
	const shield = new Shield(5, 16)
	const emptied = shield.vacateBullet({ x: 5, y: 16, w: 1, h: 1 })

	assert.equal(emptied, true)
	assert.equal(shield.cells[0][0], false)
	assert.equal(shield.aliveCells, 18)
})

test('vacateBullet reports a miss without changing cells', () => {
	const shield = new Shield(5, 16)
	const hit = shield.vacateBullet({ x: 0, y: 0, w: 1, h: 1 })

	assert.equal(hit, false)
	assert.equal(shield.aliveCells, 19)
})

test('shield is empty and hasCells false once depleted', () => {
	const shield = new Shield(5, 16)

	while (shield.hasCells()) {
		shield.vacateBullet({ x: 5, y: 16, w: 7, h: 3 })
	}

	assert.equal(shield.aliveCells, 0)
	assert.equal(shield.hasCells(), false)
})