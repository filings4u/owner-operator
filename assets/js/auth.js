
(function(){
const cfg=window.S4U;
const supabase=window.supabase.createClient(cfg.url,cfg.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const msg=(text,cls="")=>{const e=document.getElementById("auth-msg");if(e){e.textContent=text;e.className="auth-msg "+cls}};

async function route(){
 const {data:{session}}=await supabase.auth.getSession();
 if(!session)return false;
 try{
  const r=await fetch(cfg.api+"/workforce-session-context",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+session.access_token,"apikey":cfg.key},body:JSON.stringify({requested_portal_code:"owner_operator"})});
  const j=await r.json().catch(()=>({}));
  if(!r.ok||j.error)throw new Error(j.error||"Owner-Operator access is not available.");
  const next=new URLSearchParams(location.search).get("next")||"/dashboard.html";
  location.replace(next.startsWith("/")?next:"/dashboard.html");
  return true;
 }catch(e){msg(e.message,"error");return false}
}
window.addEventListener("DOMContentLoaded",async()=>{
 if(location.pathname.endsWith("/auth-handoff.html")){
   msg("Completing secure sign-in…");
   const hash=new URLSearchParams(location.hash.replace(/^#/,""));
   if(hash.get("access_token")&&hash.get("refresh_token")){
     await supabase.auth.setSession({access_token:hash.get("access_token"),refresh_token:hash.get("refresh_token")});
   }
   const code=new URLSearchParams(location.search).get("code");
   if(code){await supabase.auth.exchangeCodeForSession(code).catch(()=>{})}
   await route(); return;
 }
 if(location.pathname.endsWith("/reset-password.html")){
   document.getElementById("reset-form")?.addEventListener("submit",async e=>{
    e.preventDefault();const p=e.currentTarget.password.value, c=e.currentTarget.confirm.value;
    if(p.length<8)return msg("Use at least 8 characters.","error");
    if(p!==c)return msg("Passwords do not match.","error");
    const {error}=await supabase.auth.updateUser({password:p});
    if(error)return msg(error.message,"error");
    msg("Password updated. Redirecting…","success");setTimeout(()=>location.href="/dashboard.html",700);
   });
   return;
 }
 const {data:{session}}=await supabase.auth.getSession();
 if(session){await route();return}
 document.getElementById("login-form")?.addEventListener("submit",async e=>{
   e.preventDefault();msg("Signing in…");
   const fd=new FormData(e.currentTarget);
   const {error}=await supabase.auth.signInWithPassword({email:String(fd.get("email")||"").trim(),password:String(fd.get("password")||"")});
   if(error)return msg(error.message,"error");
   await route();
 });
 document.getElementById("forgot-form")?.addEventListener("submit",async e=>{
   e.preventDefault();msg("Sending reset link…");
   const email=String(new FormData(e.currentTarget).get("email")||"").trim();
   const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:"https://owner-operator.screenings4u.com/reset-password.html"});
   if(error)return msg(error.message,"error");
   msg("Check your email for the reset link.","success");
 });
});
})();
