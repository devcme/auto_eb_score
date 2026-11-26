import esbuild from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { resolve, basename, extname } from 'path';

const I18N_DIR = 'src/i18n';
const REGISTRY_FILE = `${I18N_DIR}/_registry.js`;

const version = process.env.VERSION || JSON.parse(readFileSync('package.json', 'utf-8')).version;

function generateRegistry() {
    const files = readdirSync(I18N_DIR)
        .filter(f => extname(f) === '.js' && f !== 'index.js' && f !== '_registry.js')
        .sort();

    const codes = files.map(f => basename(f, '.js'));

    const imports = codes
        .map(c => `import ${c} from './${c}.js';`)
        .join('\n');

    const map = codes.map(c => `    ${c}`).join(',\n');

    const codesArray = codes.map(c => `    '${c}'`).join(',\n');

    return `${imports}

export const TRANSLATIONS = {
${map}
};

export const LANG_CODES = [
${codesArray}
];

export function langLabel(code) {
    const t = TRANSLATIONS[code];
    return t ? t._langName : code;
}
`;
}

mkdirSync('dist', { recursive: true });
writeFileSync(REGISTRY_FILE, generateRegistry());

const banner = `// ==UserScript==
// @name         EB Auto Score
// @namespace    http://tampermonkey.net/
// @version      ${version}
// @description  Auto submit score for EB lessons
// @match        https://lms1.wiseman.com.hk/lms/user/secure/course/eb/select_lesson/*
// @grant        none
// ==/UserScript==`;

const isWatch = process.argv.includes('--watch');

const buildOpts = {
  entryPoints: ['src/index.js'],
  bundle: true,
  define: { EB_VERSION: JSON.stringify(version) },
  outfile: 'dist/eb_auto_score.user.js',
  format: 'iife',
  target: ['es2020'],
  banner: { js: banner },
  legalComments: 'none',
  minify: false,
  loader: { '.css': 'text' },
  write: true,
};

if (isWatch) {
  await esbuild.build(buildOpts);
  const dist = readFileSync('dist/eb_auto_score.user.js', 'utf-8');
  writeFileSync('eb_auto_score.user.js', dist);
  const ctx = await esbuild.context(buildOpts);
  await ctx.watch();
} else {
  await esbuild.build(buildOpts);
  const dist = readFileSync('dist/eb_auto_score.user.js', 'utf-8');
  writeFileSync('eb_auto_score.user.js', dist);
}
