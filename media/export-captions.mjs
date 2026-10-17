import fs from 'node:fs/promises';
const t=JSON.parse(await fs.readFile('media/timeline.json','utf8'));const out='site/assets/video/';
const time=(n,comma=false)=>new Date(n*1000).toISOString().slice(11,23).replace('.',comma?',':'.');
function captions(scenes,name){const json=scenes.map(s=>({text:s.caption,startMs:s.start*1000,endMs:s.end*1000,timestampMs:null,confidence:null}));return Promise.all([fs.writeFile(out+name+'.json',JSON.stringify(json,null,2)+'\n'),fs.writeFile(out+name+'.vtt','WEBVTT\n\n'+scenes.map(s=>`${time(s.start)} --> ${time(s.end)}\n${s.caption}\n`).join('\n')),fs.writeFile(out+name+'.srt',scenes.map((s,i)=>`${i+1}\n${time(s.start,true)} --> ${time(s.end,true)}\n${s.caption}\n`).join('\n'))]);}
await captions(t.scenes,'captions');
for(const mode of ['teaser','portrait'])await captions(t[mode].map((id,i)=>({start:i*5,end:i*5+5,caption:t.shareCaptions[id]})),mode+'-captions');
await fs.writeFile(out+'transcript.txt','Ingenium — silent captioned demo\n90 seconds. No recorded narration or music.\n\n'+t.scenes.map(s=>`${time(s.start).slice(0,8)}–${time(s.end).slice(0,8)}\n${s.caption}\n`).join('\n')+'\nExamples are original synthetic work. The command excerpt is from an actual installed local helper run. Desktop client discovery remains unverified.\n');
