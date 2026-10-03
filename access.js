const ACCESS_KEY='petit-french-access-v1';
let ACCESS=JSON.parse(localStorage.getItem(ACCESS_KEY)||'null')||{
  owned:['reussite','c3'],
  granted:[],
  codes:{reussite:{code:'B2-7K4P',active:true,maxUses:null,uses:0,expires:null},c3:{code:'3C-ROSE',active:true,maxUses:null,uses:0,expires:null}}
};
const saveAccess=()=>localStorage.setItem(ACCESS_KEY,JSON.stringify(ACCESS));
function normalizeCode(v){return (v||'').trim().toUpperCase()}
function canAccessBook(id){return ACCESS.owned.includes(id)||ACCESS.granted.includes(id)}
function redeemBookCode(code){
  code=normalizeCode(code);
  for(const [bookId,entry] of Object.entries(ACCESS.codes)){
    if(!entry.active||normalizeCode(entry.code)!==code) continue;
    if(entry.expires&&Date.now()>new Date(entry.expires).getTime()) return {ok:false,message:'Mã đã hết hạn.'};
    if(entry.maxUses!=null&&entry.uses>=entry.maxUses) return {ok:false,message:'Mã đã hết lượt sử dụng.'};
    if(!ACCESS.granted.includes(bookId)&&!ACCESS.owned.includes(bookId)) ACCESS.granted.push(bookId);
    entry.uses=(entry.uses||0)+1;saveAccess();
    return {ok:true,bookId,message:'Đã mở khóa '+(BOOKS[bookId]?.title||bookId)+' 🌸'};
  }
  return {ok:false,message:'Mã không hợp lệ hoặc đã bị thu hồi.'};
}
function randomCode(prefix='BOOK'){let chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',s='';for(let i=0;i<5;i++)s+=chars[Math.floor(Math.random()*chars.length)];return `${prefix}-${s}`}
function regenerateBookCode(bookId){let p=bookId==='reussite'?'B2':'3C';ACCESS.codes[bookId]={code:randomCode(p),active:true,maxUses:null,uses:0,expires:null};saveAccess();return ACCESS.codes[bookId].code}
function revokeBookCode(bookId){if(ACCESS.codes[bookId])ACCESS.codes[bookId].active=false;saveAccess()}
function bookAccessPanel(bookId){
  if(!ACCESS.owned.includes(bookId)) return `<div class="notice"><b>🔓 Shared book</b><p class="muted">Quyển này đã được mở bằng mã sách. Bạn có thể học và lưu tiến độ riêng.</p></div>`;
  let e=ACCESS.codes[bookId];if(!e){e=ACCESS.codes[bookId]={code:randomCode('BOOK'),active:true,maxUses:null,uses:0,expires:null};saveAccess()}
  return `<div class="notice"><h3>🔑 Share access</h3><p class="share-code">${e.active?e.code:'Đã thu hồi'}</p><p class="muted">Gửi mã này cho bạn bè. Họ đăng nhập Google, nhập mã một lần và quyển sách sẽ xuất hiện trong Library của họ.</p><div class="form"><button onclick="copyBookCode('${bookId}')">📋 Copy code</button><button class="alt" onclick="shareBookCode('${bookId}')">📤 Share</button><button class="ghost" onclick="regenerateBookCode('${bookId}');location.reload()">♻️ Mã mới</button><button class="ghost" onclick="revokeBookCode('${bookId}');location.reload()">🚫 Thu hồi mã</button></div><p class="muted">Đã dùng: ${e.uses||0}${e.maxUses!=null?' / '+e.maxUses:''}</p></div>`
}
async function copyBookCode(bookId){let code=ACCESS.codes[bookId]?.code||'';try{await navigator.clipboard.writeText(code);alert('Đã copy '+code)}catch{prompt('Copy mã này:',code)}}
async function shareBookCode(bookId){let code=ACCESS.codes[bookId]?.code||'',title=BOOKS[bookId]?.title||'Petit French';let text=`Mình gửi bạn quyền học ${title} trên Petit French 🌸\nMã sách: ${code}`;if(navigator.share){try{await navigator.share({title:'Petit French · '+title,text})}catch{}}else{try{await navigator.clipboard.writeText(text);alert('Đã copy nội dung chia sẻ')}catch{prompt('Copy:',text)}}}
function accessPage(){
  let owned=[...new Set([...ACCESS.owned,...ACCESS.granted])];
  accessBooks.innerHTML=owned.map(id=>`<div class="book"><h2>${BOOKS[id]?.emoji||'📕'} ${BOOKS[id]?.title||id}</h2><p>${ACCESS.owned.includes(id)?'Sách của bạn':'Đã mở bằng mã sách'}</p><a class="btn ghost" href="book.html?id=${id}">Mở sách</a></div>`).join('');
  redeemBtn.onclick=()=>{let r=redeemBookCode(bookCode.value);accessMessage.innerHTML=`<div class="notice">${r.message}</div>`;if(r.ok)setTimeout(()=>location='book.html?id='+r.bookId,350)};
}
function guardBookPage(bookId){if(canAccessBook(bookId))return true;location='access.html?need='+encodeURIComponent(bookId);return false}
function accessNeedHint(){let need=new URLSearchParams(location.search).get('need');if(need&&BOOKS[need])accessMessage.innerHTML=`<div class="notice"><b>Bạn chưa có quyền với ${BOOKS[need].title}.</b><p>Nhập mã sách mà bạn bè đã gửi để mở khóa.</p></div>`}

// Override Library so each account only sees books it owns or has redeemed.
window.library=function(){let el=document.getElementById('books');let visible=Object.entries(BOOKS).filter(([id])=>canAccessBook(id));el.innerHTML=visible.map(([id,b])=>{let total=b.units.reduce((n,u)=>n+u[1].length,0),done=b.units.reduce((n,u,ui)=>n+u[1].filter((_,li)=>S.done[key(id,ui,li)]).length,0),p=Math.round(done/total*100);return `<div class="book" onclick="location='book.html?id=${id}'"><h2>${b.emoji} ${b.title}</h2><p>${b.subtitle}</p><span class="pill">${b.units.length} units</span><span class="pill">${p}% complete</span><div class="progress"><div class="bar" style="width:${p}%"></div></div></div>`}).join('')+S.imports.map(x=>`<div class="book"><h2>🪄 ${x.name}</h2><p>Imported draft · ${x.files.length} files</p></div>`).join('');if(!visible.length)el.innerHTML='<div class="notice">Chưa có sách. Nhập mã sách để bắt đầu 🌸</div>'}

// Override Book so a direct link never bypasses access and owners can share the book code.
window.book=function(){let q=new URLSearchParams(location.search),id=q.get('id')||'reussite';if(!guardBookPage(id))return;let b=BOOKS[id],el=document.getElementById('bookTree'),total=0,done=0;document.getElementById('bookTitle').textContent=b.title;el.innerHTML=b.units.map((u,ui)=>`<section><h2>${u[0]}</h2>${u[1].map((l,li)=>{let k=key(id,ui,li),sc=S.scores[k],st=S.done[k]?'✓':sc!=null&&sc<70?'◐':'○';total++;if(S.done[k])done++;return `<div class="lesson"><div class="grow"><b>${st} ${l}</b><div class="muted">${u[2].map(s=>names[s]||s).join(' · ')}</div></div>${sc!=null?`<span class="status">${sc}%</span>`:''}<a class="btn ghost" href="lesson.html?b=${id}&u=${ui}&l=${li}">Ouvrir</a></div>`}).join('')}</section>`).join('');let p=Math.round(done/total*100);bookPct.textContent=p+'%';bookBar.style.width=p+'%';let panel=document.getElementById('bookAccessPanel');if(panel)panel.innerHTML=bookAccessPanel(id)}

window.addEventListener('DOMContentLoaded',()=>{if(document.body.dataset.page==='access'){accessPage();accessNeedHint()}});