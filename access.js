const ACCESS_KEY='petit-french-access-v2';
let ACCESS=JSON.parse(localStorage.getItem(ACCESS_KEY)||'null')||{owned:[],granted:[],codes:{}};
// One-time migration from the old prototype on the original browser only.
try{const legacy=JSON.parse(localStorage.getItem('petit-french-access-v1')||'null');if(legacy&&!localStorage.getItem(ACCESS_KEY)){ACCESS={owned:legacy.owned||[],granted:legacy.granted||[],codes:legacy.codes||{}};localStorage.setItem(ACCESS_KEY,JSON.stringify(ACCESS))}}catch{}
const saveAccess=()=>localStorage.setItem(ACCESS_KEY,JSON.stringify(ACCESS));
function normalizeCode(v){return(v||'').trim().toUpperCase()}
function canAccessBook(id){return ACCESS.owned.includes(id)||ACCESS.granted.includes(id)}
function randomCode(prefix='BOOK'){let chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',s='';for(let i=0;i<6;i++)s+=chars[Math.floor(Math.random()*chars.length)];return`${prefix}-${s}`}

function refreshImporterAccessTargets(){
  if(document.body.dataset.page!=='importer')return;
  const bookSel=document.getElementById('bookTarget'),unitSel=document.getElementById('unitTarget'),lessonSel=document.getElementById('lessonTarget');
  if(!bookSel||!unitSel||!lessonSel)return;
  const previous=bookSel.value;
  const visible=Object.entries(BOOKS).filter(([id])=>canAccessBook(id));
  bookSel.innerHTML=visible.map(([id,b])=>`<option value="${id}" ${id===previous?'selected':''}>${b.emoji} ${b.title}</option>`).join('');
  if(!bookSel.value&&visible[0])bookSel.value=visible[0][0];
  if(!bookSel.value){
    unitSel.innerHTML='<option value="">Chưa có course</option>';lessonSel.innerHTML='<option value="">Chưa có course</option>';unitSel.disabled=true;lessonSel.disabled=true;
    const host=document.getElementById('scanResult');if(host)host.innerHTML='<div class="notice"><b>Library đang trống.</b><p class="muted">Mở hoặc nhập quyền một course trước khi Smart Import để có nơi map lesson/audio.</p><a class="btn ghost" href="access.html">🔑 Mở Book codes</a></div>';
    return;
  }
  unitSel.disabled=false;
  const b=BOOKS[bookSel.value];
  unitSel.innerHTML='<option value="">Toàn bộ giáo trình</option>'+b.units.map((u,i)=>`<option value="${i}">Unit ${i+1} · ${u[0]}</option>`).join('');
  lessonSel.innerHTML='<option value="">Chưa gán vào bài cụ thể</option>';lessonSel.disabled=true;
  if(typeof bookSel.onchange==='function')bookSel.onchange();
  window.dispatchEvent(new CustomEvent('lingo:access-synced',{detail:{owned:[...ACCESS.owned],granted:[...ACCESS.granted]}}));
}

async function syncAccessFromBackend(){
  if(!window.LingoBackend?.state?.user)return;
  try{
    // Preserve the original owner's local library by claiming those courses once on the real backend.
    for(const id of ACCESS.owned){if(BOOKS[id]){try{await LingoBackend.ensureCourse(id,BOOKS[id].title,S?.goal?.language||'fr')}catch(e){console.warn('ensure course',id,e)}}}
    const r=await LingoBackend.listMyCourses();
    ACCESS.owned=[...new Set([...(r.owned||[]),...ACCESS.owned.filter(id=>(r.owned||[]).includes(id))])];
    ACCESS.granted=[...new Set(r.granted||[])].filter(id=>!ACCESS.owned.includes(id));
    saveAccess();
    if(document.body.dataset.page==='access')renderAccessBooks();
    refreshImporterAccessTargets();
  }catch(e){console.warn('access sync',e)}
}

async function redeemBookCode(code){
  code=normalizeCode(code);if(!code)return{ok:false,message:'Nhập mã sách trước.'};
  if(!window.LingoBackend?.state?.user)return{ok:false,message:'Đăng nhập tài khoản trước rồi nhập mã sách.'};
  try{const bookId=await LingoBackend.redeemCourseCode(code);if(!ACCESS.granted.includes(bookId)&&!ACCESS.owned.includes(bookId))ACCESS.granted.push(bookId);saveAccess();return{ok:true,bookId,message:'Đã mở khóa '+(BOOKS[bookId]?.title||bookId)+' 🌸'}}catch(e){return{ok:false,message:e.message||'Mã không hợp lệ, hết hạn hoặc đã bị thu hồi.'}}
}

async function regenerateBookCode(bookId){
  if(!window.LingoBackend?.state?.user){alert('Đăng nhập trước để tạo mã dùng được trên thiết bị khác.');location='auth.html';return}
  try{
    await LingoBackend.ensureCourse(bookId,BOOKS[bookId]?.title||bookId,S?.goal?.language||'fr');
    const old=ACCESS.codes[bookId];if(old?.code&&old.active){try{await LingoBackend.revokeCourseCode(old.code)}catch{}}
    const prefix=bookId==='reussite'?'B2':bookId==='c3'?'3C':'BOOK',code=randomCode(prefix);
    await LingoBackend.createCourseCode({bookId,code});
    ACCESS.codes[bookId]={code,active:true,maxUses:null,uses:0,expires:null};if(!ACCESS.owned.includes(bookId))ACCESS.owned.push(bookId);ACCESS.granted=ACCESS.granted.filter(x=>x!==bookId);saveAccess();location.reload();
  }catch(e){alert('Không tạo được mã: '+(e.message||e))}
}
async function revokeBookCode(bookId){let e=ACCESS.codes[bookId];if(!e)return;if(window.LingoBackend?.state?.user){try{await LingoBackend.revokeCourseCode(e.code)}catch(err){alert(err.message||err);return}}e.active=false;saveAccess();location.reload()}

function bookAccessPanel(bookId){
  if(!ACCESS.owned.includes(bookId))return`<div class="notice"><b>🔓 Shared course</b><p class="muted">Course này đã được cấp cho tài khoản của bạn. Progress vẫn hoàn toàn riêng.</p></div>`;
  let e=ACCESS.codes[bookId];
  return`<div class="notice"><h3>🔑 Share access</h3><p class="share-code">${e?.active?e.code:'Chưa có mã hoạt động'}</p><p class="muted">Mã được lưu trên server. Bạn bè đăng nhập tài khoản, nhập một lần và course xuất hiện trong Library riêng của họ.</p><div class="form"><button onclick="copyBookCode('${bookId}')" ${!e?.active?'disabled':''}>📋 Copy code</button><button class="alt" onclick="shareBookCode('${bookId}')" ${!e?.active?'disabled':''}>📤 Share</button><button class="ghost" onclick="regenerateBookCode('${bookId}')">♻️ ${e?.active?'Mã mới':'Tạo mã'}</button><button class="ghost" onclick="revokeBookCode('${bookId}')" ${!e?.active?'disabled':''}>🚫 Thu hồi mã</button></div></div>`
}
async function copyBookCode(bookId){let code=ACCESS.codes[bookId]?.code||'';if(!code)return;try{await navigator.clipboard.writeText(code);alert('Đã copy '+code)}catch{prompt('Copy mã này:',code)}}
async function shareBookCode(bookId){let code=ACCESS.codes[bookId]?.code||'';if(!code)return;let title=BOOKS[bookId]?.title||'Lingo Bloom';let text=`Mình gửi bạn quyền học ${title} trên Lingo Bloom 🌸\nMã course: ${code}`;if(navigator.share){try{await navigator.share({title:'Lingo Bloom · '+title,text})}catch{}}else{try{await navigator.clipboard.writeText(text);alert('Đã copy nội dung chia sẻ')}catch{prompt('Copy:',text)}}}

function renderAccessBooks(){let owned=[...new Set([...ACCESS.owned,...ACCESS.granted])];accessBooks.innerHTML=owned.map(id=>`<div class="book"><h2>${BOOKS[id]?.emoji||'📕'} ${BOOKS[id]?.title||id}</h2><p>${ACCESS.owned.includes(id)?'Course của bạn':'Đã mở bằng mã course'}</p><a class="btn ghost" href="book.html?id=${id}">Mở course</a></div>`).join('')||'<div class="notice">Library đang trống. Nhập mã course được bạn bè gửi để bắt đầu.</div>'}
function accessPage(){renderAccessBooks();redeemBtn.onclick=async()=>{accessMessage.innerHTML='<div class="notice">Đang kiểm tra mã…</div>';let r=await redeemBookCode(bookCode.value);accessMessage.innerHTML=`<div class="notice">${r.message}</div>`;if(r.ok)setTimeout(()=>location='book.html?id='+r.bookId,350)}}
function guardBookPage(bookId){if(canAccessBook(bookId))return true;location='access.html?need='+encodeURIComponent(bookId);return false}
function accessNeedHint(){let need=new URLSearchParams(location.search).get('need');if(need&&BOOKS[need])accessMessage.innerHTML=`<div class="notice"><b>Bạn chưa có quyền với ${BOOKS[need].title}.</b><p>Đăng nhập và nhập mã course người khác gửi.</p></div>`}

window.library=function(){let el=document.getElementById('books');let visible=Object.entries(BOOKS).filter(([id])=>canAccessBook(id));el.innerHTML=visible.map(([id,b])=>{let total=b.units.reduce((n,u)=>n+u[1].length,0),done=b.units.reduce((n,u,ui)=>n+u[1].filter((_,li)=>S.done[key(id,ui,li)]).length,0),p=Math.round(done/Math.max(total,1)*100);return`<div class="book" onclick="location='book.html?id=${id}'"><h2>${b.emoji} ${b.title}</h2><p>${b.subtitle}</p><span class="pill">${b.units.length} units</span><span class="pill">${p}% complete</span><div class="progress"><div class="bar" style="width:${p}%"></div></div></div>`}).join('');if(!visible.length)el.innerHTML='<div class="notice">Chưa có course. Nhập mã để bắt đầu 🌸</div>'}

window.addEventListener('DOMContentLoaded',()=>{if(document.body.dataset.page==='access'){accessPage();accessNeedHint()}let tries=0,iv=setInterval(()=>{tries++;if(window.LingoBackend){clearInterval(iv);LingoBackend.onChange(st=>{if(st.user)syncAccessFromBackend()})}else if(tries>40)clearInterval(iv)},150)});
