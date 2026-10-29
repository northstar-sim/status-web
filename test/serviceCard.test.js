import test from 'node:test';
import assert from 'node:assert/strict';
import { deploymentFreshness, renderServiceCard, renderStatusPage } from '../src/serviceCard.js';

const now = new Date('2026-10-28T12:00:00Z');
const card = { name: 'status-web', environment: 'staging', version: '1.4.2' };

test('freshness is human-readable for recent deployments', () => {
  assert.deepEqual(deploymentFreshness('2026-10-28T11:59:30Z', now), { label: 'just now', stale: false });
  assert.deepEqual(deploymentFreshness('2026-10-28T11:59:00Z', now), { label: '1 minute ago', stale: false });
  assert.deepEqual(deploymentFreshness('2026-10-28T09:00:00Z', now), { label: '3 hours ago', stale: false });
  assert.deepEqual(deploymentFreshness('2026-10-26T12:00:00Z', now), { label: '2 days ago', stale: false });
});

test('deployments a week or older are stale', () => {
  assert.deepEqual(deploymentFreshness('2026-10-21T12:00:00Z', now), { label: '7 days ago', stale: true });
  assert.deepEqual(deploymentFreshness('2026-09-28T12:00:00Z', now), { label: '30 days ago', stale: true });
});

test('missing or invalid deployedAt is reported as unknown', () => {
  assert.equal(deploymentFreshness(undefined, now).label, 'unknown');
  assert.equal(deploymentFreshness('not a date', now).label, 'unknown');
});

test('card shows name, environment, version and freshness', () => {
  const html = renderServiceCard({ ...card, deployedAt: '2026-10-28T10:00:00Z' }, now);
  for (const text of ['status-web', 'staging', '1.4.2', '2 hours ago']) assert.ok(html.includes(text), text);
  assert.ok(html.includes('datetime="2026-10-28T10:00:00.000Z"'));
  assert.ok(!html.includes('stale'));
});

test('stale card is flagged', () => {
  const html = renderServiceCard({ ...card, deployedAt: '2026-10-01T12:00:00Z' }, now);
  assert.match(html, /class="service-card stale"/);
  assert.match(html, /27 days ago/);
  assert.match(html, /stale-badge/);
});

test('card escapes HTML in service fields', () => {
  const html = renderServiceCard({ ...card, name: '<script>x</script>', deployedAt: now }, now);
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
});

test('status page renders one card per service', () => {
  const html = renderStatusPage([{ ...card, deployedAt: now }, { ...card, name: 'usage-api', deployedAt: now }], now);
  assert.ok(html.startsWith('<!doctype html>'));
  assert.equal(html.match(/<article/g).length, 2);
});

test('cards are focusable and the page wires up arrow/Enter keyboard navigation', () => {
  const html = renderStatusPage([{ ...card, deployedAt: now }, { ...card, name: 'usage-api', deployedAt: now }], now);
  assert.equal(html.match(/<article class="service-card[^"]*" tabindex="0"/g).length, 2);
  assert.match(html, /<script>\(function enableCardKeyboardNav\(\)/);
  for (const key of ['ArrowDown', 'ArrowUp', 'Enter']) assert.ok(html.includes(`'${key}'`), key);
});
