// Persist reviewed Smart Import blocks and load them on lesson pages.
(function(){
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const labels={theory:'📕 Lý thuyết',mcq:'🔘 ABCD',truefalse:'☑️ Đúng / Sai',fill:'✍️ Điền',open:'📝 Tự luận',listening:'🎧 Nghe',corrige:'✅ Corrigé',transcript:'💬 Transcript'};
  async function persistDraft(draft){
    if(!window.LingoBackend?.state?.user)return;
    const c=LingoBackend.client;if(!c)return;
    const rows=(draft.blocks||[]).filter(b=>b.target&&b.target!=='book').map((b,i)=>{const [u,l]=b.target.split(':').map(Number);return{owner_id:LingoBackend.state.user.id,course_id:draft.bookId,unit_index:u,lesson_index:l,block_order:i,block_type:b.kind,content:{title:b.title||'',text:b.content||'',source:b.source||'',status:b.status||''},confidence:b.confidence??null,needs_review:(b.confidence??0)<.6}});
    if(!rows.length)return;
    const {error}=await c.from('lesson_content').insert(rows);if(error)throw error;
  }
  function hookRender(){if(typeof window.renderScanDraft!=='function'||window.renderScanDraft.__cloudHook)return false;const old=window.renderScanDraft;const wrapped=function(draft){old(draft);const btn=document.getElementById('saveAIScan');if(!btn)return;const prev=btn.onclick;btn.onclick=async()=>{btn.disabled=true;const oldText=btn.textContent;btn.textContent='☁️ Lưu cấu trúc bài…';try{await persistDraft(draft)}catch(e){console.error(e);alert('Không lưu được cấu trúc lên cloud: '+(e.message||e));btn.disabled=false;btn.textContent=oldText;return}btn.disabled=false;return prev?.call(btn)}};wrapped.__cloudHook=true;window.renderScanDraft=wrapped;return true}
  function remoteBlocksHtml(rows){if(!rows.length)return'';return`<section class="lesson-source-block cloud-lesson-content"><div class="lesson-section-title"><span>☁️</span><h3>Nội dung đã đồng bộ</h3></div>${rows.map(r=>`<div class="structured-block"><div class="structured-head"><span class="pill">${labels[r.block_type]||esc(r.block_type)}</span><b>${esc(r.content?.title||'Block')}</b>${r.needs_review?'<span class="verify">À vérifier</span>':''}</div>${r.content?.text?`<div class="scan-text">${esc(r.content.text)}</div>`:'<p class="muted">Không có text extract.</p>'}</div>`).join('')}</section>`}
  async function loadLessonCloud(){if(document.body.dataset.page!=='lesson'||!window.LingoBackend?.state?.user)return;const q=new URLSearchParams(location.search),b=q.get('b')||'reussite',u=+(q.get('u')||0),l=+(q.get('l')||0);try{const rows=await LingoBackend.loadLessonContent(b,u,l);if(!rows.length)return;document.querySelector('.cloud-lesson-content')?.remove();const host=document.getElementById('lessonBox');if(host)host.insertAdjacentHTML('afterbegin',remoteBlocksHtml(rows))}catch(e){console.warn('lesson cloud',e)}}
  function start(){let tries=0,iv=setInterval(()=>{tries++;hookRender();if(window.LingoBackend){LingoBackend.onChange(st=>{if(st.user)loadLessonCloud()});if(typeof window.renderScanDraft==='function'){clearInterval(iv)}}if(tries>80)clearInterval(iv)},150)}
  start();
})();
