import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
	bulletRect,
	makeProjectile,
	PATTERN_DIAGONAL,
	PATTERN_SINE,
	prune,
	updateProjectiles,
} from './projectile.ts'

test('makeProjectile stamps a live bullet', () => {
	const bullet = makeProjectile(3, 5, -11)

	assert.equal(bullet.x, 3)
	assert.equal(bullet.y, 5)
	assert.equal(bullet.vy, -11)
	assert.equal(bullet.alive, true)
})

test('updateProjectiles moves bullets vertically', () => {
	const bullet = makeProjectile(3, 5, -11)
	updateProjectiles([bullet], 1000, 0, 22)

	assert.equal(bullet.y, -6)
	assert.equal(bullet.alive, false)
})

test('updateProjectiles kills bullets past min and max', () => {
	const below = makeProjectile(0, 0, 0)
	updateProjectiles([below], 1000, 1, 22)
	assert.equal(below.alive, false)

	const above = makeProjectile(0, 22, 1)
	updateProjectiles([above], 1000, 1, 22)
	assert.equal(above.alive, false)
})

test('bulletRect centers the bullet horizontally', () => {
	const rect = bulletRect({ x: 10, y: 4, vy: 0, alive: true })

	assert.equal(rect.x, 10.25)
	assert.equal(rect.y, 4)
	assert.equal(rect.w, 0.5)
	assert.equal(rect.h, 0.5)
})

test('prune removes dead bullets', () => {
	const bullets = [
		makeProjectile(0, 0, 1),
		makeProjectile(0, 0, 1),
		makeProjectile(0, 0, 1),
	]
	bullets[1].alive = false
	prune(bullets)

	assert.equal(bullets.length, 2)
})

test('diagonal bullets drift sideways while falling', () => {
	const bullet = makeProjectile(10, 5, 5, { pattern: PATTERN_DIAGONAL, vx: 2 })
	updateProjectiles([bullet], 1000, 0, 22)

	assert.equal(bullet.y, 10)
	assert.equal(bullet.x, 12)
})

test('sine bullets weave around their anchor', () => {
	const bullet = makeProjectile(10, 5, 5, { pattern: PATTERN_SINE })
	updateProjectiles([bullet], 1000, 0, 22)

	assert.equal(bullet.y, 10)
	assert.ok(Math.abs(bullet.x - 10) <= 2.5)
	assert.notEqual(bullet.x, 10)
})

test('bullets are pruned when they drift off the sides', () => {
	const bullet = makeProjectile(40, 5, 5, { pattern: PATTERN_DIAGONAL, vx: 20 })
	updateProjectiles([bullet], 1000, 0, 22)

	assert.equal(bullet.alive, false)
})