/**
 * Dependency-free QR Code encoder (byte mode, error-correction level M,
 * versions 1–40). Used to print UPI payment QR codes on invoices.
 *
 * Returns a square matrix where `true` is a dark module. No quiet zone is
 * included; renderers add the 4-module margin themselves.
 */

// Error-correction level M tables, indexed by version (index 0 unused).
const ECC_CODEWORDS_PER_BLOCK = [
  -1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26,
  26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28,
];
const NUM_ERROR_CORRECTION_BLOCKS = [
  -1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16,
  17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49,
];
const FORMAT_BITS_LEVEL_M = 0;
const MAX_VERSION = 40;

function numRawDataModules(version: number): number {
  let result = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const numAlign = Math.floor(version / 7) + 2;
    result -= (25 * numAlign - 10) * numAlign - 55;
    if (version >= 7) result -= 36;
  }
  return result;
}

function numDataCodewords(version: number): number {
  return Math.floor(numRawDataModules(version) / 8)
    - ECC_CODEWORDS_PER_BLOCK[version] * NUM_ERROR_CORRECTION_BLOCKS[version];
}

function gfMultiply(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z & 0xff;
}

function reedSolomonDivisor(degree: number): number[] {
  const result = new Array<number>(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      result[j] = gfMultiply(result[j], root);
      if (j + 1 < degree) result[j] ^= result[j + 1];
    }
    root = gfMultiply(root, 0x02);
  }
  return result;
}

function reedSolomonRemainder(data: number[], divisor: number[]): number[] {
  const result = divisor.map(() => 0);
  for (const byte of data) {
    const factor = byte ^ (result.shift() as number);
    result.push(0);
    divisor.forEach((coefficient, i) => { result[i] ^= gfMultiply(coefficient, factor); });
  }
  return result;
}

function addErrorCorrection(data: number[], version: number): number[] {
  const numBlocks = NUM_ERROR_CORRECTION_BLOCKS[version];
  const blockEccLength = ECC_CODEWORDS_PER_BLOCK[version];
  const rawCodewords = Math.floor(numRawDataModules(version) / 8);
  const numShortBlocks = numBlocks - (rawCodewords % numBlocks);
  const shortBlockLength = Math.floor(rawCodewords / numBlocks);
  const divisor = reedSolomonDivisor(blockEccLength);

  const blocks: number[][] = [];
  for (let i = 0, k = 0; i < numBlocks; i++) {
    const length = shortBlockLength - blockEccLength + (i < numShortBlocks ? 0 : 1);
    const block = data.slice(k, k + length);
    k += length;
    const ecc = reedSolomonRemainder(block, divisor);
    if (i < numShortBlocks) block.push(0); // placeholder, skipped when interleaving
    blocks.push(block.concat(ecc));
  }

  const result: number[] = [];
  for (let i = 0; i < blocks[0].length; i++) {
    blocks.forEach((block, j) => {
      if (i !== shortBlockLength - blockEccLength || j >= numShortBlocks) result.push(block[i]);
    });
  }
  return result;
}

function alignmentPatternPositions(version: number, size: number): number[] {
  if (version === 1) return [];
  const numAlign = Math.floor(version / 7) + 2;
  const step = version === 32 ? 26 : Math.ceil((version * 4 + 4) / (numAlign * 2 - 2)) * 2;
  const result = [6];
  for (let pos = size - 7; result.length < numAlign; pos -= step) result.splice(1, 0, pos);
  return result;
}

const MASKS: Array<(x: number, y: number) => boolean> = [
  (x, y) => (x + y) % 2 === 0,
  (_x, y) => y % 2 === 0,
  (x) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

function penaltyScore(modules: boolean[][]): number {
  const size = modules.length;
  let score = 0;

  // Runs of 5+ same-coloured modules and finder-like 1:1:3:1:1 patterns, both directions.
  for (let direction = 0; direction < 2; direction++) {
    for (let a = 0; a < size; a++) {
      let runColor = false;
      let runLength = 0;
      let history = 0; // last 11 modules as bits
      for (let b = 0; b < size; b++) {
        const dark = direction === 0 ? modules[a][b] : modules[b][a];
        if (b > 0 && dark === runColor) {
          runLength++;
          if (runLength === 5) score += 3;
          else if (runLength > 5) score++;
        } else {
          runColor = dark;
          runLength = 1;
        }
        history = ((history << 1) | (dark ? 1 : 0)) & 0x7ff;
        if (b >= 10 && (history === 0x05d || history === 0x5d0)) score += 40;
      }
    }
  }

  // 2×2 blocks of one colour.
  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size - 1; x++) {
      const color = modules[y][x];
      if (color === modules[y][x + 1] && color === modules[y + 1][x] && color === modules[y + 1][x + 1]) score += 3;
    }
  }

  // Dark/light balance.
  let dark = 0;
  for (const row of modules) for (const cell of row) if (cell) dark++;
  const total = size * size;
  score += Math.floor(Math.abs(dark * 20 - total * 10) / total) * 10;
  return score;
}

/** Encode `text` (UTF-8) as a QR code matrix. Throws if the text is too long. */
export function encodeQr(text: string): boolean[][] {
  const bytes = Array.from(new TextEncoder().encode(text));

  let version = 1;
  for (; ; version++) {
    if (version > MAX_VERSION) throw new Error('Text is too long for a QR code');
    const countBits = version < 10 ? 8 : 16;
    if (4 + countBits + bytes.length * 8 <= numDataCodewords(version) * 8) break;
  }

  // Bit stream: mode indicator, length, payload, terminator, padding.
  const bits: number[] = [];
  const appendBits = (value: number, length: number) => {
    for (let i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1);
  };
  appendBits(0b0100, 4);
  appendBits(bytes.length, version < 10 ? 8 : 16);
  for (const byte of bytes) appendBits(byte, 8);
  const capacityBits = numDataCodewords(version) * 8;
  appendBits(0, Math.min(4, capacityBits - bits.length));
  appendBits(0, (8 - (bits.length % 8)) % 8);
  for (let pad = 0xec; bits.length < capacityBits; pad ^= 0xec ^ 0x11) appendBits(pad, 8);

  const dataCodewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i + j];
    dataCodewords.push(byte);
  }
  const codewords = addErrorCorrection(dataCodewords, version);

  const size = version * 4 + 17;
  const modules: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const isFunction: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const setFunction = (x: number, y: number, dark: boolean) => {
    modules[y][x] = dark;
    isFunction[y][x] = true;
  };

  // Timing patterns.
  for (let i = 0; i < size; i++) {
    setFunction(6, i, i % 2 === 0);
    setFunction(i, 6, i % 2 === 0);
  }

  // Finder patterns with separators.
  for (const [cx, cy] of [[3, 3], [size - 4, 3], [3, size - 4]]) {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || x >= size || y < 0 || y >= size) continue;
        const distance = Math.max(Math.abs(dx), Math.abs(dy));
        setFunction(x, y, distance !== 2 && distance !== 4);
      }
    }
  }

  // Alignment patterns.
  const alignPositions = alignmentPatternPositions(version, size);
  const numAlign = alignPositions.length;
  for (let i = 0; i < numAlign; i++) {
    for (let j = 0; j < numAlign; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === numAlign - 1) || (i === numAlign - 1 && j === 0)) continue;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          setFunction(alignPositions[i] + dx, alignPositions[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
        }
      }
    }
  }

  const drawFormatBits = (mask: number) => {
    const data = (FORMAT_BITS_LEVEL_M << 3) | mask;
    let remainder = data;
    for (let i = 0; i < 10; i++) remainder = (remainder << 1) ^ ((remainder >>> 9) * 0x537);
    const formatBits = ((data << 10) | remainder) ^ 0x5412;
    const bit = (i: number) => ((formatBits >>> i) & 1) !== 0;

    for (let i = 0; i <= 5; i++) setFunction(8, i, bit(i));
    setFunction(8, 7, bit(6));
    setFunction(8, 8, bit(7));
    setFunction(7, 8, bit(8));
    for (let i = 9; i < 15; i++) setFunction(14 - i, 8, bit(i));

    for (let i = 0; i < 8; i++) setFunction(size - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) setFunction(8, size - 15 + i, bit(i));
    setFunction(8, size - 8, true);
  };
  drawFormatBits(0); // reserves the format area before data placement

  // Version information (versions 7+).
  if (version >= 7) {
    let remainder = version;
    for (let i = 0; i < 12; i++) remainder = (remainder << 1) ^ ((remainder >>> 11) * 0x1f25);
    const versionBits = (version << 12) | remainder;
    for (let i = 0; i < 18; i++) {
      const dark = ((versionBits >>> i) & 1) !== 0;
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      setFunction(a, b, dark);
      setFunction(b, a, dark);
    }
  }

  // Data placement in the zigzag pattern.
  let bitIndex = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vertical = 0; vertical < size; vertical++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vertical : vertical;
        if (!isFunction[y][x] && bitIndex < codewords.length * 8) {
          modules[y][x] = ((codewords[bitIndex >>> 3] >>> (7 - (bitIndex & 7))) & 1) !== 0;
          bitIndex++;
        }
      }
    }
  }

  const applyMask = (mask: number) => {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (!isFunction[y][x] && MASKS[mask](x, y)) modules[y][x] = !modules[y][x];
      }
    }
  };

  // Pick the mask with the lowest penalty.
  let bestMask = 0;
  let bestScore = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    applyMask(mask);
    drawFormatBits(mask);
    const score = penaltyScore(modules);
    if (score < bestScore) {
      bestScore = score;
      bestMask = mask;
    }
    applyMask(mask); // XOR again to undo
  }
  applyMask(bestMask);
  drawFormatBits(bestMask);

  return modules;
}

/** Render a QR matrix as a standalone inline SVG string (with quiet zone). */
export function qrToSvg(modules: boolean[][], quietZone = 4): string {
  const size = modules.length + quietZone * 2;
  let path = '';
  modules.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      if (!row[x]) { x++; continue; }
      let run = 1;
      while (x + run < row.length && row[x + run]) run++;
      path += `M${x + quietZone} ${y + quietZone}h${run}v1h-${run}z`;
      x += run;
    }
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" role="img" aria-label="Payment QR code"><rect width="${size}" height="${size}" fill="#fff"/><path d="${path}" fill="#000"/></svg>`;
}
