// The 1-12 x 1-12 multiplication facts that already live in the Problem table, with teaching order.
// Order (spec): x2, x10, x5, then x0/x1, x4, x3, x9, squares 6-10, then x6/x7/x8; grade 4 adds x11, x12.

export const MULT_SETS = [
  { id: 'x2', name: '×2', skillId: 'g3-mult-0-1-2-5-10', levelIndex: 0, test: (n) => n === 2 },
  { id: 'x10', name: '×10', skillId: 'g3-mult-0-1-2-5-10', levelIndex: 1, test: (n) => n === 10 },
  { id: 'x5', name: '×5', skillId: 'g3-mult-0-1-2-5-10', levelIndex: 2, test: (n) => n === 5 },
  { id: 'x0x1', name: '×0 and ×1', skillId: 'g3-mult-0-1-2-5-10', levelIndex: 3, test: (n) => n <= 1 },
  { id: 'x4', name: '×4', skillId: 'g3-mult-3-4', levelIndex: 0, test: (n) => n === 4 },
  { id: 'x3', name: '×3', skillId: 'g3-mult-3-4', levelIndex: 1, test: (n) => n === 3 },
  { id: 'x9', name: '×9', skillId: 'g3-mult-9-squares', levelIndex: 0, test: (n) => n === 9 },
  { id: 'squares', name: 'Squares 6-10', skillId: 'g3-mult-9-squares', levelIndex: 1, test: () => false, square: (a, b) => a === b && a >= 6 && a <= 10 },
  { id: 'x6', name: '×6', skillId: 'g3-mult-6-7-8', levelIndex: 0, test: (n) => n === 6 },
  { id: 'x7', name: '×7', skillId: 'g3-mult-6-7-8', levelIndex: 1, test: (n) => n === 7 },
  { id: 'x8', name: '×8', skillId: 'g3-mult-6-7-8', levelIndex: 2, test: (n) => n === 8 },
  { id: 'x11', name: '×11', skillId: 'g4-mult-11-15', levelIndex: 0, test: (n) => n === 11 },
  { id: 'x12', name: '×12', skillId: 'g4-mult-11-15', levelIndex: 1, test: (n) => n === 12 },
];

const HARD = new Set(['6x7', '6x8', '7x8']);

function setIndexOf(a, b) {
  let best = Infinity;
  MULT_SETS.forEach((s, i) => {
    if (s.test(a) || s.test(b) || (s.square && s.square(a, b))) best = Math.min(best, i);
  });
  return best;
}

/**
 * All facts in the Problem table (both factor orders, 144 rows), ordered for teaching.
 * @param {{includeZero?: boolean}} [opts] includeZero adds the x0 facts (0..10), which are NOT in the table (inTable:false).
 * @returns {Array<{a:number,b:number,problem:string,answer:number,setId:string,setIndex:number,order:number,grade:3|4,skillId:string,levelIndex:number,hard:boolean,inTable:boolean}>}
 */
export function getMultiplicationFacts(opts = {}) {
  const out = [];
  const add = (a, b, inTable) => {
    const si = setIndexOf(a, b);
    const set = MULT_SETS[si];
    const key = `${Math.min(a, b)}x${Math.max(a, b)}`;
    out.push({
      a,
      b,
      problem: `${a} x ${b}`,
      answer: a * b,
      setId: set.id,
      setIndex: si,
      order: 0,
      grade: a <= 10 && b <= 10 ? 3 : 4,
      skillId: set.skillId,
      levelIndex: set.levelIndex,
      hard: HARD.has(key),
      inTable,
    });
  };
  for (let a = 1; a <= 12; a++) for (let b = 1; b <= 12; b++) add(a, b, true);
  if (opts.includeZero) {
    for (let n = 0; n <= 10; n++) {
      add(0, n, false);
      if (n > 0) add(n, 0, false);
    }
  }
  out.sort((x, y) => x.setIndex - y.setIndex || Number(x.hard) - Number(y.hard) || Math.min(x.a, x.b) - Math.min(y.a, y.b) || x.a - y.a || x.b - y.b);
  out.forEach((f, i) => {
    f.order = i;
  });
  return out;
}
