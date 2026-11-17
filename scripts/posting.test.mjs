import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script, createContext } from 'node:vm';

const source = readFileSync(new URL('../apps/web/legacy-src/modulos/crm_posting.js', import.meta.url), 'utf8');
const pure = source.split('document.addEventListener')[0];
const vm = createContext({ Date, Set, console });
new Script(pure, { filename: 'crm_posting.js' }).runInContext(vm);
const calBuildPosts = new Script('calBuildPosts').runInContext(vm);
const postMonth = new Script('postMonth').runInContext(vm);

test('calendar creates exactly one post per selected weekday occurrence', () => {
  const posts = calBuildPosts({ postingDays: ['seg', 'qua', 'sex'] }, '2026-11');
  assert.equal(posts.length, 13);
  assert.equal(posts[0].date, '2026-11-02');
  assert.equal(posts.at(-1).date, '2026-11-30');
  assert.equal(new Set(posts.map((p) => p.date)).size, posts.length);
  assert.ok(posts.every((p) => p.kind === 'regular' && p.date.startsWith('2026-11')));
});

test('weekdays are ISO-calendar stable across Sundays, leap years and time zones', () => {
  const sundays = calBuildPosts({ postingDays: ['dom'] }, '2026-11');
  assert.equal(sundays.length, 5);
  assert.equal(sundays[0].date, '2026-11-01');
  const leap = calBuildPosts({ postingDays: ['ter'] }, '2028-02');
  assert.equal(leap.length, 5);
  assert.equal(leap.at(-1).date, '2028-02-29');
});

test('unconfigured customers do not receive guessed publication dates', () => {
  assert.equal(calBuildPosts({ name: 'Sem configuração' }, '2026-11').length, 0);
  assert.equal(calBuildPosts({ postingDays: [] }, '2026-11').length, 0);
  assert.equal(calBuildPosts({ postingDays: ['seg'] }, '2026-13').length, 0);
});

test('individual publication date relocation is restricted to the same valid month', () => {
  assert.equal(postMonth('2026-11-20', '2026-11'), true);
  assert.equal(postMonth('2026-12-01', '2026-11'), false);
  assert.equal(postMonth('2026-11-31', '2026-11'), false);
  assert.equal(postMonth('2028-02-29', '2028-02'), true);
  assert.equal(postMonth('2027-02-29', '2027-02'), false);
});
