// Generate github-readme-stats cards (stats + top languages) as static SVGs.
// Runs inside a cloned github-readme-stats repo.
// Usage: PAT_1=<token> node generate-stats.mjs <username> <outdir>
import { fetchStats } from "./src/fetchers/stats.js";
import { fetchTopLanguages } from "./src/fetchers/top-languages.js";
import { renderStatsCard } from "./src/cards/stats.js";
import { renderTopLanguages } from "./src/cards/top-languages.js";
import fs from "fs";

const username = process.argv[2] || "saketkumar-18";
const outdir = process.argv[3] || "dist";
fs.mkdirSync(outdir, { recursive: true });

const stats = await fetchStats(username, true);
const statsSvg = renderStatsCard(stats, {
  hide_border: true,
  theme: "transparent",
  show_icons: true,
  include_all_commits: true,
  rank_icon: "github",
  icon_color: "22d3ee",
  title_color: "a78bfa",
  text_color: "e2e8f0",
  ring_color: "7c3aed",
  bg_color: "0d1117",
});
fs.writeFileSync(`${outdir}/github-stats.svg`, statsSvg);
console.log("wrote github-stats.svg");

const langs = await fetchTopLanguages(username);
const langsSvg = renderTopLanguages(langs, {
  hide_border: true,
  theme: "transparent",
  layout: "compact",
  langs_count: 8,
  title_color: "a78bfa",
  text_color: "e2e8f0",
  bg_color: "0d1117",
});
fs.writeFileSync(`${outdir}/top-languages.svg`, langsSvg);
console.log("wrote top-languages.svg");
