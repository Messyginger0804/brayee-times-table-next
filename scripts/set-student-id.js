#!/usr/bin/env node
/**
 * Set or reset the student ID of a named (non-guest) account.
 *
 * Stores a plain bcrypt hash of the ID in User.pin and clears failedLoginAttempts / lockedUntil. The app accepts a plain bcrypt
 * hash and, on the first production sign-in, transparently rewrites it as the peppered hash (see docs/DEPLOY-RUNBOOK.md).
 *
 * Usage:  node scripts/set-student-id.js --name Braylee      # reads the ID from a hidden prompt, or from stdin when piped
 *         add --i-have-a-backup to run against a non-localhost DATABASE_URL
 * The ID is never taken from argv and never printed or logged; the only output is the number of rows updated.
 */
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const { isLocalDbUrl, hostOf, isValidStudentId } = require('./lib/studentIdGuards');

const args = process.argv.slice(2);
const HAS_BACKUP = args.includes('--i-have-a-backup');
const nameIdx = args.indexOf('--name');
const NAME = nameIdx >= 0 ? args[nameIdx + 1] : null;

function readFromStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => { data += c; });
    process.stdin.on('end', () => resolve(data.split(/\r?\n/)[0].trim()));
    process.stdin.on('error', reject);
  });
}

function readHidden(prompt) {
  return new Promise((resolve) => {
    let value = '';
    process.stderr.write(prompt);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    const onData = (ch) => {
      for (const c of ch) {
        if (c === '\r' || c === '\n' || c === '\u0004') {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdin.off('data', onData);
          process.stderr.write('\n');
          return resolve(value.trim());
        }
        if (c === '\u0003') { process.stderr.write('\n'); process.exit(130); }
        if (c === '\u007f') value = value.slice(0, -1); else value += c;
      }
    };
    process.stdin.on('data', onData);
  });
}

async function main() {
  if (!NAME) { console.error('Usage: node scripts/set-student-id.js --name <account name> [--i-have-a-backup]'); process.exit(2); }
  const url = process.env.DATABASE_URL || '';
  if (!isLocalDbUrl(url) && !HAS_BACKUP) {
    console.error(`Refusing to run against non-localhost database "${hostOf(url)}" without --i-have-a-backup.`);
    process.exit(2);
  }
  const id = process.stdin.isTTY ? await readHidden('Student ID (hidden): ') : await readFromStdin();
  if (!isValidStudentId(id)) { console.error('The student ID must be 5 to 8 digits.'); process.exit(2); }

  const prisma = new PrismaClient();
  try {
    const { count } = await prisma.user.updateMany({
      where: { name: NAME, isGuest: false },
      data: { pin: await bcrypt.hash(id, 10), failedLoginAttempts: 0, lockedUntil: null },
    });
    console.log(`updated ${count} row(s)`);
    if (count !== 1) process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => { console.error(e && e.code ? `failed (${e.code})` : 'failed'); process.exit(1); });
