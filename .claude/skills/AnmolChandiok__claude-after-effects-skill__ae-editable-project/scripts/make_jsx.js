#!/usr/bin/env node
// Turns a scene.json into a self-contained build.jsx for After Effects.
//   node make_jsx.js scene.json build.jsx
// Relative asset/output paths in the scene are resolved against the scene file's folder.
const fs = require('fs'), path = require('path');
// --portable keeps asset/output paths relative to build.jsx, so the folder can be moved
// to another computer (incl. Windows) and run there with File > Scripts > Run Script File.
const PORTABLE = process.argv.includes('--portable');
// --quiet: for automated builds (run_in_ae.sh); problems go to the build log instead of a dialog that would block AE
const QUIET = process.argv.includes('--quiet');
const [scenePath, outPath] = process.argv.slice(2).filter(a => !a.startsWith('--'));
if (!scenePath || !outPath) { console.error('usage: node make_jsx.js [--portable] scene.json build.jsx'); process.exit(1); }
const S = JSON.parse(fs.readFileSync(scenePath, 'utf8'));
const base = path.dirname(path.resolve(scenePath));
const abs = p => path.isAbsolute(p) ? p : path.join(base, p);
const problems = [];
const outDir = path.dirname(path.resolve(outPath));
const place = p => PORTABLE ? path.relative(outDir, abs(p)).split(path.sep).join('/') : abs(p);
S.assets.forEach(a => { if (!fs.existsSync(abs(a.path))) problems.push('missing asset ' + abs(a.path)); a.path = place(a.path); });
S.project.output = place(S.project.output);
if (QUIET) S.project.quiet = true;
if (S.project.stillsDir) { fs.mkdirSync(abs(S.project.stillsDir), { recursive: true }); S.project.stillsDir = place(S.project.stillsDir); }
if (PORTABLE && S.assets.some(a => a.path.startsWith('..'))) problems.push('--portable: keep assets inside the folder that holds build.jsx');
// sanity: ids, parents, precomp refs, assets
const compIds = new Set(S.comps.map(c => c.id)), assetIds = new Set(S.assets.map(a => a.id));
S.comps.forEach((c, ci) => {
  const ids = new Set(c.layers.map(l => l.id).filter(Boolean));
  c.layers.forEach(l => {
    if (l.parent && !ids.has(l.parent)) problems.push(`${c.name}/${l.name}: parent "${l.parent}" not in this comp`);
    if (l.type === 'precomp') { const j = S.comps.findIndex(x => x.id === l.comp); if (j < 0) problems.push(`${c.name}/${l.name}: unknown comp ${l.comp}`); else if (j > ci) problems.push(`${c.name}/${l.name}: comp ${l.comp} must be listed before ${c.id}`); }
    if (['image', 'audio', 'footage'].includes(l.type) && !assetIds.has(l.asset)) problems.push(`${c.name}/${l.name}: unknown asset ${l.asset}`);
  });
});
if (!S.comps.some(c => c.main)) problems.push('no comp has "main": true');
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
const lib = fs.readFileSync(path.join(__dirname, 'aelib.jsx'), 'utf8');
fs.writeFileSync(outPath, lib + '\n\nvar SCENE = ' + JSON.stringify(S) + ';\nAEB.build(SCENE);\n');
console.log('wrote', outPath, `(${S.comps.length} comps, ${S.comps.reduce((n, c) => n + c.layers.length, 0)} layers, ${S.assets.length} assets)`);
