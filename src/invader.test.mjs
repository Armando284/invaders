import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
	FORMATION_COLS,
	FORMATION_ROWS,
	FORMATION_TOP,
	FORMATION_X,
} from './constants.ts'
import { Formation } from './invader.ts'

test('formation resets with 30 living invaders', () => {
	const formation = new Formation()

	assert.equal(formation.aliveCount, FORMATION_COLS * FORMATION_ROWS)
	assert.equal(formation.invaders.length, 30)
	assert.equal(formation.breached, false)
})

test('invaders are laid out left to right, top to bottom', () => {
	const formation = new Formation()
	const head = formation.invaders[0]
	const bottomLeft = formation.invaders[24]

	assert.ok(head)
	assert.equal(head.x, FORMATION_X)
	assert.equal(head.y, FORMATION_TOP)
	assert.equal(head.kind, 0)

	assert.ok(bottomLeft)
	assert.equal(bottomLeft.row, 4)
	assert.equal(bottomLeft.col, 0)
	assert.equal(bottomLeft.x, FORMATION_X)
	assert.equal(bottomLeft.y, FORMATION_TOP + 8)
	assert.equal(bottomLeft.kind, 2)
})

test('step moves the formation sideways and flips frames', () => {
	const formation = new Formation()
	const before = formation.invaders[0]?.x
	formation.step()

	assert.equal(formation.invaders[0]?.x, (before ?? 0) + 2)
	assert.equal(formation.frame, 1)
})

test('step descends when the formation hits the right wall', () => {
	const formation = new Formation()

	for (const invader of formation.invaders) {
		invader.x += 26
	}

	const yBefore = formation.invaders[0].y
	formation.step()

	assert.equal(formation.invaders[0].y, yBefore + 1)
	assert.equal(formation.direction, -1)
})

test('shooters returns only bottom-most invader per column', () => {
	const formation = new Formation()
	formation.remove(formation.invaders[0])
	formation.remove(formation.invaders[1])
	formation.remove(formation.invaders[2])
	formation.remove(formation.invaders[3])
	formation.remove(formation.invaders[4])

	const shooters = formation.shooters()

	assert.equal(shooters.length, FORMATION_COLS)
	assert.equal(shooters.every((invader) => invader.col < FORMATION_COLS), true)
})

test('hitTest finds an invader at a given rect', () => {
	const formation = new Formation()
	const hit = formation.hitTest({ x: FORMATION_X, y: FORMATION_TOP, w: 1, h: 1 })

	assert.ok(hit)
	assert.equal(hit.row, 0)
	assert.equal(hit.col, 0)
})

test('remove decrements the alive count', () => {
	const formation = new Formation()
	const target = formation.invaders[0]

	formation.remove(target)

	assert.equal(target.alive, false)
	assert.equal(formation.aliveCount, 29)
	assert.equal(formation.hitTest(formation.rectOf(target)), null)
})

test('shooters can reach deeper into each column', () => {
	const formation = new Formation()
	const limit = 2
	const shooters = formation.shooters(limit)

	assert.equal(shooters.length, FORMATION_COLS * limit)

	const bottom = shooters[0]
	assert.ok(bottom)
	assert.equal(bottom.alive, true)

	const columnTop = shooters[1]
	assert.ok(columnTop)
	assert.equal(columnTop.col, 0)
	assert.ok(columnTop.y < bottom.y)
})