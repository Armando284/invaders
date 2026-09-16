import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PLAYER_ROW } from './constants.ts'
import { Player } from './player.ts'

test('player resets to a centered position', () => {
	const player = new Player()

	assert.equal(player.x, 18.5)
	assert.equal(player.vx, 0)
})

test('player y is the play row', () => {
	const player = new Player()

	assert.equal(player.y, PLAYER_ROW)
})

test('player update applies velocity and clamps to bounds', () => {
	const player = new Player()
	player.vx = 9
	player.update(1000)
	assert.equal(player.x, 18.5 + 9)

	player.vx = -999
	player.update(1000)
	assert.equal(player.x, 1)

	player.vx = 999
	player.update(1000)
	assert.equal(player.x, 36)
})

test('player rect has ship width/2 and 2 rows height', () => {
	const player = new Player()
	const rect = player.rect()

	assert.equal(rect.x, player.x)
	assert.equal(rect.y, player.y)
	assert.equal(rect.w, 2)
	assert.equal(rect.h, 2)
})

test('player recoil decays over time and resets', () => {
	const player = new Player()
	player.recoil = 0.5
	player.update(100)
	assert.ok(player.recoil < 0.5)
	assert.ok(player.recoil > 0)

	player.recoil = 1
	player.update(10000)
	assert.equal(player.recoil, 0)

	player.reset()
	assert.equal(player.recoil, 0)
})