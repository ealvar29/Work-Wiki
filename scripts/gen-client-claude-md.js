#!/usr/bin/env node
/**
 * Generates a self-contained CLAUDE.md for a CMS 13 upgrade engagement.
 *
 * Reads source wiki files and assembles them with client context into a single
 * file the Claude Code agent will read automatically when the project is opened.
 *
 * Usage:
 *   node scripts/gen-client-claude-md.js --client "OxyChem" --output "C:/path/to/project"
 *
 * Optional flags:
 *   --upgrade-file   Name of the existing upgrade doc in the client repo (e.g. UPGRADE-CMS13.md)
 *   --blockers       Comma-separated list of known blockers to pre-fill
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { argv } from 'node:process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WIKI_ROOT = join(__dirname, '..');
const WIKI_BASE_URL = 'https://work-wikipedia.netlify.app/work/cms13';

// --- arg parsing -----------------------------------------------------------

function arg(name) {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 ? argv[i + 1] : null;
}

const clientName = arg('client') ?? 'CLIENT';
const outputDir = arg('output');
const upgradeFile = arg('upgrade-file');
const blockersRaw = arg('blockers');

if (!outputDir) {
  console.error('Error: --output is required');
  console.error('Usage: node scripts/gen-client-claude-md.js --client "Name" --output "C:/path/to/project"');
  process.exit(1);
}

const outputPath = resolve(outputDir, 'CLAUDE.md');

if (!existsSync(resolve(outputDir))) {
  console.error(`Error: output directory does not exist: ${outputDir}`);
  process.exit(1);
}

// --- wiki file processing --------------------------------------------------

function readWikiFile(slug) {
  const path = join(WIKI_ROOT, 'content', 'work', 'cms13', `${slug}.md`);
  if (!existsSync(path)) throw new Error(`Wiki file not found: ${path}`);
  return readFileSync(path, 'utf8');
}

function processWikiFile(slug) {
  const raw = readWikiFile(slug);
  return raw
    // strip YAML frontmatter
    .replace(/^---[\s\S]*?---\n+/, '')
    // [[slug|Label]] → [Label](wiki-url/slug)
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, (_, slug, label) => `[${label}](${WIKI_BASE_URL}/${slug})`)
    // [[slug]] → [slug](wiki-url/slug)
    .replace(/\[\[([^\]]+)\]\]/g, (_, slug) => `[${slug}](${WIKI_BASE_URL}/${slug})`)
    .trim();
}

// --- assemble --------------------------------------------------------------

const checklist = processWikiFile('upgrade-checklist');
const breakingChanges = processWikiFile('breaking-changes');
const applicationsModel = processWikiFile('applications-model');
const searchToGraph = processWikiFile('search-to-graph');

const defaultBlockers = [
  'EPiServer.Forms — no CMS 13 version at time of writing; do not upgrade Forms packages until confirmed on NuGet',
  'Opti ID must be provisioned via the DXP portal before go-live — start this process at project kickoff',
];

const blockerLines = blockersRaw
  ? blockersRaw.split(',').map(b => `- ${b.trim()}`)
  : defaultBlockers.map(b => `- ${b}`);

const upgradeFileRef = upgradeFile
  ? `\n- Existing upgrade plan in this repo: \`${upgradeFile}\``
  : '';

const claudeMd = `# ${clientName} — CMS 13 Upgrade

## Project Context

> Fill in before starting the upgrade:

| Field | Value |
|---|---|
| CMS version | *(e.g. EPiServer.CMS 12.31.2)* |
| .NET version | *(e.g. net6.0)* |
| Hosting | *(DXP / on-prem)* |
| Main web project | *(e.g. src/${clientName}.Web/)* |
| Uses Search & Navigation | *(yes / no)* |
| Uses EPiServer.Forms | *(yes / no)* |
| Uses Commerce | *(yes / no — if yes, Commerce 15 required, not 14)* |
| Multi-site | *(yes / no)* |

## Known Blockers

${blockerLines.join('\n')}

## What NOT to Change

- Do not touch frontend (webpack/vite config, JS, CSS) unless required for .NET 10 compatibility
- Do not modify database migration scripts
- Do not upgrade EPiServer.Forms until a CMS 13 version is confirmed on NuGet
- Do not remove or modify the \`UpgradePlan/\` directory if present — it is the assessment output

## Reference
${upgradeFileRef}
- Full wiki: ${WIKI_BASE_URL.replace('/cms13', '')}
- Upgrade accelerator (phases, blockers, go-live criteria): ${WIKI_BASE_URL}/upgrade-accelerator
- All CMS 13 pages: ${WIKI_BASE_URL}/

---

${checklist}

---

${breakingChanges}

---

${applicationsModel}

---

${searchToGraph}
`;

writeFileSync(outputPath, claudeMd, 'utf8');
console.log(`Generated: ${outputPath}`);
