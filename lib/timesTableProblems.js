// The 12x12 times-table rows shared by GET /api/problems (lazy seed) and prisma/seed.js.
// Plain ESM with no imports so `node prisma/seed.js` can load it directly.
export function buildTimesTableProblems(max = 12) {
  const data = [];
  for (let i = 1; i <= max; i++) {
    for (let j = 1; j <= max; j++) {
      data.push({ problem: `${i} x ${j}`, answer: i * j });
    }
  }
  return data;
}
