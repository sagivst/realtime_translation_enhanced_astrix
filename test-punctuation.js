/**
 * Test script for punctuation restoration
 * Run: node test-punctuation.js
 */

const PunctuationRestorer = require('./punctuation');

const restorer = new PunctuationRestorer();

console.log('Testing Punctuation Restoration Module\n');
console.log('=' .repeat(60));

// Test cases that demonstrate fragmentation fixes
const testCases = [
  {
    input: 'we should move the meeting to tuesday',
    description: 'Simple sentence without punctuation'
  },
  {
    input: 'how are you doing today',
    description: 'Question without question mark'
  },
  {
    input: 'this is the first sentence and this is the second one',
    description: 'Run-on sentence'
  },
  {
    input: 'hello my name is john i work at microsoft',
    description: 'Multiple thoughts without punctuation'
  },
  {
    input: 'can you hear me',
    description: 'Question format detection'
  },
  {
    input: 'the meeting is at 3 p m tomorrow',
    description: 'Time with abbreviations'
  }
];

console.log('\n1. Single Sentence Restoration\n');
testCases.forEach((test, index) => {
  const result = restorer.restore(test.input);
  console.log(`Test ${index + 1}: ${test.description}`);
  console.log(`  Input:  "${test.input}"`);
  console.log(`  Output: "${result}"`);
  console.log();
});

console.log('\n2. Segment Merging (Fragmentation Fix)\n');

// Simulate fragmented segments
const fragmentedSegments = [
  { text: 'we should move', ts_start: 1.0, ts_end: 1.5 },
  { text: 'the meeting', ts_start: 1.6, ts_end: 2.0 },
  { text: 'to tuesday', ts_start: 2.1, ts_end: 2.5 }
];

console.log('Fragmented segments:');
fragmentedSegments.forEach((seg, i) => {
  console.log(`  Segment ${i + 1}: "${seg.text}"`);
});

const merged = restorer.mergeSegments(fragmentedSegments);
console.log('\nMerged result:');
merged.forEach((seg, i) => {
  console.log(`  Final ${i + 1}: "${seg.text}" [${seg.ts_start}s - ${seg.ts_end}s]`);
});

console.log('\n3. Should Merge Logic\n');

const mergePairs = [
  ['we should move', 'the meeting'],
  ['Hello there.', 'How are you?'],
  ['This is complete.', 'And this continues'],
  ['I think', 'we need to go']
];

mergePairs.forEach(([text1, text2]) => {
  const shouldMerge = restorer.shouldMergeSegments(text1, text2);
  console.log(`"${text1}" + "${text2}"`);
  console.log(`  → Should merge: ${shouldMerge ? 'YES' : 'NO'}\n`);
});

console.log('\n' + '='.repeat(60));
console.log('✓ Punctuation restoration tests complete!');
console.log('\nThis enhanced version solves sentence fragmentation by:');
console.log('  1. Adding proper punctuation and capitalization');
console.log('  2. Merging incomplete segments into coherent sentences');
console.log('  3. Detecting question vs. statement format');
console.log('  4. Fixing spacing around punctuation marks');
console.log('\nResult: More natural, complete sentences for better translation!\n');
