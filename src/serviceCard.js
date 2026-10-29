const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// Deployments older than this are flagged as stale on the card.
export const STALE_AFTER_MS = 7 * DAY;

const plural = (n, unit) => `${n} ${unit}${n === 1 ? '' : 's'}`;

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// Returns { label, stale } describing how long ago deployedAt was, relative to now.
export function deploymentFreshness(deployedAt, now = new Date()) {
  const deployed = new Date(deployedAt);
  if (deployedAt == null || Number.isNaN(deployed.getTime())) return { label: 'unknown', stale: false };
  const age = new Date(now).getTime() - deployed.getTime();
  if (age < 0) return { label: 'in the future', stale: false };
  const stale = age >= STALE_AFTER_MS;
  if (age < MINUTE) return { label: 'just now', stale };
  if (age < HOUR) return { label: `${plural(Math.floor(age / MINUTE), 'minute')} ago`, stale };
  if (age < DAY) return { label: `${plural(Math.floor(age / HOUR), 'hour')} ago`, stale };
  return { label: `${plural(Math.floor(age / DAY), 'day')} ago`, stale };
}

// Runs in the browser: arrow keys move focus between cards, Enter clicks the focused card.
function enableCardKeyboardNav() {
  const cards = [...document.querySelectorAll('.service-card')];
  document.addEventListener('keydown', (e) => {
    const i = cards.indexOf(document.activeElement);
    if (i === -1) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      cards[Math.min(i + 1, cards.length - 1)].focus();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      cards[Math.max(i - 1, 0)].focus();
    } else if (e.key === 'Enter') {
      cards[i].click();
    }
  });
}

const cardKeyboardScript = `<script>(${enableCardKeyboardNav})();</script>`;

export function renderServiceCard({ name, environment, version, deployedAt }, now = new Date()) {
  const { label, stale } = deploymentFreshness(deployedAt, now);
  const deployedIso = Number.isNaN(new Date(deployedAt).getTime()) ? '' : new Date(deployedAt).toISOString();
  return `<article class="service-card${stale ? ' stale' : ''}" tabindex="0">
  <h2>${escapeHtml(name)}</h2>
  <dl>
    <dt>Environment</dt><dd>${escapeHtml(environment)}</dd>
    <dt>Version</dt><dd>${escapeHtml(version)}</dd>
    <dt>Deployed</dt><dd><time datetime="${escapeHtml(deployedIso)}">${escapeHtml(label)}</time>${stale ? ' <strong class="stale-badge">stale</strong>' : ''}</dd>
  </dl>
</article>`;
}

export function renderStatusPage(services, now = new Date()) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Northstar status</title>
<style>
body{font-family:system-ui,sans-serif;margin:2rem;background:#f6f7f9;color:#1d2330}
.service-card{background:#fff;border:1px solid #d6dae1;border-radius:8px;padding:1rem 1.25rem;max-width:28rem;margin-bottom:1rem}
.service-card.stale{border-color:#c77700}
.service-card h2{margin:0 0 .5rem;font-size:1.1rem}
dl{display:grid;grid-template-columns:auto 1fr;gap:.25rem 1rem;margin:0}
dt{color:#5b6475}dd{margin:0}
.stale-badge{color:#8a4b00;font-size:.85em;text-transform:uppercase}
</style>
</head>
<body>
<h1>Northstar status</h1>
${services.map((s) => renderServiceCard(s, now)).join('\n')}
${cardKeyboardScript}
</body>
</html>`;
}
