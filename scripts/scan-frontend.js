import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    if (file === 'node_modules' || file === '.git' || file === 'dist' || file === '.next') return;
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(full));
    } else {
      if (/\.(ts|tsx|js|jsx|html|css)$/.test(file)) {
        results.push(full);
      }
    }
  });
  return results;
}

const files = walk('./artifacts/omni-erp/src');

let report = '=== FRONTEND UI SCAN ===\n\n';

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    // Check for branding
    if (/omni|bizos|kepwe/i.test(line)) {
      report += `BRANDING -> ${f}:${idx + 1}: ${line.trim()}\n`;
    }
    // Check for currency $ in UI (excluding lucide icons, env vars, imports)
    if (/\bUSD\b|\bUS Dollar\b/i.test(line)) {
      report += `USD -> ${f}:${idx + 1}: ${line.trim()}\n`;
    }
    // Check for $ in JSX or string literals, e.g. "$" or '$' or `$ ${` or `$${` or `$`
    // Strip ${...}
    const clean = line.replace(/\$\{[^}]+\}/g, 'INTERP');
    if (clean.includes('$') && !clean.includes('DollarSign') && !clean.includes('CircleDollarSign')) {
      report += `DOLLAR_SIGN -> ${f}:${idx + 1}: ${line.trim()}\n`;
    }
  });
});

fs.writeFileSync('frontend_scan.txt', report, 'utf8');
console.log('Frontend scan written to frontend_scan.txt');
