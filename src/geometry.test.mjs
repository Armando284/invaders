import { test } from 'node:test'
import assert from 'node:assert/strict'
import { clamp, pad, rectsOverlap } from './geometry.ts'

test('clamp bounds a value', () => {
	assert.equal(clamp(5, 0, 10), 5)
	assert.equal(clamp(-1, 0, 10), 0)
	assert.equal(clamp(11, 0, 10), 10)
	assert.equal(clamp(0, 0, 10), 0)
	assert.equal(clamp(10, 0, 10), 10)
})

test('pad left-pads numbers with zeros', () => {
	assert.equal(pad(7, 4), '0007')
	assert.equal(pad(123, 4), '0123')
	assert.equal(pad(12345, 4), '12345')
	assert.equal(pad(0, 2), '00')
})

test('rectsOverlap detects touching vs crossing rectangles', () => {
	const a = { x: 0, y: 0, w: 3, h: 3 }

	assert.equal(rectsOverlap(a, { x: 2, y: 2, w: 2, h: 2 }), true)
	assert.equal(rectsOverlap(a, { x: -1, y: 1, w: 2, h: 1 }), true)
	assert.equal(rectsOverlap(a, { x: 3, y: 3, w: 2, h: 2 }), false)
	assert.equal(rectsOverlap(a, { x: -4, y: 1, w: 1, h: 1 }), false)
	assert.equal(rectsOverlap(a, { x: -2, y: 1, w: 1, h: 1 }), false)
	assert.equal(rectsOverlap(a, { x: 3, y: 0, w: 1, h: 1 }), false)
})