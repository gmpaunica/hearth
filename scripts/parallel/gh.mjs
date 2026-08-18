import { gh } from './github.mjs';

if (process.argv.length < 3) throw new Error('Pass GitHub CLI arguments after this script.');
gh(process.argv.slice(2), { stdio: 'inherit' });
