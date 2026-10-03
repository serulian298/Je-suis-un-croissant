// Wire the Smart Import AI draft into the existing pages after the base renderers run.
(function(){
  window.addEventListener('DOMContentLoaded',()=>{
    const page=document.body.dataset.page;
    if(page==='importer'){
      const btn=document.getElementById('scanBtn');
      if(!btn)return;
      btn.textContent='✨ AI Scan & Organize';
      btn.onclick=async()=>{
        const fs=[...document.getElementById('files').files];
        const bookId=document.getElementById('bookTarget').value;
        if(!fs.length)return alert('Chọn PDF / Word / scan / audio trước.');
        btn.disabled=true;btn.textContent='Đang scan…';
        try{
          const draft=await window.runAIScan(bookId,fs);
          window.renderScanDraft(draft);
        }catch(e){
          console.error(e);alert('Không scan được bộ tài liệu này.');
        }finally{btn.disabled=false;btn.textContent='✨ AI Scan & Organize'}
      };
    }
    if(page==='lesson'&&typeof window.renderAILessonContent==='function'){
      const q=new URLSearchParams(location.search),b=q.get('b')||'reussite',u=+(q.get('u')||0),l=+(q.get('l')||0);
      const html=window.renderAILessonContent(b,u,l);
      if(html){
        const sections=document.querySelectorAll('#lessonBox .lesson-source-block');
        if(sections[1])sections[1].outerHTML=html;
        else document.getElementById('lessonBox')?.insertAdjacentHTML('beforeend',html);
      }
    }
  });
})();