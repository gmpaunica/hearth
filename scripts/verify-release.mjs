import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const exportRoot = join(root, 'tmp', 'exports');
const maxRegression = 1.1;
const baselines = {
  android: { bundleBytes: 7_686_640, exportBytes: 11_894_935 },
  ios: { bundleBytes: 7_484_193, exportBytes: 10_730_318 },
  web: { bundleBytes: 4_302_251, exportBytes: 7_740_050 },
};

function filesUnder(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

const failures = [];
const rows = [];

for (const [target, baseline] of Object.entries(baselines)) {
  const directory = join(exportRoot, target);
  const files = filesUnder(directory);
  const bundle = files
    .filter((path) => path.includes(`${join('_expo', 'static', 'js', target)}`))
    .filter((path) => path.endsWith('.hbc') || path.endsWith('.js'))
    .sort((left, right) => statSync(right).size - statSync(left).size)[0];
  if (!bundle) {
    failures.push(`${target}: main bundle not found`);
    continue;
  }

  const bundleBytes = statSync(bundle).size;
  const exportBytes = files.reduce((sum, path) => sum + statSync(path).size, 0);
  const deltaPercent = ((bundleBytes / baseline.bundleBytes) - 1) * 100;
  rows.push({
    target,
    bundleBytes,
    baselineBytes: baseline.bundleBytes,
    deltaPercent: Number(deltaPercent.toFixed(2)),
    exportBytes,
    baselineExportBytes: baseline.exportBytes,
  });
  if (bundleBytes > baseline.bundleBytes * maxRegression) {
    failures.push(`${target}: bundle exceeds the 10% release budget`);
  }
}

const webDirectory = join(exportRoot, 'web');
for (const path of filesUnder(webDirectory).filter((candidate) => candidate.endsWith('.html'))) {
  if (readFileSync(path, 'utf8').includes('<!--$!-->')) {
    failures.push(`web: unfinished Suspense boundary in ${relative(webDirectory, path)}`);
  }
}

console.table(rows);
if (failures.length > 0) {
  failures.forEach((failure) => console.error(`FAIL: ${failure}`));
  process.exitCode = 1;
} else {
  console.log('Release bundle and static-hydration budgets pass.');
}
