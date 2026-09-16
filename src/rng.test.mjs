import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dailySeed, mulberry32, seedLabel } from './rng.ts'

test('mulberry32 is deterministic for a given seed', () => {
	const seq = (seed) => {
		const rng = mulberry32(seed)

		return Array.from({ length: 8 }, () => Math.round(rng() * 100) / 100)
	}

	assert.deepEqual(seq(20260916), seq(20260916))
})

test('mulberry32 draws live in [0, 1)', () => {
	const rng = mulberry32(7)

	for (let i = 0; i < 200; i++) {
		const draw = rng()
		assert.ok(draw >= 0 && draw < 1)
	}
})

test('different seeds diverge', () => {
	const a = mulberry32(1)()
	const b = mulberry32(2)()

	assert.notEqual(a, b)
})

test('dailySeed is a date-based integer', () => {
	const seed = dailySeed()

	assert.equal(typeof seed, 'number')
	assert.ok(seed >= 20000101 && seed <= 21000101)
})

test('seedLabel pads to 8 digits', () => {
	assert.equal(seedLabel(20260916), '20260916')
	assert.equal(seedLabel(123), '00000123')
})