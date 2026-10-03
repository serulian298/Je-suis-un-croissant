// Lingo Bloom backend client. Uses only browser-safe Supabase URL + publishable key.
// supabase-js is pinned to a specific version for reproducible builds.
(function(){
  const CDN='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/+esm';
  const cfg=window.LINGO_BACKEND||{};
  let client=null, modulePromise=null;
  const listeners=new Set();
  const state={enabled:!!(cfg.enabled&&cfg.supabaseUrl&&cfg.publishableKey),session:null,user:null,error:null};
  function emit(){listeners.forEach(fn=>{try{fn({...state})}catch{}})}
  async function init(){
    if(!state.enabled)return state;
    if(client)return state;
    try{
      modulePromise=modulePromise||import(CDN);
      const {createClient}=await modulePromise;
      client=createClient(cfg.supabaseUrl,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
      const {data,error}=await client.auth.getSession();
      if(error)throw error;
      state.session=data.session||null;state.user=data.session?.user||null;
      client.auth.onAuthStateChange((_event,session)=>{state.session=session||null;state.user=session?.user||null;emit()});
      emit();return state;
    }catch(e){state.error=e;emit();throw e}
  }
  async function need(){await init();if(!client)throw new Error('Backend chưa được cấu hình.');return client}
  async function signInGoogle(){const c=await need();const redirectTo=location.origin+location.pathname.replace(/auth\.html.*$/,'index.html');const {data,error}=await c.auth.signInWithOAuth({provider:'google',options:{redirectTo}});if(error)throw error;return data}
  async function signUp(email,password){const c=await need();const {data,error}=await c.auth.signUp({email,password});if(error)throw error;return data}
  async function signIn(email,password){const c=await need();const {data,error}=await c.auth.signInWithPassword({email,password});if(error)throw error;return data}
  async function signOut(){const c=await need();const {error}=await c.auth.signOut();if(error)throw error}
  async function saveUserState(localState){const c=await need();if(!state.user)throw new Error('Bạn chưa đăng nhập.');const payload={user_id:state.user.id,state:localState,updated_at:new Date().toISOString()};const {data,error}=await c.from('user_state').upsert(payload,{onConflict:'user_id'}).select().single();if(error)throw error;return data}
  async function loadUserState(){const c=await need();if(!state.user)throw new Error('Bạn chưa đăng nhập.');const {data,error}=await c.from('user_state').select('state,updated_at').eq('user_id',state.user.id).maybeSingle();if(error)throw error;return data}
  async function uploadMaterial({bookId,file,target='book'}){const c=await need();if(!state.user)throw new Error('Bạn chưa đăng nhập.');const clean=(file.name||'file').replace(/[^a-zA-Z0-9._-]+/g,'_');const path=`${state.user.id}/${bookId}/${crypto.randomUUID()}-${clean}`;const {data:up,error:upErr}=await c.storage.from('course-materials').upload(path,file,{upsert:false,contentType:file.type||undefined});if(upErr)throw upErr;const {data,error}=await c.from('material_files').insert({user_id:state.user.id,book_id:bookId,storage_path:up.path,file_name:file.name,file_type:file.type||null,target}).select().single();if(error){await c.storage.from('course-materials').remove([up.path]);throw error}return data}
  async function invokeAIScan(payload){const c=await need();if(!state.user)throw new Error('Bạn chưa đăng nhập.');const {data,error}=await c.functions.invoke('ai-scan',{body:payload});if(error)throw error;return data}
  function onChange(fn){listeners.add(fn);fn({...state});return()=>listeners.delete(fn)}
  window.LingoBackend={init,signInGoogle,signUp,signIn,signOut,saveUserState,loadUserState,uploadMaterial,invokeAIScan,onChange,get client(){return client},get state(){return state}};
  if(state.enabled)init().catch(console.error);
})();