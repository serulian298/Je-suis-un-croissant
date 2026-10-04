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
        const bookSel=document.getElementById('bookTarget');
        const bookId=bookSel?.value||'';
        const host=document.getElementById('scanResult');
        if(!fs.length)return alert('Chọn PDF / Word / scan / audio trước.');
        const validBook=bookId&&typeof BOOKS!=='undefined'&&BOOKS[bookId];
        if(!validBook){
          if(host)host.innerHTML='<div class="notice"><b>Chưa có course để import.</b><p class="muted">Library chưa sync xong hoặc tài khoản chưa có quyền course. Mở Library/Book codes trước, rồi quay lại Smart Import.</p><a class="btn ghost" href="access.html">🔑 Book codes</a></div>';
          return;
        }
        if(typeof window.runAIScan!=='function'){
          if(host)host.innerHTML='<div class="notice"><b>Smart Import chưa tải xong.</b><p class="muted">Refresh trang rồi thử lại.</p></div>';
          return;
        }
        btn.disabled=true;btn.textContent='Đang scan…';
        try{
          const draft=await window.runAIScan(bookId,fs);
          if(!draft||!Array.isArray(draft.blocks)||!Array.isArray(draft.audioMap))throw new Error('Scanner trả về dữ liệu không hợp lệ.');
          window.renderScanDraft(draft);
        }catch(e){
          console.error(e);
          const msg=(e&&e.message)||String(e)||'Lỗi không xác định';
          if(host)host.innerHTML=`<div class="notice"><b>Scan chưa hoàn tất.</b><p class="muted">${String(msg).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</p><p class="muted">File khác trong bộ sẽ không bị xoá. Có thể thử lại sau khi Library sync xong.</p></div>`;
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