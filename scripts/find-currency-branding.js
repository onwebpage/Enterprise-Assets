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
      if (/\.(ts|tsx|js|jsx|html|css|json|md)$/.test(file)) {
        results.push(full);
      }
    }
  });
  return results;
}

const files = walk('.');

let output = '=== BRANDING & CURRENCY SEARCH ===\n\n';

const usdMatches = [];
const brandMatches = [];

files.forEach(f => {
  if (f.includes('pnpm-lock') || f.includes('0000_snapshot') || f.includes('find-currency-branding.js') || f.includes('find_results.txt')) return;
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    // Check for USD or US Dollar or Dollar in text
    if (/\bUSD\b|\bUS Dollar\b/i.test(line)) {
      usdMatches.push({ file: f, line: idx + 1, text: line.trim() });
    }
    
    // Check for hardcoded $ sign in UI / text (not js interpolated variable `${...}`)
    const cleanLine = line.replace(/\$\{[^}]+\}/g, ''); // strip ${...}
    if (cleanLine.includes('$') && !cleanLine.includes('lucide-react') && !cleanLine.includes('DollarSign') && !cleanLine.includes('CircleDollarSign') && !cleanLine.includes('process.env') && !cleanLine.includes('$$')) {
      usdMatches.push({ file: f, line: idx + 1, text: line.trim() });
    }

    // Check for old brand names
    if (/OmniERP|Omni ERP|BizOS|Kepwe/i.test(line)) {
      brandMatches.push({ file: f, line: idx + 1, text: line.trim() });
    }
  });
});

output += `\nFound ${brandMatches.length} brand matches:\n`;
brandMatches.forEach(m => output += `${m.file}:${m.line} -> ${m.text}\n`);

output += `\nFound ${usdMatches.length} USD / dollar matches:\n`;
usdMatches.forEach(m => output += `${m.file}:${m.line} -> ${m.text}\n`);

fs.writeFileSync('find_results.txt', output, 'utf8');
console.log('Results written to find_results.txt');
