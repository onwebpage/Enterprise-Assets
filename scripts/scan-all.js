import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    if (file === 'node_modules' || file === '.git' || file === 'dist' || file === '.next' || file.startsWith('.')) return;
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(full));
    } else {
      if (/\.(ts|tsx|js|jsx|html|css|json|md|sql)$/.test(file)) {
        results.push(full);
      }
    }
  });
  return results;
}

const files = walk('.');

let report = '=== ALL FILES DETAILED SCAN ===\n\n';

files.forEach(f => {
  if (f.includes('pnpm-lock') || f.includes('0000_snapshot') || f.includes('scan-') || f.includes('find_results') || f.includes('frontend_scan') || f.includes('all_scan')) return;
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    // Check for branding
    if (/omnierp|omni erp|omni_erp|bizos|kepwe/i.test(line)) {
      report += `BRANDING -> ${f}:${idx + 1}: ${line.trim()}\n`;
    }
    // Check for USD or US Dollar
    if (/\bUSD\b|\bUS Dollar\b/i.test(line)) {
      report += `USD -> ${f}:${idx + 1}: ${line.trim()}\n`;
    }
  });
});

fs.writeFileSync('all_scan.txt', report, 'utf8');
console.log('Detailed scan written to all_scan.txt');
