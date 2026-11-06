// Times-table skills that map onto the existing Problem rows. Kept free of the curriculum library so the menu bundle stays small.
// Skills answered from the existing Problem rows ("a x b"), tracked by UserProblem.mastered (3-in-a-row, lib/mastery.js).
// x0 facts and 13-15 squares are not Problem rows, so those parts are not tracked here.
const both = (a, b, max) => a <= max && b <= max;
export const PROBLEM_SKILLS = {
  'g3-mult-0-1-2-5-10': (a, b) => both(a, b, 10) && ([1, 2, 5, 10].includes(a) || [1, 2, 5, 10].includes(b)),
  'g3-mult-3-4': (a, b) => both(a, b, 10) && (a === 3 || a === 4 || b === 3 || b === 4),
  'g3-mult-9-squares': (a, b) => both(a, b, 10) && (a === 9 || b === 9 || (a === b && a >= 6)),
  'g3-mult-6-7-8': (a, b) => a >= 6 && a <= 8 && b >= 6 && b <= 8,
  'g3-mult-mixed': (a, b) => both(a, b, 10),
  'g4-mult-11-15': (a, b) => both(a, b, 12) && (a >= 11 || b >= 11),
};
export const isProblemSkill = (id) => Object.prototype.hasOwnProperty.call(PROBLEM_SKILLS, id);

export function parseProblemText(text) {
  const m = /^\s*(\d+)\s*[xX×]\s*(\d+)\s*$/.exec(text || '');
  return m ? [parseInt(m[1], 10), parseInt(m[2], 10)] : null;
}

