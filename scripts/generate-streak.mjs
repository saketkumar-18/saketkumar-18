#!/usr/bin/env node
/**
 * generate-streak.mjs — static GitHub streak-stats SVG generator.
 * Replacement for the flaky shared streak-stats.demolab.com service.
 *
 * Usage:  node generate-streak.mjs <username> <outdir>
 * Env:    STREAK_PAT (GitHub token with read:user scope)
 *
 * Fetches the contribution calendar via GraphQL, computes total
 * contributions / current streak / longest streak, and renders a
 * 495x195 transparent card matching the profile's color theme.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const user = process.argv[2];
const outDir = process.argv[3] || ".";
const token = process.env.STREAK_PAT || process.env.GITHUB_TOKEN;
if (!user || !token) {
  console.error("usage: STREAK_PAT=*** node generate-streak.mjs <user> <outdir>");
  process.exit(1);
}

const QUERY = `
query($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            contributionCount
            date
          }
        }
      }
    }
  }
}`;

async function fetchCalendar() {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "profile-widget-generator",
    },
    body: JSON.stringify({ query: QUERY, variables: { login: user } }),
  });
  if (!res.ok) throw new Error(`GraphQL HTTP ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(`GraphQL: ${json.errors[0].message}`);
  return json.data.user.contributionsCollection.contributionCalendar;
}

function computeStreaks(cal) {
  const days = [];
  for (const w of cal.weeks)
    for (const d of w.contributionDays)
      days.push({ date: new Date(d.date + "T00:00:00Z"), count: d.contributionCount });
  days.sort((a, b) => a.date - b.date);

  // Longest streak
  let longest = 0, longStart = null, longEnd = null;
  let run = 0, runStart = null;
  for (const d of days) {
    if (d.count > 0) {
      if (run === 0) runStart = d.date;
      run++;
      if (run > longest) { longest = run; longStart = runStart; longEnd = d.date; }
    } else run = 0;
  }

  // Current streak — today without contributions doesn't break it yet
  let idx = days.length - 1;
  const today = days[idx].date;
  if (days[idx].count === 0) idx--;
  let current = 0, curStart = today, curEnd = today;
  if (idx >= 0 && days[idx].count > 0) {
    curEnd = days[idx].date;
    while (idx >= 0 && days[idx].count > 0) { curStart = days[idx].date; current++; idx--; }
  }

  return {
    total: cal.totalContributions,
    first: days[0].date,
    last: today,
    longest, longStart, longEnd,
    current, curStart, curEnd,
  };
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const fmt = (d) => d ? `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}` : "";

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderCard(s) {
  // Theme (matches profile palette)
  const ring = "#7c3aed";        // ring around current streak
  const fire = "#f472b6";        // current streak number
  const currLabel = "#22d3ee";   // current streak label
  const sideLabel = "#a78bfa";   // side labels
  const sideNums = "#c4b5fd";    // side numbers
  const dates = "#94a3b8";       // date ranges
  const divider = "#7c3aed";

  const totalRange = `${fmt(s.first)} – ${fmt(s.last)}`;
  const longRange = s.longest > 0 ? `${fmt(s.longStart)} – ${fmt(s.longEnd)}` : "—";
  const currRange = s.current > 0 ? `${fmt(s.curStart)} – ${fmt(s.curEnd)}` : fmt(s.last);

  const W = 495, H = 195;
  const c1 = W / 6, c2 = W / 2, c3 = (5 * W) / 6;

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="GitHub Streak Stats for ${esc(user)}">
  <title>GitHub Streak Stats</title>
  <style>
    .num   { font: 800 30px 'Segoe UI', Ubuntu, 'Helvetica Neue', sans-serif; }
    .label { font: 700 12px 'Segoe UI', Ubuntu, 'Helvetica Neue', sans-serif; letter-spacing: 1px; text-transform: uppercase; }
    .range { font: 400 10.5px 'Segoe UI', Ubuntu, 'Helvetica Neue', sans-serif; }
    text { text-anchor: middle; }
  </style>

  <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="10" fill="transparent" stroke="${ring}" stroke-opacity="0.35" stroke-width="1.5"/>

  <line x1="${W / 3}" y1="28" x2="${W / 3}" y2="${H - 28}" stroke="${divider}" stroke-opacity="0.25" stroke-width="1"/>
  <line x1="${(2 * W) / 3}" y1="28" x2="${(2 * W) / 3}" y2="${H - 28}" stroke="${divider}" stroke-opacity="0.25" stroke-width="1"/>

  <!-- ring around current streak -->
  <circle cx="${c2}" cy="82" r="52" stroke="${ring}" stroke-width="2.5" stroke-opacity="0.9"/>

  <!-- Total contributions -->
  <text x="${c1}" y="92" class="num" fill="${sideNums}">${s.total.toLocaleString("en-US")}</text>
  <text x="${c1}" y="122" class="label" fill="${sideLabel}">Total Contributions</text>
  <text x="${c1}" y="146" class="range" fill="${dates}">${esc(totalRange)}</text>

  <!-- Current streak -->
  <text x="${c2}" y="70" font-size="18">🔥</text>
  <text x="${c2}" y="100" class="num" fill="${fire}">${s.current}</text>
  <text x="${c2}" y="156" class="label" fill="${currLabel}">Current Streak</text>
  <text x="${c2}" y="176" class="range" fill="${dates}">${esc(currRange)}</text>

  <!-- Longest streak -->
  <text x="${c3}" y="92" class="num" fill="${sideNums}">${s.longest}</text>
  <text x="${c3}" y="122" class="label" fill="${sideLabel}">Longest Streak</text>
  <text x="${c3}" y="146" class="range" fill="${dates}">${esc(longRange)}</text>
</svg>
`;
}

async function main() {
  const cal = await fetchCalendar();
  const streaks = computeStreaks(cal);
  console.log(
    `total=${streaks.total} current=${streaks.current} longest=${streaks.longest}`
  );
  mkdirSync(outDir, { recursive: true });
  const out = join(outDir, "streak-stats.svg");
  writeFileSync(out, renderCard(streaks));
  console.log(`wrote ${out}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
