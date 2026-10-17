import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequester, limitsFor } from '../src/assets/transport.mjs';
import { createAssetClient } from '../src/assets/index.mjs';
const url='https://api.iconify.design/search?query=SECRET&token=SECRET';
const json=()=>new Response('{"icons":[]}',{headers:{'content-type':'application/json'}});
const make=(transport,captureDiagnostics=true,limits={})=>createRequester({transport,captureDiagnostics,limits:limitsFor(limits)});

test('diagnostic capture defaults off; construction/getter never sends or writes',async()=>{
 let calls=0;const r=make(async()=>{calls++;return json();},false);assert.deepEqual(r.diagnostics(),[]);assert.equal(calls,0);
 await r.read(url,1000,'application/json');assert.deepEqual(r.diagnostics(),[]);assert.equal(calls,1);
 assert.throws(()=>make(async()=>json(),'yes'),/selection/);
 const c=createAssetClient({captureDiagnostics:true});assert.deepEqual(c.diagnostics(),[]);
 await assert.rejects(c.search({provider:'iconify',query:'window'}));assert.equal(c.diagnostics()[0].outcome,'not-run');
});
test('HTTP denial captures redacted observable stage without bodies, raw headers, query or issuer inference',async()=>{
 let calls=0;const headers={'content-type':'text/html;secret=SECRET','server':'SECRET','via':'SECRET','proxy-authenticate':'SECRET','x-request-id':'SECRET','cf-ray':'SECRET','x-cache':'SECRET','set-cookie':'SECRET','authorization':'SECRET','retry-after':'SECRET','location':'https://SECRET/'};
 const r=make(async()=>{calls++;return new Response('SECRET raw denial body',{status:403,headers});});
 await assert.rejects(r.read(url,1000,'application/json'),e=>e.code==='http');
 const d=r.diagnostics()[0];assert.equal(calls,1);assert.equal(d.stage,'response-headers');assert.equal(d.outcome,'http');assert.equal(d.issuingLayer,'unknown');assert.equal(d.transport,'injected-fixture');
 assert.equal(d.responses[0].status,403);assert.equal(d.responses[0].endpoint,'iconify.search');assert.equal(d.responses[0].headerPresence.via,true);
 const serialized=JSON.stringify(d);for(const forbidden of ['SECRET','https:','query','token','set-cookie','authorization','retry-after','raw denial'])assert.ok(!serialized.includes(forbidden),forbidden);
 assert.match(d.responses[0].fingerprint,/^[a-f0-9]{64}$/);assert.ok(d.elapsedMs>=0);assert.ok(Number.isFinite(Date.parse(d.startedAt)));
});
test('fingerprints are stable across raw secret headers/bodies/query changes and cannot encode them',async()=>{
 const fingerprints=[];
 for(const secret of ['FIRST_SECRET','SECOND_SECRET']){
 const r=make(async()=>new Response(secret,{status:403,headers:{server:secret,'content-type':'text/plain'}}));await assert.rejects(r.read('https://api.iconify.design/search?query='+secret,1000,'application/json'));fingerprints.push(r.diagnostics()[0].responses[0].fingerprint);
 }
 assert.equal(fingerprints[0],fingerprints[1]);
});
test('manual redirects record category/decision without target URLs; unsafe hops remain refused',async()=>{
 let calls=0;const r=make(async()=>++calls===1?new Response(null,{status:302,headers:{location:'/search?query=SECRET'}}):json());await r.read(url,1000,'application/json');
 const d=r.diagnostics()[0];assert.equal(calls,2);assert.equal(d.responses[0].redirect,'followed-after-validation');assert.equal(d.responses[1].status,200);assert.equal(d.outcome,'pass');assert.ok(!JSON.stringify(d).includes('SECRET'));
 const bad=make(async()=>new Response(null,{status:302,headers:{location:'https://127.0.0.1/SECRET'}}));await assert.rejects(bad.read(url,1000,'application/json'));assert.equal(bad.diagnostics()[0].responses[0].redirect,'observed-not-followed');assert.equal(bad.diagnostics()[0].outcome,'unsafe-url');
});
test('request exceptions and timeouts retain stage but never error text or claimed CONNECT attribution',async()=>{
 const r=make(async()=>{throw Error('SECRET CONNECT proxy credential detail');});await assert.rejects(r.read(url,1000,'application/json'));
 assert.equal(r.diagnostics()[0].stage,'request');assert.equal(r.diagnostics()[0].outcome,'transport-error');assert.deepEqual(r.diagnostics()[0].responses,[]);assert.ok(!JSON.stringify(r.diagnostics()).includes('SECRET'));
 const timeout=make(()=>new Promise(()=>{}),true,{timeoutMs:5});await assert.rejects(timeout.read(url,1000,'application/json'));assert.equal(timeout.diagnostics()[0].outcome,'timeout');assert.equal(timeout.diagnostics()[0].issuingLayer,'unknown');
});
test('capture is bounded/copy isolated and makes no request-policy changes',async()=>{
 let plainOptions,capturedOptions;
 await make(async(_,o)=>{plainOptions=o;return json();},false).read(url,1000,'application/json');
 const r=make(async(_,o)=>{capturedOptions=o;return json();});for(let i=0;i<12;i++)await r.read(url,1000,'application/json');
 assert.equal(r.diagnostics().length,8);assert.ok(r.diagnostics().every(d=>d.responses.length<=3));const copy=r.diagnostics();copy[0].responses[0].status=999;assert.equal(r.diagnostics()[0].responses[0].status,200);
 for(const key of ['redirect','credentials','referrerPolicy','headers'])assert.deepEqual(capturedOptions[key],plainOptions[key]);
});
