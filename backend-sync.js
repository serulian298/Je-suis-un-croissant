// Sync local study state to the signed-in Supabase account.
(function(){
  const LOCAL_KEY='petit-french-v1';
  let lastSnapshot=null,timer=null,busy=false;
  function meaningful(x){return x&&typeof x==='object'&&Object.keys(x).length>0}
  async function initialSync(st){
    if(!st?.user||busy)return;busy=true;
    try{
      const marker='lingo-sync-loaded-'+st.user.id;
      const remote=await LingoBackend.loadUserState();
      if(!sessionStorage.getItem(marker)){
        if(meaningful(remote?.state)){
          localStorage.setItem(LOCAL_KEY,JSON.stringify(remote.state));
          sessionStorage.setItem(marker,'1');
          location.reload();return;
        }else if(typeof S!=='undefined'){
          await LingoBackend.saveUserState(S);
          sessionStorage.setItem(marker,'1');
        }
      }
      lastSnapshot=localStorage.getItem(LOCAL_KEY)||'';
      if(!timer)timer=setInterval(syncIfChanged,2500);
    }catch(e){console.warn('Lingo sync:',e)}finally{busy=false}
  }
  async function syncIfChanged(){
    if(busy||!LingoBackend?.state?.user)return;
    const raw=localStorage.getItem(LOCAL_KEY)||'';
    if(!raw||raw===lastSnapshot)return;
    busy=true;
    try{await LingoBackend.saveUserState(JSON.parse(raw));lastSnapshot=raw}catch(e){console.warn('Lingo sync save:',e)}finally{busy=false}
  }
  function badge(st){
    let el=document.getElementById('cloudSyncBadge');
    if(!el){el=document.createElement('a');el.id='cloudSyncBadge';el.href='auth.html';el.className='cloud-sync-badge';document.body.appendChild(el)}
    el.textContent=st.user?'☁️ Synced':'☁️ Sign in';
    el.title=st.user?(st.user.email||'Synced account'):'Đăng nhập để đồng bộ';
  }
  async function start(){if(!window.LingoBackend)return;LingoBackend.onChange(st=>{badge(st);if(st.user)initialSync(st);else if(timer){clearInterval(timer);timer=null;lastSnapshot=null}})}
  window.addEventListener('beforeunload',()=>{syncIfChanged()});
  start();
})();
