// Course materials: map each file to one lesson, and delete safely.
(function(){
  function allFiles(bookId){
    S.imports=S.imports||[];
    const out=[];
    S.imports.forEach((bundle,importIndex)=>{
      if(bundle.bookId!==bookId)return;
      (bundle.files||[]).forEach((file,fileIndex)=>out.push({bundle,file,importIndex,fileIndex}));
    });
    return out;
  }
  function effectiveTarget(x){return x.file.target||x.bundle.target||'book'}
  function icon(type){return ({Audio:'🎧',Theory:'📕',Exercises:'✏️',Reading:'📖',Corrigé:'✅',Transcript:'💬',Scan:'🖼️',Other:'📎'})[type]||'📎'}
  function targetOptions(bookId,current){
    let html=`<option value="book" ${current==='book'?'selected':''}>Chưa gán vào bài</option>`;
    BOOKS[bookId].units.forEach((u,ui)=>u[1].forEach((name,li)=>{
      const v=`${ui}:${li}`;
      html+=`<option value="${v}" ${current===v?'selected':''}>Bài ${n2(ordinalFor(bookId,ui,li))} · ${name}</option>`;
    }));
    return html;
  }
  function refresh(bookId){renderCourseMaterials(bookId)}

  window.mapMaterialFile=function(bookId,importIndex,fileIndex,value){
    const bundle=S.imports?.[importIndex],file=bundle?.files?.[fileIndex];
    if(!bundle||!file||bundle.bookId!==bookId)return;
    file.target=value; save(); refresh(bookId);
  };
  window.deleteMaterialFile=function(bookId,importIndex,fileIndex){
    const bundle=S.imports?.[importIndex],file=bundle?.files?.[fileIndex];
    if(!bundle||!file||bundle.bookId!==bookId)return;
    if(!confirm(`Xoá file “${file.name}” khỏi giáo trình?`))return;
    bundle.files.splice(fileIndex,1);
    if(!bundle.files.length)S.imports.splice(importIndex,1);
    save(); refresh(bookId);
  };
  window.deleteMaterialBundle=function(bookId,bundleId){
    const i=(S.imports||[]).findIndex(x=>x.id===bundleId&&x.bookId===bookId);
    if(i<0)return;
    const x=S.imports[i];
    if(!confirm(`Xoá toàn bộ “${x.name}” (${x.files?.length||0} file)?`))return;
    S.imports.splice(i,1); save(); refresh(bookId);
  };

  window.renderCourseMaterials=function(bookId){
    const el=document.getElementById('bookMaterials'); if(!el)return;
    const files=allFiles(bookId), unassigned=files.filter(x=>effectiveTarget(x)==='book'), assigned=files.filter(x=>effectiveTarget(x)!=='book');
    const bundles=(S.imports||[]).filter(x=>x.bookId===bookId);
    const row=x=>`<div class="material-map-row"><div class="material-file-icon">${icon(x.file.type)}</div><div class="grow min0"><b class="file-name">${x.file.name}</b><div class="muted">${x.file.type||'File'}</div></div><select onchange="mapMaterialFile('${bookId}',${x.importIndex},${x.fileIndex},this.value)">${targetOptions(bookId,effectiveTarget(x))}</select><button class="ghost danger compact" title="Xoá file" onclick="deleteMaterialFile('${bookId}',${x.importIndex},${x.fileIndex})">🗑️</button></div>`;
    el.innerHTML=`<div class="section-head"><div><h2>📎 Materials của giáo trình</h2><p class="muted">Audio, PDF, transcript, corrigé… chỉ hiện trong lesson khi đã gán đúng bài.</p></div><a class="btn" href="import.html?book=${encodeURIComponent(bookId)}">＋ Add materials</a></div>
      ${files.length?`<div class="material-map-summary"><span class="pill">${files.length} files</span><span class="pill">${assigned.length} đã gán</span><span class="pill">${unassigned.length} chưa gán</span></div>`:''}
      ${bundles.length?`<details class="bundle-details"><summary>Bộ tài liệu đã import · ${bundles.length}</summary>${bundles.map(x=>`<div class="bundle-row"><div class="grow"><b>${x.name}</b><div class="muted">${x.files?.length||0} file</div></div><button class="ghost danger" onclick="deleteMaterialBundle('${bookId}','${x.id}')">🗑️ Xoá cả bộ</button></div>`).join('')}</details>`:''}
      ${unassigned.length?`<h3 class="mat-section-title">Chưa gán bài · ${unassigned.length}</h3><div class="material-map-list">${unassigned.map(row).join('')}</div>`:''}
      ${assigned.length?`<details class="mapped-details" open><summary>Đã gán vào bài · ${assigned.length}</summary><div class="material-map-list">${assigned.map(row).join('')}</div></details>`:''}
      ${!files.length?'<div class="notice">Chưa có tài liệu bổ sung cho giáo trình này.</div>':''}`;
  };

  window.lesson=function(){
    const q=new URLSearchParams(location.search),b=q.get('b')||'reussite',u=+(q.get('u')||0),l=+(q.get('l')||0);
    if(!canSeeBook(b)){location='access.html?need='+encodeURIComponent(b);return}
    const B=BOOKS[b],U=B.units[u],K=key(b,u,l),title=U[1][l],ord=ordinalFor(b,u,l),num=`${u+1}.${l+1}`;
    S.last=K; save();
    lessonTitle.textContent=`Bài ${n2(ord)} · ${title}`;
    lessonSub.textContent=`${B.title} · Unit ${u+1} · ${U[0]} · ${num}`;
    const exact=allFiles(b).filter(x=>effectiveTarget(x)===`${u}:${l}`),audio=exact.filter(x=>x.file.type==='Audio'),docs=exact.filter(x=>x.file.type!=='Audio');
    lessonBox.innerHTML=`<section class="lesson-source-block"><div class="lesson-section-title"><span>01</span><h3>Nội dung bài</h3></div><div class="notice"><b>${title}</b><p class="muted">Nội dung nguồn sẽ được đồng bộ từ private storage/backend, không đưa nguyên giáo trình lên repo public.</p></div></section>
    <section class="lesson-source-block"><div class="lesson-section-title"><span>02</span><h3>Exercise</h3></div><div class="exercise-empty"><b>Chưa đồng bộ bài tập nguồn</b><p class="muted">Khi source content được import riêng tư, câu hỏi sẽ hiện lần lượt tại đây.</p></div></section>
    <section class="lesson-source-block"><div class="lesson-section-title"><span>03</span><h3>Audio</h3></div>${audio.length?audio.map((x,i)=>`<div class="audio-card"><div class="audio-index">${n2(i+1)}</div><div class="grow min0"><b>${x.file.name}</b><div class="muted">Đã gán đúng Bài ${n2(ord)}</div></div><button class="ghost" disabled>▶</button></div>`).join(''):'<div class="notice muted">Chưa có audio nào được gán vào bài này.</div>'}</section>
    <section class="lesson-source-block"><div class="lesson-section-title"><span>04</span><h3>Tài liệu liên kết</h3></div>${docs.length?docs.map(x=>`<div class="material-simple-row"><div class="material-file-icon">${icon(x.file.type)}</div><div class="grow min0"><b>${x.file.name}</b><div class="muted">${x.file.type}</div></div></div>`).join(''):'<div class="notice muted">Chưa có PDF / transcript / corrigé nào gắn riêng cho bài này.</div>'}</section>
    <section class="lesson-source-block"><div class="lesson-section-title"><span>05</span><h3>Corrigé & Transcript</h3></div><div class="notice muted">Chỉ hiện dữ liệu đã được map đúng lesson.</div></section>`;
    stats(K);
  };

  window.importer=function(){
    const bookSel=document.getElementById('bookTarget'),unitSel=document.getElementById('unitTarget'),lessonSel=document.getElementById('lessonTarget'),q=new URLSearchParams(location.search),preset=q.get('book'); if(!bookSel)return;
    bookSel.innerHTML=visibleBooks().map(([id,b])=>`<option value="${id}" ${id===preset?'selected':''}>${b.emoji} ${b.title}</option>`).join('');
    function fillUnits(){const b=BOOKS[bookSel.value];unitSel.innerHTML='<option value="">Không gán hàng loạt</option>'+b.units.map((x,i)=>`<option value="${i}">Unit ${i+1} · ${x[0]}</option>`).join('');fillLessons()}
    function fillLessons(){const b=BOOKS[bookSel.value],u=unitSel.value;if(u===''){lessonSel.innerHTML='<option value="">Chọn riêng từng file sau</option>';lessonSel.disabled=true;return}lessonSel.disabled=false;lessonSel.innerHTML='<option value="">Map từng file sau</option>'+b.units[+u][1].map((name,i)=>`<option value="${i}">Bài ${n2(ordinalFor(bookSel.value,+u,i))} · ${name}</option>`).join('')}
    bookSel.onchange=fillUnits;unitSel.onchange=fillLessons;fillUnits();
    scanBtn.onclick=()=>{
      const fs=[...files.files],bookId=bookSel.value;if(!fs.length)return alert('Chọn file trước');
      const u=unitSel.value,l=lessonSel.value,defaultTarget=(u!==''&&l!=='')?`${u}:${l}`:'book';
      const mapped=fs.map(f=>({name:f.name,type:classifyEnhFile(f),size:f.size,target:defaultTarget}));
      scanResult.innerHTML=`<div class="notice"><h3>Map từng file → ${BOOKS[bookId].title}</h3><p class="muted">Chọn đúng bài cho từng audio/file. Chưa chắc thì để “Chưa gán vào bài”.</p><div class="material-map-list">${mapped.map((f,i)=>`<div class="material-map-row"><div class="material-file-icon">${icon(f.type)}</div><div class="grow min0"><b class="file-name">${f.name}</b><div class="muted">${f.type}</div></div><select data-map-index="${i}">${targetOptions(bookId,f.target)}</select><span></span></div>`).join('')}</div><button id="confirmImp">Lưu materials</button></div>`;
      confirmImp.onclick=()=>{document.querySelectorAll('[data-map-index]').forEach(sel=>mapped[+sel.dataset.mapIndex].target=sel.value);S.imports.push({id:'mat-'+Date.now(),name:importName.value||('Materials · '+BOOKS[bookId].title),bookId,target:'book',scopeLabel:'Materials của giáo trình',files:mapped});save();location='book.html?id='+bookId}
    };
  };

  const css=document.createElement('style');css.textContent=`
  .material-map-summary{display:flex;gap:6px;flex-wrap:wrap;margin:12px 0}.mat-section-title{margin:16px 0 8px}.material-map-list{display:grid;gap:8px}.material-map-row{display:grid;grid-template-columns:40px minmax(0,1fr) minmax(210px,330px) 44px;gap:10px;align-items:center;border:1px solid var(--line);border-radius:14px;padding:10px;background:#fffafb}.material-file-icon{width:36px;height:36px;border-radius:10px;background:#fff0f5;display:grid;place-items:center}.file-name{overflow-wrap:anywhere}.danger{color:#9a4860}.bundle-details,.mapped-details{margin-top:14px}.bundle-details summary,.mapped-details summary{cursor:pointer;font-weight:800;color:#a34f70}.bundle-row{display:flex;gap:10px;align-items:center;border:1px solid var(--line);border-radius:12px;padding:10px;margin-top:8px}.lesson-source-block{margin-bottom:22px}.lesson-section-title{display:flex;align-items:center;gap:10px;margin-bottom:9px}.lesson-section-title span{width:34px;height:34px;border-radius:10px;background:#fff0f5;color:#a34f70;font-weight:900;display:grid;place-items:center}.lesson-section-title h3{margin:0}.exercise-empty{border:1px solid var(--line);border-radius:14px;padding:16px;background:#fff}.audio-card,.material-simple-row{display:flex;gap:10px;align-items:center;border:1px solid var(--line);border-radius:14px;padding:11px;margin:8px 0;background:#fff}.audio-index{width:34px;height:34px;border-radius:10px;background:#fff0f5;display:grid;place-items:center;font-weight:900}@media(max-width:780px){.material-map-row{grid-template-columns:36px minmax(0,1fr) 44px}.material-map-row select{grid-column:2/4}.bundle-row{align-items:flex-start;flex-wrap:wrap}.bundle-row button{width:100%}}
  `;document.head.appendChild(css);
})();