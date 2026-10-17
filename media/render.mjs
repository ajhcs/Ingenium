import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';

const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.resolve(process.env.VIDEO_WORK_DIR||path.join(project,'work/video-render'));
const publicDir=path.join(project,'site/assets/video');
const timeline=JSON.parse(await fs.readFile(path.join(project,'media/timeline.json'),'utf8'));
await fs.mkdir(output,{recursive:true});await fs.mkdir(publicDir,{recursive:true});
const require=createRequire(path.join(path.resolve(process.env.BROWSER_ADAPTER_DIR||project),'package.json'));
const {chromium}=require('playwright');
const sharp=createRequire(path.join(project,'package.json'))(process.env.SHARP_MODULE||'sharp');
if(!process.argv.includes('--encode-only')){
const browser=await chromium.launch({headless:true,chromiumSandbox:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1,reducedMotion:'reduce'});
const sceneChecks=[];
async function ready(){await page.evaluate(()=>document.fonts.ready);await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));}
await page.setViewportSize({width:1080,height:820});await page.goto(pathToFileURL(path.join(project,'media/actual-cli.html')).href);await ready();await page.screenshot({path:path.join(project,'site/assets/demos/actual-cli.png')});
await page.setViewportSize({width:1600,height:1140});await page.goto(pathToFileURL(path.join(project,'media/comparison.html')).href);await ready();await page.screenshot({path:path.join(project,'site/assets/demos/comparison-cover.png')});
async function shot(scene,mode,index,name){
 await page.setViewportSize(mode==='portrait'?{width:1080,height:1920}:{width:1920,height:1080});
 await page.goto(pathToFileURL(path.join(project,'media/preview.html')).href);
 await page.evaluate(({scene,mode,index})=>window.drawScene(scene,mode,index),{scene,mode,index});await ready();
 sceneChecks.push({name,fonts:await page.evaluate(()=>[...document.fonts].map(f=>({family:f.family,status:f.status}))),images:await page.evaluate(()=>[...document.images].map(i=>({source:i.getAttribute('src'),loaded:i.complete&&i.naturalWidth>0}))),caption:await page.locator('.caption').evaluate(e=>({fontSize:getComputedStyle(e).fontSize,height:e.clientHeight,scrollHeight:e.scrollHeight})),title:await page.locator('h1').evaluate(e=>({width:e.clientWidth,scrollWidth:e.scrollWidth,height:e.clientHeight,scrollHeight:e.scrollHeight}))});
 await page.screenshot({path:path.join(output,name+'.png')});
}
for(let i=0;i<timeline.scenes.length;i++)await shot(timeline.scenes[i],'master',i,`master-${String(i).padStart(2,'0')}`);
for(let i=0;i<timeline.teaser.length;i++){const s=timeline.scenes.find(s=>s.id===timeline.teaser[i]);await shot({...s,caption:timeline.shareCaptions[s.id]},'teaser',i,`teaser-${i}`);}
for(let i=0;i<timeline.portrait.length;i++){const s=timeline.scenes.find(s=>s.id===timeline.portrait[i]);await shot({...s,caption:timeline.shareCaptions[s.id]},'portrait',i,`portrait-${i}`);}
await page.goto(pathToFileURL(path.join(project,'media/comparison.html')).href);await page.setViewportSize({width:1600,height:1140});await ready();await page.screenshot({path:path.join(project,'site/assets/demos/comparison-cover.png')});
await browser.close();
await fs.writeFile(path.join(output,'scene-checks.json'),JSON.stringify(sceneChecks,null,2)+'\n');
}
// Optional --stills allows review and repair before encoding.
if(process.argv.includes('--stills'))process.exit(0);
const ffmpeg=process.env.FFMPEG_PATH||'ffmpeg';
async function run(args){return new Promise((resolve,reject)=>{const p=spawn(ffmpeg,args,{stdio:'inherit'});p.on('error',reject);p.on('exit',code=>code===0?resolve():reject(new Error(`ffmpeg exit ${code}`)));});}
async function encode(name,items,width,height){
 const clips=[];
 for(let i=0;i<items.length;i++){
  const {image,seconds}=items[i],clip=path.join(output,`${name}-clip-${i}.mp4`);clips.push(clip);
  // A very slight centered push gives still artwork breathing room without obscuring type.
  // Raw RGB input also works with a minimal FFmpeg build that has no PNG decoder.
  const rgb=image+'.rgb';await fs.writeFile(rgb,await sharp(image).removeAlpha().raw().toBuffer());
  const input=['-hide_banner','-loglevel','error','-y','-stream_loop','-1','-f','rawvideo','-pixel_format','rgb24','-video_size',`${width}x${height}`,'-framerate','30','-i',rgb,'-vf',`scale=${width*2}:${height*2},zoompan=z='1.0+0.012*on/${seconds*30}':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s=${width}x${height}:fps=30,format=yuv420p`,'-t',String(seconds),'-an'];
  if(process.env.X264_PATH){
   const raw=clip+'.264';
   await new Promise((resolve,reject)=>{
    const f=spawn(ffmpeg,[...input,'-f','yuv4mpegpipe','-'],{stdio:['ignore','pipe','inherit']});
    // No B-frames: minimal raw-H.264 remuxers can then assign exact CFR timestamps.
    const x=spawn(process.env.X264_PATH,['--demuxer','y4m','--fps','30','--preset','fast','--crf','19','--bframes','0','--threads','4','--output',raw,'-'],{stdio:['pipe','ignore','inherit']});
    f.stdout.pipe(x.stdin);let done=0;for(const p of [f,x]){p.on('error',reject);p.on('exit',c=>{if(c!==0)reject(new Error(`encoder exit ${c}`));else if(++done===2)resolve();});}
   });
   await run(['-hide_banner','-loglevel','error','-y','-r','30','-i',raw,'-c:v','copy','-movflags','+faststart',clip]);
  }else await run([...input,'-c:v','libx264','-preset','fast','-crf','19','-threads','4',clip]);
 }
 const concat=path.join(output,name+'-concat.txt');await fs.writeFile(concat,clips.map(p=>`file '${p.replaceAll("'","'\\''")}'`).join('\n')+'\n');
 await run(['-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',concat,'-c','copy','-movflags','+faststart',path.join(publicDir,name+'.mp4')]);
}
await encode('ingenium-demo',timeline.scenes.map((s,i)=>({image:path.join(output,`master-${String(i).padStart(2,'0')}.png`),seconds:s.end-s.start})),1920,1080);
await encode('teaser',timeline.teaser.map((id,i)=>({image:path.join(output,`teaser-${i}.png`),seconds:5})),1920,1080);
await encode('portrait',timeline.portrait.map((id,i)=>({image:path.join(output,`portrait-${i}.png`),seconds:5})),1080,1920);
await run(['-hide_banner','-loglevel','error','-y','-i',path.join(publicDir,'ingenium-demo.mp4'),'-frames:v','1','-q:v','2',path.join(publicDir,'poster.jpg')]);
