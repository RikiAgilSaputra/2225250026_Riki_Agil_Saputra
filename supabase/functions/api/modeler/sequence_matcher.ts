// Port of Python's difflib.SequenceMatcher(None, a, b).ratio() for strings (incl. the autojunk heuristic).

function buildB2j(b: string): Map<string, number[]> {
  const b2j = new Map<string, number[]>();
  for (let i = 0; i < b.length; i++) {
    const ch = b[i];
    const list = b2j.get(ch);
    if (list) list.push(i);
    else b2j.set(ch, [i]);
  }
  const n = b.length;
  if (n >= 200) {
    const ntest = Math.floor(n / 100) + 1;
    for (const [ch, idxs] of [...b2j]) if (idxs.length > ntest) b2j.delete(ch);
  }
  return b2j;
}

function findLongestMatch(
  a: string, b: string, b2j: Map<string, number[]>, alo: number, ahi: number, blo: number, bhi: number,
): [number, number, number] {
  let besti = alo;
  let bestj = blo;
  let bestsize = 0;
  let j2len = new Map<number, number>();
  for (let i = alo; i < ahi; i++) {
    const newj2len = new Map<number, number>();
    for (const j of b2j.get(a[i]) ?? []) {
      if (j < blo) continue;
      if (j >= bhi) break;
      const k = (j2len.get(j - 1) ?? 0) + 1;
      newj2len.set(j, k);
      if (k > bestsize) {
        besti = i - k + 1;
        bestj = j - k + 1;
        bestsize = k;
      }
    }
    j2len = newj2len;
  }
  // isjunk=None, so nothing is junk: like difflib, extend the match with equal neighbours
  // (these can be "popular" characters that autojunk removed from b2j).
  while (besti > alo && bestj > blo && a[besti - 1] === b[bestj - 1]) {
    besti--;
    bestj--;
    bestsize++;
  }
  while (besti + bestsize < ahi && bestj + bestsize < bhi && a[besti + bestsize] === b[bestj + bestsize]) {
    bestsize++;
  }
  return [besti, bestj, bestsize];
}

export function ratio(a: string, b: string): number {
  const la = a.length;
  const lb = b.length;
  if (la + lb === 0) return 1;
  const b2j = buildB2j(b);
  const queue: [number, number, number, number][] = [[0, la, 0, lb]];
  let matches = 0;
  while (queue.length) {
    const [alo, ahi, blo, bhi] = queue.pop() as [number, number, number, number];
    const [i, j, k] = findLongestMatch(a, b, b2j, alo, ahi, blo, bhi);
    if (k) {
      matches += k;
      if (alo < i && blo < j) queue.push([alo, i, blo, j]);
      if (i + k < ahi && j + k < bhi) queue.push([i + k, ahi, j + k, bhi]);
    }
  }
  return (2 * matches) / (la + lb);
}
