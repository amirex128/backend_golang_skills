#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const root = path.resolve(__dirname, '..');
const skillsRoot = path.join(root, 'skills');
const args = process.argv.slice(2);
function help() { console.log('Backend Golang Skills installer\n\nUsage:\n  npx backend-golang-skills [skill ...] [--target DIR]\n  npx backend-golang-skills --list\n  npx backend-golang-skills --all [--target DIR]\n\nInstalls agent skills into DIR/skills (default: ./.agents/skills).'); }
if (args.includes('--help') || args.includes('-h')) { help(); process.exit(0); }
const list = fs.readdirSync(skillsRoot).filter(x => fs.existsSync(path.join(skillsRoot, x, 'SKILL.md'))).sort();
if (args.includes('--list')) { console.log(list.join('\n')); process.exit(0); }
let target = path.resolve('.agents');
const ti = args.indexOf('--target');
if (ti >= 0 && args[ti + 1]) target = path.resolve(args[ti + 1]);
const selected = args.filter((x, i) => x !== '--target' && i !== ti + 1 && !x.startsWith('-'));
const names = selected.includes('all') || args.includes('--all') || selected.length === 0 ? list : selected;
for (const name of names) {
  if (!list.includes(name)) { console.error(`Unknown skill: ${name}. Available: ${list.join(', ')}`); process.exitCode = 1; continue; }
  const src = path.join(skillsRoot, name), dst = path.join(target, 'skills', name);
  fs.mkdirSync(dst, { recursive: true });
  cp.execFileSync(process.platform === 'win32' ? 'xcopy' : 'cp', process.platform === 'win32' ? ['/E','/I',src,dst] : ['-R',`${src}/.`,dst], {stdio:'inherit'});
  console.log(`Installed ${name} -> ${dst}`);
}
