export const SATS = 100_000_000;
export const HALVING = 210_000;
export const isHex64 = value => /^[0-9a-f]{64}$/i.test(value);
export const clamp = (n, low, high) => Math.min(high, Math.max(low, n));
export const finite = n => typeof n === 'number' && Number.isFinite(n);

export function subsidy(height) {
  if (!Number.isSafeInteger(height) || height < 0) throw new RangeError('Invalid block height');
  const epoch = Math.floor(height / HALVING);
  return epoch >= 33 ? 0 : Number(5_000_000_000n >> BigInt(epoch)) / SATS;
}

// Scheduled issuance includes the unspendable genesis subsidy, not lost coins.
export function issuedSupply(height) {
  if (!Number.isSafeInteger(height) || height < 0) throw new RangeError('Invalid block height');
  let blocks = BigInt(height) + 1n, result = 0n;
  for (let epoch = 0; epoch < 33 && blocks > 0n; epoch++) {
    const count = blocks > 210_000n ? 210_000n : blocks;
    result += count * (5_000_000_000n >> BigInt(epoch));
    blocks -= count;
  }
  return Number(result) / SATS;
}

export function halvingState(height) {
  const reward = subsidy(height);
  const next = (Math.floor(height / HALVING) + 1) * HALVING;
  return { reward, next, remaining: next - height, progress: (height % HALVING) / HALVING * 100, nextReward: subsidy(next) };
}

export function toBitcoin(amount, unit, rates = {}) {
  if (!finite(amount) || amount < 0) return null;
  if (unit === 'BTC') return amount;
  if (unit === 'sats') return amount / SATS;
  return finite(rates[unit]) && rates[unit] > 0 ? amount / rates[unit] : null;
}

export function normalizeCandles(rows, start = 0, end = Infinity) {
  if (!Array.isArray(rows)) throw new TypeError('Invalid candles');
  const dedup = new Map();
  for (const row of rows) {
    if (Array.isArray(row) && row.length >= 6 && row.slice(0, 6).every(finite) && row[4] > 0 && row[0] >= start && row[0] < end) {
      dedup.set(row[0], { time: row[0], low: row[1], high: row[2], open: row[3], close: row[4], volume: row[5] });
    }
  }
  return [...dedup.values()].sort((a, b) => a.time - b.time);
}

export function bytesFromHex(hex) {
  if (typeof hex !== 'string' || hex.length % 2 || !/^[0-9a-f]*$/i.test(hex)) throw new TypeError('Invalid hex');
  return Uint8Array.from(hex.match(/../g) || [], byte => parseInt(byte, 16));
}

// Read only canonical push opcodes; malformed/truncated payloads are rejected.
export function pushedData(hex, skip = 0) {
  const bytes = bytesFromHex(hex), chunks = [];
  let p = skip;
  while (p < bytes.length) {
    const op = bytes[p++];
    let length;
    if (op <= 75) length = op;
    else if (op >= 76 && op <= 78) {
      const width = 2 ** (op - 76);
      if (p + width > bytes.length) throw new RangeError('Truncated push length');
      length = 0;
      for (let i = 0; i < width; i++) length += bytes[p++] * 2 ** (8 * i);
    } else throw new RangeError('Non-push opcode');
    if (p + length > bytes.length) throw new RangeError('Truncated push data');
    chunks.push(bytes.slice(p, p + length)); p += length;
  }
  return chunks;
}

export function printableText(bytes) {
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/\0+$/g, '');
    if (!text.trim() || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]/.test(text)) return null;
    return text;
  } catch { return null; }
}

export function decodeTransaction(tx) {
  const messages = [], legacy = [];
  for (const output of (tx.vout || []).slice(0, 500)) {
    const hex = output.scriptpubkey;
    if (typeof hex !== 'string' || hex.length > 100_000) continue;
    try {
      if (hex.startsWith('6a')) {
        const chunks = pushedData(hex, 1);
        const joined = Uint8Array.from(chunks.flatMap(bytes => [...bytes]));
        const text = printableText(joined);
        if (text) messages.push({ kind: 'OP_RETURN', text });
      } else if (/^76a914[0-9a-f]{40}88ac$/i.test(hex)) {
        const text = printableText(bytesFromHex(hex.slice(6, 46)));
        if (text && text.length >= 10) legacy.push(text);
      }
    } catch { /* An individual non-text output is not an application error. */ }
  }
  if (legacy.length > 1) messages.push({ kind: 'P2PKH テキスト候補（推定）', text: legacy.join('') });
  return messages;
}

export function mergeBlocks(current, incoming) {
  const map = new Map();
  for (const b of [...current, ...incoming]) {
    if (b && Number.isSafeInteger(b.height) && b.height >= 0 && isHex64(b.id) && finite(b.timestamp) && finite(b.tx_count) && finite(b.weight)) map.set(b.height, b);
  }
  return [...map.values()].sort((a, b) => b.height - a.height).slice(0, 8);
}

export function tesseract(time, options = {}) {
  const { xw=time*.23, yw=0, zw=time*.17, yz=time*.13, distance=3 } = options;
  const vertices = [];
  for (let i = 0; i < 16; i++) {
    let v = [0, 1, 2, 3].map(bit => (i >> bit & 1) ? 1 : -1);
    for (const [a, b, theta] of [[0, 3, xw], [1, 3, yw], [1, 2, yz], [2, 3, zw]]) {
      const c = Math.cos(theta), s = Math.sin(theta), x = v[a];
      v[a] = x * c - v[b] * s; v[b] = x * s + v[b] * c;
    }
    const p = 1 / (clamp(distance,2.5,5) - v[3]);
    vertices.push([v[0] * p, v[1] * p, v[2] * p]);
  }
  const edges = [];
  for (let i = 0; i < 16; i++) for (let j = i + 1; j < 16; j++) {
    const xor = i ^ j;
    if ((xor & (xor - 1)) === 0) edges.push([i, j]);
  }
  return { vertices, edges };
}
