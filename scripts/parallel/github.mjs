import { spawnSync } from 'node:child_process';
import { run } from './lib.mjs';

function githubEnvironment() {
  if (process.env.GH_TOKEN || process.env.GITHUB_TOKEN) return process.env;
  const credential = spawnSync('git', ['credential', 'fill'], {
    encoding: 'utf8',
    input: 'protocol=https\nhost=github.com\n\n',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  if (credential.error || credential.status !== 0) {
    throw new Error('Git Credential Manager could not provide a GitHub credential.');
  }
  const token = credential.stdout.match(/^password=(.+)$/m)?.[1]?.trim();
  if (!token) throw new Error('Git Credential Manager returned no GitHub token.');
  return { ...process.env, GH_TOKEN: token };
}

export function gh(args, options = {}) {
  return run('gh', args, { ...options, env: options.env ?? githubEnvironment() });
}

export function ghJson(args, options = {}) {
  const output = gh(args, options);
  return output ? JSON.parse(output) : null;
}

export function assertGhAuth() {
  gh(['auth', 'status']);
}

export async function githubRequest(resource, { token, method = 'GET', body } = {}) {
  const response = await fetch(`https://api.github.com${resource}`, {
    method,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2026-03-10',
      'User-Agent': 'hearth-parallel-policy',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    throw new Error(`GitHub ${method} ${resource} failed (${response.status}): ${await response.text()}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

export async function githubPages(resource, options = {}) {
  const items = [];
  for (let page = 1; ; page += 1) {
    const separator = resource.includes('?') ? '&' : '?';
    const batch = await githubRequest(`${resource}${separator}per_page=100&page=${page}`, options);
    items.push(...batch);
    if (batch.length < 100) return items;
  }
}
