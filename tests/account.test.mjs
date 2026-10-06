import test from 'node:test';
import assert from 'node:assert/strict';
import * as account from '../src/account.js';
import * as store from '../src/store.js';
import * as unlock from '../src/unlock.js';
const data=new Map();globalThis.localStorage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
globalThis.window={dispatchEvent(){}};
const use=a=>data.set('astrobox.account',JSON.stringify(a));
test('같은 기기의 학생·학부모·비회원 기록과 이용권은 서로 섞이지 않는다',()=>{
 data.clear();store.save({events:[{cid:'guest'}],cards:[]});unlock.grantLocal('pack-1');
 use({code:'STUD01',token:'student',role:'student'});assert.equal(store.load().events.length,0);assert.equal(unlock.isUnlocked('m2'),false);
 store.save({events:[{cid:'student'}],cards:[]});unlock.grantLocal('pack-1');
 use({code:'PARN01',token:'parent',role:'parent'});assert.equal(store.load().events.length,0);assert.equal(unlock.isUnlocked('m2'),false);
 account.logout();assert.equal(store.load().events[0].cid,'guest');
 use({code:'STUD01',token:'student',role:'student'});assert.equal(store.load().events[0].cid,'student');assert.equal(unlock.isUnlocked('m2'),true);
});
test('기존 로그인 세션의 로컬 기록은 계정별 저장소로 보존한다',()=>{
 data.clear();store.save({events:[{cid:'old'}],cards:[]});use({code:'OLD123',token:'old'});
 assert.equal(account.current().role,'legacy');assert.equal(store.load().events[0].cid,'old');
});
test('이전 계정의 늦은 동기화 응답은 새 계정 기록을 덮어쓰지 않는다',async()=>{
 data.clear();use({code:'STUD01',token:'student',role:'student'});
 const original=globalThis.fetch;let finish;
 globalThis.fetch=()=>new Promise(resolve=>{finish=resolve;});
 try{const pending=store.sync();use({code:'PARN01',token:'parent',role:'parent'});finish(new Response(JSON.stringify({events:[{cid:'student'}],cards:[]})));assert.equal(await pending,null);assert.equal(store.load().events.length,0);}finally{globalThis.fetch=original;}
});
