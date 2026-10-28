import test from 'node:test';
import assert from 'node:assert/strict';
import { renderServiceCard } from '../src/serviceCard.js';

// WEB-3 regression: see QA-REPORT.md.
const now = new Date('2026-10-28T12:00:00Z');
const card = { name: 'status-web', environment: 'staging', version: '1.4.2' };

test('WEB-3: null deployedAt renders unknown without a 1970 machine-readable timestamp', () => {
  const html = renderServiceCard({ ...card, deployedAt: null }, now);
  assert.match(html, /<time datetime="">unknown<\/time>/);
  assert.ok(!html.includes('1970-01-01'), 'null deployedAt must not be rendered as the Unix epoch');
});

test('WEB-3: undefined deployedAt renders unknown with an empty datetime', () => {
  const html = renderServiceCard({ ...card, deployedAt: undefined }, now);
  assert.match(html, /<time datetime="">unknown<\/time>/);
});
