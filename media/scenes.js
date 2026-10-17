/* Authored scene nodes, editable without a runtime dependency or account. */
const A='../site/assets/demos/';
const img=(name,cls='art',alt='Original synthetic study')=>`<img class="${cls}" src="${A+name}" alt="${alt}">`;
const visuals={
 collage:()=>`<div class="visual collage">${img('cover.png','art cover-art')}${img('identity.png','art identity-art')}<div class="label">IDEA → EDITABLE STUDY</div></div>`,
 prompt:()=>`<div class="visual"><div class="prompt-card"><small>ILLUSTRATIVE REQUEST</small>“Help me make a quiet event poster. I want the details to be easy to find.”<div class="under">A question is enough to begin.</div></div></div>`,
 garden:()=>`<div class="visual">${img('first-success.png','art garden-art','Listening Garden actual exported study')}</div>`,
 cover:()=>`<div class="visual">${img('cover.png','art cover-art')}</div>`,
 web:()=>`<div class="visual">${img('fieldwork-desktop.png','art web-desktop')}${img('fieldwork-mobile.png','art web-mobile')}</div>`,
 identity:()=>`<div class="visual">${img('identity.png','art identity-main')}${img('poster.png','art identity-poster')}</div>`,
 wayfinding:()=>`<div class="visual">${img('wayfinding.png')}</div>`,
 cli:()=>`<div class="visual">${img('actual-cli.png','art','Screenshot of an actual local helper command and its observed output')}</div>`,
 guides:()=>`<div class="visual paired">${img('first-success.png')}${img('first-success-guides.png')}</div>`,
 comparison:()=>`<div class="visual">${img('comparison-cover.png','art','Earlier V1 study and later V3 study, historical comparison')}</div>`,
 reaction:()=>`<div class="visual"><div class="reaction">“Keep the quiet feeling.<br>Make the date easier<br>to find.”<small>Illustrative feedback, scoped to this study.<br>Facts, interpretations and choices stay distinct.</small></div></div>`,
 close:()=>`<div class="visual"><div class="close-visual" aria-hidden="true">i.</div></div>`
};
window.drawScene=(scene,mode='master',index=0)=>{
 const f=document.getElementById('frame');f.className=(mode==='portrait'?'portrait ':'')+(['hook','close'].includes(scene.id)?'dark ':'')+(['web','identity','comparison','cli','output'].includes(scene.id)?'wide-title':'');
 const notes={hook:'Original work. Editable sources. A direction you can discuss.',study:'Clean artwork and a companion guide view.',cover:'Common Ground / V3 study',web:'Fieldwork / V2 responsive study',identity:'Manyfold / V3 identity and application',wayfinding:'Junction House / V3 study',cli:'Shown from an executed helper run. Optional tools stay optional.',output:'SVG source + PNG export + guide layer',comparison:'Different studies, different choices. No controlled performance claim.',close:'Explore the examples · Try the portable plugin'};
 f.innerHTML=`<div class="progress" style="width:${Math.round((index+1)/12*100)}%"></div><div class="topline"><span>${scene.eyebrow}</span><span class="brand">Ingenium</span></div><div class="content"><div class="copy"><h1>${scene.title}</h1>${scene.id==='close'?'<span class="pill">Bring a question.</span>':''}${notes[scene.id]?`<p class="note">${notes[scene.id]}</p>`:''}${scene.id==='close'?'<p class="close-copy">Local helper demonstrated<br>Desktop discovery unverified</p>':''}</div>${visuals[scene.visual]()}</div><div class="caption">${scene.caption}</div>`;
};
// The render script injects the local JSON. Opening via a local HTTP server also works.
if(location.protocol!=='file:')fetch('timeline.json').then(r=>r.json()).then(t=>{window.timeline=t;window.drawScene(t.scenes[0]);window.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){window.sceneIndex=Math.max(0,Math.min(t.scenes.length-1,(window.sceneIndex||0)+(e.key==='ArrowRight'?1:-1)));drawScene(t.scenes[window.sceneIndex],'master',window.sceneIndex)}})});
