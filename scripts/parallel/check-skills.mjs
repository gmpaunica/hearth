import fs from 'node:fs';
import path from 'node:path';
import { repositoryRoot } from './lib.mjs';

const root = repositoryRoot();
const names = ['hearth-worker', 'hearth-integrator'];
const failures = [];

for (const name of names) {
  const directory = path.join(root, '.agents', 'skills', name);
  const markdown = fs.readFileSync(path.join(directory, 'SKILL.md'), 'utf8');
  const metadata = fs.readFileSync(path.join(directory, 'agents', 'openai.yaml'), 'utf8');
  const frontmatter = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatter) failures.push(`${name}: missing YAML front matter`);
  if (!new RegExp(`^name:\\s*${name}$`, 'm').test(frontmatter?.[1] ?? '')) {
    failures.push(`${name}: front-matter name mismatch`);
  }
  const description = (frontmatter?.[1] ?? '').match(/^description:\s*(.+)$/m)?.[1]?.trim() ?? '';
  if (!description || description.length > 1024 || /[<>]/.test(description)) {
    failures.push(`${name}: invalid front-matter description`);
  }
  for (const field of ['display_name', 'short_description', 'default_prompt']) {
    if (!new RegExp(`^\\s*${field}:\\s*"[^"]+"$`, 'm').test(metadata)) {
      failures.push(`${name}: agents/openai.yaml must quote ${field}`);
    }
  }
  if (!metadata.includes(`$${name}`)) failures.push(`${name}: default_prompt must mention $${name}`);
  const short = metadata.match(/^\s*short_description:\s*"([^"]+)"$/m)?.[1] ?? '';
  if (short.length < 25 || short.length > 64) failures.push(`${name}: short_description must be 25-64 chars`);
}

if (failures.length) {
  for (const failure of failures) process.stderr.write(`${failure}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write('Both Hearth skills satisfy the repository skill metadata checks.\n');
}
