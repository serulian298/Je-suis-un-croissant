// Real social system backed by Supabase.
(function(){
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const avatar=p=>p?.avatar_url?`<img class="friend-avatar-img" src="${esc(p.avatar_url)}" alt="">`:`<div class="avatar sm">🌸</div>`;
  function needLogin(host){host.innerHTML='<div class="notice"><b>Đăng nhập để dùng Friends.</b><p class="muted">Bạn bè và profile được lưu theo tài khoản.</p><a class="btn" href="auth.html">Đăng nhập</a></div>'}
  async function ready(){await LingoBackend.init();return LingoBackend.state.user}

  async function socialPage(){
    const user=await ready();
    if(!user){needLogin(document.getElementById('socialMain'));return}
    await Promise.all([renderMyProfile(),renderFriendships()]);
    bindSearch();
    renderGroupsLocal();
  }
  async function renderMyProfile(){
    const p=await LingoBackend.getMyProfile();
    const box=document.getElementById('profileBox'); if(!box)return;
    box.innerHTML=`<div class="profile-head">${avatar(p)}<div><h2>${esc(p.display_name||'Learner')}</h2><div class="muted">@${esc(p.username||'')}</div><p>${esc(p.bio||'')}</p></div></div>
    <a class="btn ghost" href="profile.html">Sửa profile & privacy</a>`;
  }
  async function renderFriendships(){
    const rows=await LingoBackend.listFriendships();
    const incoming=rows.filter(r=>r.status==='pending'&&r.direction==='incoming');
    const outgoing=rows.filter(r=>r.status==='pending'&&r.direction==='outgoing');
    const friends=rows.filter(r=>r.status==='accepted');
    const req=document.getElementById('requestsBox'),box=document.getElementById('friendsBox');
    req.innerHTML=`${incoming.length?`<h3>Lời mời đến · ${incoming.length}</h3>${incoming.map(r=>friendRow(r.other,`<button onclick="acceptFriend('${r.user_id}')">Chấp nhận</button><button class="ghost" onclick="removeFriend('${r.user_id}')">Từ chối</button>`)).join('')}`:''}${outgoing.length?`<h3 style="margin-top:14px">Đã gửi · ${outgoing.length}</h3>${outgoing.map(r=>friendRow(r.other,`<button class="ghost" onclick="removeFriend('${r.friend_id}')">Huỷ lời mời</button>`)).join('')}`:''}${!incoming.length&&!outgoing.length?'<div class="notice muted">Không có lời mời đang chờ.</div>':''}`;
    box.innerHTML=friends.length?friends.map(r=>friendRow(r.other,`<a class="btn ghost" href="friend-profile.html?id=${encodeURIComponent(r.other.user_id)}">Xem profile</a><button class="ghost danger" onclick="removeFriend('${r.other.user_id}')">Huỷ bạn</button>`)).join(''):'<div class="notice">Chưa có bạn. Tìm người học phía trên để kết bạn 🌷</div>';
    renderSuggestionsFromFriends(friends.map(r=>r.other));
  }
  function friendRow(p,actions){return `<div class="friend-row">${avatar(p)}<div class="grow min0"><a class="friend-name" href="friend-profile.html?id=${encodeURIComponent(p.user_id)}"><b>${esc(p.display_name||'Learner')}</b></a><div class="muted">@${esc(p.username||'')}</div>${p.bio?`<div class="muted ellipsis">${esc(p.bio)}</div>`:''}</div><div class="friend-actions">${actions}</div></div>`}
  function bindSearch(){
    const input=document.getElementById('friendSearch'),btn=document.getElementById('friendSearchBtn'),out=document.getElementById('searchResults');
    const run=async()=>{let q=input.value.trim();if(q.length<2){out.innerHTML='<div class="notice muted">Gõ ít nhất 2 ký tự.</div>';return}out.innerHTML='<div class="notice">Đang tìm…</div>';try{const rows=await LingoBackend.searchUsers(q);const rel=await LingoBackend.listFriendships();const map=new Map();rel.forEach(r=>{if(r.other)map.set(r.other.user_id,r)});out.innerHTML=rows.length?rows.map(p=>{let r=map.get(p.user_id),a;if(!r)a=`<button onclick="addFriend('${p.user_id}')">＋ Add friend</button>`;else if(r.status==='accepted')a=`<a class="btn ghost" href="friend-profile.html?id=${p.user_id}">Bạn bè ✓</a>`;else if(r.direction==='outgoing')a=`<button class="ghost" onclick="removeFriend('${p.user_id}')">Huỷ lời mời</button>`;else a=`<button onclick="acceptFriend('${p.user_id}')">Chấp nhận</button>`;return friendRow(p,a)}).join(''):'<div class="notice">Không tìm thấy người dùng.</div>'}catch(e){out.innerHTML=`<div class="notice">${esc(e.message)}</div>`}};
    btn.onclick=run; input.addEventListener('keydown',e=>{if(e.key==='Enter')run()});
  }
  window.addFriend=async id=>{try{await LingoBackend.sendFriendRequest(id);await renderFriendships();document.getElementById('friendSearchBtn')?.click()}catch(e){alert(e.message)} };
  window.acceptFriend=async id=>{try{await LingoBackend.acceptFriendRequest(id);await renderFriendships()}catch(e){alert(e.message)} };
  window.removeFriend=async id=>{if(!confirm('Xoá/huỷ kết nối với người này?'))return;try{await LingoBackend.removeFriendship(id);await renderFriendships();document.getElementById('friendSearchBtn')?.click()}catch(e){alert(e.message)} };

  function renderSuggestionsFromFriends(friends){const box=document.getElementById('suggestBox');if(!box)return;box.innerHTML=friends.length?`<div class="notice"><b>✨ Có ${friends.length} người bạn để học cùng</b><p class="muted">Mở profile của từng người để xem course chung (nếu họ cho phép hiển thị Library) và tạo Study Group.</p></div>`:'<div class="notice">Khi có bạn bè, gợi ý học cùng sẽ hiện ở đây.</div>'}

  // Keep existing local Study Group prototype until group tables UI is migrated.
  const SOCIAL_KEY='petit-french-social-v1';
  let LOCAL=JSON.parse(localStorage.getItem(SOCIAL_KEY)||'null')||{groups:[]};
  function renderGroupsLocal(){let box=document.getElementById('groupsBox');if(!box)return;let g=LOCAL.groups||[];box.innerHTML=g.length?g.map(x=>`<div class="book"><h2>👥 ${esc(x.name)}</h2><p>${x.bookId?(BOOKS[x.bookId]?.title||x.bookId):'General'}</p><a class="btn ghost" href="group.html?id=${encodeURIComponent(x.id)}">Mở nhóm</a></div>`).join(''):'<div class="notice muted">Chưa có Study Group.</div>'}

  async function friendProfilePage(){
    const user=await ready(),host=document.getElementById('friendProfile');
    if(!user){needLogin(host);return}
    const id=new URLSearchParams(location.search).get('id'); if(!id){host.innerHTML='<div class="notice">Thiếu user id.</div>';return}
    try{const p=await LingoBackend.getSocialProfile(id);if(!p){host.innerHTML='<div class="notice">Không tìm thấy profile.</div>';return}document.getElementById('friendProfileTitle').textContent=p.display_name||'Profile';
      let action='';if(p.relationship==='friends')action=`<button class="ghost danger" onclick="removeFriendAndBack('${p.user_id}')">Huỷ bạn</button>`;else if(p.relationship==='outgoing')action=`<button class="ghost" onclick="removeFriendAndBack('${p.user_id}')">Huỷ lời mời</button>`;else if(p.relationship==='incoming')action=`<button onclick="acceptFriendProfile('${p.user_id}')">Chấp nhận kết bạn</button>`;else if(p.relationship!=='self')action=`<button onclick="addFriendProfile('${p.user_id}')">＋ Add friend</button>`;
      const lib=Array.isArray(p.library)?p.library:[];
      host.innerHTML=`<section class="card"><div class="profile-head">${p.avatar_url?`<img class="friend-avatar-big" src="${esc(p.avatar_url)}" alt="">`:'<div class="avatar">🌸</div>'}<div><h2>${esc(p.display_name||'Learner')}</h2><div class="muted">@${esc(p.username||'')}</div><p>${esc(p.bio||'')}</p><span class="pill">${relationshipLabel(p.relationship)}</span></div></div><div class="button-row">${action}<a class="btn ghost" href="social.html">← Friends</a></div></section>
      <div class="grid"><section class="card s6"><h3>🎯 Đang học</h3><p>${esc(p.learning?.language||'Không công khai')}</p><p class="muted">${esc(p.learning?.target||'')}</p>${p.streak!==null?`<span class="pill">🔥 ${p.streak} day streak</span>`:'<p class="muted">Streak được ẩn.</p>'}</section><section class="card s6"><h3>📚 Library</h3>${p.library===null?'<p class="muted">Người dùng không chia sẻ Library với bạn.</p>':lib.length?lib.map(id=>`<div class="notice"><b>${esc(BOOKS[id]?.title||id)}</b>${canAccessBook?.(id)?`<a class="btn ghost" href="book.html?id=${encodeURIComponent(id)}">Mở course</a>`:'<p class="muted">Bạn chưa có quyền nội dung course này.</p>'}</div>`).join(''):'<p class="muted">Chưa có course hiển thị.</p>'}</section><section class="card s6"><h3>🏅 Thành tích</h3>${p.achievements?`<b>${p.achievements.completed_lessons||0}</b> bài đã hoàn thành`:'<p class="muted">Thành tích được ẩn.</p>'}</section><section class="card s6"><h3>📈 Điểm</h3>${p.scores?`<b>${p.scores.average??'—'}${p.scores.average!=null?'%':''}</b><p class="muted">Điểm trung bình các bài có dữ liệu.</p>`:'<p class="muted">Điểm được ẩn.</p>'}</section></div>`;
    }catch(e){host.innerHTML=`<div class="notice">${esc(e.message)}</div>`}
  }
  function relationshipLabel(x){return({friends:'Bạn bè',incoming:'Đã gửi lời mời cho bạn',outgoing:'Đang chờ chấp nhận',self:'Profile của bạn',none:'Chưa kết bạn'})[x]||x}
  window.removeFriendAndBack=async id=>{if(!confirm('Huỷ kết bạn?'))return;await LingoBackend.removeFriendship(id);location='social.html'};
  window.acceptFriendProfile=async id=>{await LingoBackend.acceptFriendRequest(id);location.reload()};
  window.addFriendProfile=async id=>{await LingoBackend.sendFriendRequest(id);location.reload()};

  window.addEventListener('DOMContentLoaded',()=>{if(document.body.dataset.page==='social')socialPage().catch(console.error);if(document.body.dataset.page==='friend-profile')friendProfilePage().catch(console.error)});
})();
