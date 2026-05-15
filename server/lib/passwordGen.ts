import crypto from 'node:crypto';

const ADJECTIVES = [
  'Brisk','Calm','Clever','Bold','Bright','Quick','Quiet','Sharp',
  'Steady','Swift','Vivid','Warm','Eager','Lucky','Merry','Nimble',
];
const NOUNS = [
  'Falcon','Otter','Panda','Heron','Marlin','Lynx','Quail','Tiger',
  'Wolf','Yak','Zebra','Crane','Lark','Robin','Hawk','Finch',
];

export function generateTempPassword(): string {
  const adj   = ADJECTIVES[crypto.randomInt(ADJECTIVES.length)];
  const noun  = NOUNS[crypto.randomInt(NOUNS.length)];
  const digit = String(crypto.randomInt(100, 1000));
  return `${adj}-${noun}-${digit}`;
}
