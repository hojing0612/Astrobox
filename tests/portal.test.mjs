import test from 'node:test';
import assert from 'node:assert/strict';
import { ACTIVITIES, filterActivities, recentActivity } from '../src/portal.js';
import * as unlock from '../src/unlock.js';

const storage = new Map();
globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };

test('탐구 검색은 주제와 검색어를 함께 적용하고 기존 경로를 보존한다', () => {
  assert.equal(ACTIVITIES.length, 8);
  assert.equal(new Set(ACTIVITIES.map(a => a.href)).size, 8);
  assert.deepEqual(filterActivities('stars', '시간').map(a => a.id), ['timeline']);
  assert.equal(filterActivities('orbit').length, 4);
  assert.equal(filterActivities('rocket', '달').length, 0);
  assert.equal(filterActivities('all', '  연료  ').length > 0, true);
  assert.deepEqual(filterActivities('all', '없는내용'), []);
});

test('최근 탐구는 주문·요청 이벤트를 건너뛰고 유효한 활동으로 이어진다', () => {
  assert.equal(recentActivity([]).id, 'rocket');
  assert.equal(recentActivity([{mission:'m3'},{type:'order'},{mission:'not-found'}]).id, 'm3');
});

test('비로그인 무료 신청은 브라우저 이용권과 금액 0원 내역을 함께 남긴다', async () => {
  storage.clear();
  const result = await unlock.checkout('pack-1');
  assert.equal(result.where, 'local');
  assert.equal(unlock.isUnlocked('m2'), true);
  const resultStatus = await unlock.orderStatus();
  assert.equal(resultStatus.orders.length, 1);
  assert.equal(resultStatus.orders[0].amount, 0);
  await assert.rejects(unlock.checkout('unknown'));
});

test('로그인 만료·서버 중단 때 로컬 이용권으로 조용히 대체하지 않는다', async () => {
  storage.clear();
  storage.set('astrobox.account', JSON.stringify({token:'test-expired'}));
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({error:'로그인이 필요해요'}), {status:401});
    await assert.rejects(unlock.checkout('pack-1'), /로그인/);
    assert.equal(unlock.isUnlocked('m2'), false);
    globalThis.fetch = async () => new Response('{}', {status:503});
    await assert.rejects(unlock.checkout('pack-1'), /계정 서버/);
    assert.equal(unlock.isUnlocked('m2'), false);
  } finally { globalThis.fetch = originalFetch; storage.clear(); }
});
