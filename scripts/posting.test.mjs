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
const postMonthGrid = new Script('postMonthGrid').runInContext(vm);
const calMovePost = new Script('calMovePost').runInContext(vm);

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

test('monthly grid starts on Monday, includes every day and marks unoccupied dates', () => {
  const posts = calBuildPosts({ postingDays: ['seg','qua','sex'] }, '2026-11');
  const grid = postMonthGrid('2026-11', posts);
  assert.equal(grid.offset, 6); // 1 November 2026 falls on Sunday
  assert.equal(grid.days.length, 30);
  assert.equal(grid.days.filter((day) => day.posts.length > 0).length, 13);
  assert.equal(grid.days[0].date, '2026-11-01');
  assert.equal(grid.days[0].posts.length, 0);
  assert.equal(grid.days[1].posts.length, 1);
  assert.equal(postMonthGrid('2027-02', []).days.length, 28);
  assert.equal(postMonthGrid('2028-02', []).days.length, 29);
});

test('dragging a post only into a free day preserves creative link and records the move', async () => {
  const c = { id:'cal1',month:'2026-11',stage:'copy',approvedAt:'',posts:[
    { id:'p2',date:'2026-11-02',kind:'regular',title:'Tema',creativeId:'art1',caption:'Legenda importante' },
    { id:'p4',date:'2026-11-04',kind:'regular',title:'Outra arte',creativeId:'art2' },
  ] };
  let updates = 0;
  const entries=[];
  vm.byId=(_collection,id)=>id==='cal1'?c:null;
  vm.calCanEdit=()=>true;
  vm.calSave=async (_record,patch,history)=>{Object.assign(c,patch);entries.push(history);updates++;};
  vm.toast=()=>{};
  vm.fD=(date)=>date;
  vm.ui={psPicked:{calId:'cal1',postId:'p2'}};
  assert.equal(await calMovePost(c,'p2','2026-11-04'),false,'occupied day must reject move');
  assert.equal(updates,0);
  assert.equal(await calMovePost(c,'p2','2026-12-01').catch(e=>e.message),'invalid_date');
  assert.equal(updates,0);
  assert.equal(await calMovePost(c,'p2','2026-11-03'),true);
  assert.equal(updates,1);
  assert.equal(c.posts[0].date,'2026-11-03');
  assert.equal(c.posts[0].movedFrom,'2026-11-02');
  assert.equal(c.posts[0].creativeId,'art1');
  assert.equal(c.posts[0].caption,'Legenda importante');
  assert.equal(c.posts[1].date,'2026-11-04');
  assert.equal(vm.ui.psPicked,null);
  assert.match(entries[0].note,/2026-11-02.*2026-11-03/);
});

test('drag/drop blocks delivered calendars and reopens final validation after edits', async () => {
  const c = {id:'cal2',month:'2026-11',stage:'entregue',posts:[{id:'p',date:'2026-11-02'}]};
  vm.byId=()=>c;vm.calCanEdit=()=>true;vm.toast=()=>{};vm.fD=()=>'';vm.ui={psPicked:null};
  await assert.rejects(()=>calMovePost(c,'p','2026-11-03'),/permission_denied/);
  c.stage='validacao';c.approvedAt='2026-11-01';c.approvedBy='leader';
  vm.calSave=async(_,patch)=>{Object.assign(c,patch)};
  assert.equal(await calMovePost(c,'p','2026-11-03'),true);
  assert.equal(c.approvedAt,'');
  assert.equal(c.approvedBy,'');
});
