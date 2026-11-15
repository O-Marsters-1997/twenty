import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { convertSource, type Finding } from './convertSource';

const collectFiles = (path: string): string[] => {
  if (statSync(path).isFile()) return [path];

  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === 'node_modules') return [];
    const child = join(path, entry.name);
    if (entry.isDirectory()) return collectFiles(child);
    return /\.tsx?$/.test(entry.name) && !entry.name.endsWith('.d.ts')
      ? [child]
      : [];
  });
};

const main = () => {
  const [target] = process.argv.slice(2);
  if (target === undefined) {
    console.error('usage: linaria-to-stylex <folder>');
    process.exit(1);
  }

  const results = collectFiles(resolve(target)).map((file) => ({
    file,
    source: readFileSync(file, 'utf8'),
  }));
  const converted = results.map(({ file, source }) => ({
    file,
    source,
    ...convertSource(file, source),
  }));

  let convertedCount = 0;
  const findings: Finding[] = [];
  for (const result of converted) {
    convertedCount += result.convertedCount;
    findings.push(...result.findings);
    if (result.output !== result.source) {
      writeFileSync(result.file, result.output);
    }
  }

  console.log(`Converted ${convertedCount} block(s).`);
  console.log(`Left ${findings.length} block(s) for manual conversion:`);
  for (const finding of findings) {
    console.log(
      `${finding.file}:${finding.line}  ${finding.name}  ${finding.reason}`,
    );
  }
};

main();
