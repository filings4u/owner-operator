(()=>{'use strict';
const C=window.PORTAL_CONFIG,sb=window.S4UGetSupabaseClient(),st=document.getElementById('status'),
form=document.getElementById('loginForm'),submit=document.getElementById('loginSubmit'),
SITE_KEY='0x4AAAAAAE4-F43E-viFsKat';
let widget=null,token='';
const set=(m,b=false)=>{st.textContent=m||'';st.style.color=b?'#a72d2d':'#17764a'};
const sync=()=>submit.disabled=!token;
function mount(){
  if(!window.turnstile)return setTimeout(mount,80);
  if(widget!==null)return;
  widget=window.turnstile.render('#turnstileLogin',{
    sitekey:SITE_KEY,action:'owner_operator_password_login',theme:'auto',size:'flexible',
    callback:t=>{token=String(t||'');sync()},
    'expired-callback':()=>{token='';sync()},
    'timeout-callback':()=>{token='';sync()},
    'error-callback':()=>{token='';sync();set('Security verification could not load. Please retry.',true);return true}
  });
}
async function verify(session){
  const r=await fetch(C.workforceUrl+'/functions/v1/owner-operator-session',{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+session.access_token,'apikey':C.workforceKey},
    body:JSON.stringify({portal_code:C.portalCode,requested_portal_code:C.portalCode,page:'login'})
  });
  const d=await r.json().catch(()=>({}));
  if(!r.ok||d.error||d.has_access===false)throw new Error(d.error||d.reason||'Owner-Operator access is not available for this account.');
  return d;
}
form.onsubmit=async e=>{
  e.preventDefault();
  if(!token)return set('Complete the security check to continue.',true);
  submit.disabled=true;set('Signing in…');
  const f=new FormData(form),email=String(f.get('email')||'').trim(),password=String(f.get('password')||'');
  try{await sb.auth.signOut({scope:'local'})}catch{}
  const {data,error}=await sb.auth.signInWithPassword({email,password,options:{captchaToken:token}});
  if(error||!data?.session){
    set(String(error?.message||'').toLowerCase().includes('invalid login credentials')?
      'Email or password is incorrect. Use Forgot password to reset it.':
      (error?.message||'Unable to sign in.'),true);
    token='';try{window.turnstile.reset(widget)}catch{};sync();return;
  }
  try{
    await verify(data.session);
    const next=new URLSearchParams(location.search).get('next');
    location.replace(next&&next.startsWith('/')?next:C.home);
  }catch(err){
    try{await sb.auth.signOut({scope:'local'})}catch{}
    set(err.message||'Unable to verify Owner-Operator access.',true);
    token='';try{window.turnstile.reset(widget)}catch{};sync();
  }
};
mount();sync();
})();