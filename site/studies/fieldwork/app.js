const projects=[...document.querySelectorAll('.project')];
const dialog=document.querySelector('#project-dialog');
const art=document.querySelector('#dialog-art');
let opener=null,pattern=0;
projects.forEach((project,index)=>project.querySelector('button').addEventListener('click',event=>{
 opener=event.currentTarget;pattern=0;
 document.querySelector('#dialog-title').textContent=project.querySelector('h3').textContent;
 document.querySelector('#dialog-description').textContent=project.querySelector('p').textContent;
 document.querySelector('#dialog-index').textContent=`FIELDWORK / 0${index+1}`;
 art.replaceChildren(project.querySelector('.art').cloneNode(true));
 art.dataset.pattern='0';document.querySelector('.pattern-status').textContent='Pattern 1 of 3';
 dialog.showModal();
}));
document.querySelector('#close-dialog').addEventListener('click',()=>dialog.close());
dialog.addEventListener('close',()=>opener?.focus());
document.querySelector('#rearrange').addEventListener('click',()=>{pattern=(pattern+1)%3;art.dataset.pattern=String(pattern);document.querySelector('.pattern-status').textContent=`Pattern ${pattern+1} of 3`;});
