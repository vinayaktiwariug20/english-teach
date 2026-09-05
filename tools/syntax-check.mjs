// Parse every module the way the browser will.
//
// `node --check` is not enough. It parses a .js file as a script, and a stray
// apostrophe inside a quoted string ("learner's") can re-synchronise on a later
// quote so that the file still parses as a whole - it reported app.js clean
// while the browser refused to load it with "missing ) after argument list",
// and the app came up as a blank page. Importing as a module is what the
// browser actually does.
//
// Modules that touch the DOM throw at runtime here; that is fine and expected.
// Only a SyntaxError means the file is broken.
//
//   node tools/syntax-check.mjs

import { readdir } from 'node:fs/promises';

const dir = new URL('../js/', import.meta.url);
const files = (await readdir(dir)).filter((f) => f.endsWith('.js')).sort();

let bad = 0;
for (const f of files) {
  try {
    await import(new URL(f, dir));
    console.log(`  ok        ${f}`);
  } catch (e) {
    if (e instanceof SyntaxError) {
      bad += 1;
      console.log(`  SYNTAX    ${f}: ${String(e.message).split('\n')[0]}`);
    } else {
      // needs a browser - it parsed, which is all this checks
      console.log(`  ok (dom)  ${f}: ${e.constructor.name}`);
    }
  }
}

console.log(bad ? `\n${bad} file(s) will not parse` : '\nall modules parse');
process.exitCode = bad ? 1 : 0;
