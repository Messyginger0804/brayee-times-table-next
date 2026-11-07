/**
 * cleanup-accounts.js deletes every non-guest user except Braylee, which would include saved cadets (kids who chose to keep their cadet).
 * So it refuses to run while any exist, unless the operator passes --include-saved-cadets. Returns the refusal text, or null when it may go on.
 */
function savedCadetRefusal(count, includeSavedCadets) {
  if (!count || includeSavedCadets) return null;
  return `Refusing to run: ${count} saved cadet${count === 1 ? '' : 's'} exist and this script would delete ${count === 1 ? 'it' : 'them'} with all their data. `
    + 'Pass --include-saved-cadets only if that is really what you want.';
}

module.exports = { savedCadetRefusal };
