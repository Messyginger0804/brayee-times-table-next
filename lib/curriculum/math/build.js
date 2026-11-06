// Prompt builder. Generators describe a prompt as a list of items:
//   - string  -> literal text (carries its own spaces), ASCII: "x" for times, "/" for divide, "-" for minus
//   - object  -> a rich token (blank, fraction, mixed number, power, coin)
// prompt (plain, ASCII) is the concatenation of every item's plain form.
// promptParts is the same list with display glyphs (× ÷ −) and adjacent text merged.

export const B = { t: 'blank' };
export const F = (num, den) => ({ t: 'fraction', num, den });
export const M = (whole, num, den) => ({ t: 'mixed', whole, num, den });
export const P = (base, exp) => ({ t: 'power', base, exp });
export const C = (coin, count) => ({ t: 'coin', coin, count });

const COIN_WORDS = {
  penny: ['penny', 'pennies'],
  nickel: ['nickel', 'nickels'],
  dime: ['dime', 'dimes'],
  quarter: ['quarter', 'quarters'],
};

/** Display version of ASCII text: true minus, times and divide signs. */
function display(str) {
  return str.replace(/ x /g, ' × ').replace(/ \/ /g, ' ÷ ').replace(/-/g, '−');
}

function plain(item) {
  if (typeof item === 'string') return item;
  switch (item.t) {
    case 'blank':
      return '__';
    case 'fraction':
      return `${item.num ?? '__'}/${item.den ?? '__'}`;
    case 'mixed':
      return `${item.whole} ${item.num}/${item.den}`;
    case 'power':
      return `${item.base}^${item.exp}`;
    case 'coin':
      return `${item.count} ${COIN_WORDS[item.coin][item.count === 1 ? 0 : 1]}`;
    default:
      return '';
  }
}

/**
 * @param {Array<string|object>} items
 * @returns {{prompt:string, promptParts:object[]}}
 */
export function build(items) {
  const prompt = items.map(plain).join('');
  const parts = [];
  for (const it of items) {
    if (typeof it === 'string') {
      const last = parts[parts.length - 1];
      if (last && last.t === 'text') last.v += display(it);
      else parts.push({ t: 'text', v: display(it) });
    } else parts.push({ ...it });
  }
  return { prompt, promptParts: parts };
}

/** Join items with a string separator. */
export function seq(list, sep) {
  const out = [];
  list.forEach((x, i) => {
    if (i) out.push(sep);
    out.push(x);
  });
  return out;
}

/** "left = __" */
export const eq = (...left) => [...left, ' = ', B];

/** Negative numbers in non-leading position get parentheses: 7 + (-3). */
export const par = (n) => (n < 0 ? `(${n})` : String(n));
