window.PORTAL_CONFIG=Object.freeze({
  domain:"owner-operator.screenings4u.com",
  portalCode:"owner_operator",
  label:"workforce DOT Owner-Operator",
  kind:"owner_operator",
  surface:"dot",
  workforceUrl:"https://elpbnytpciqnbexiaebp.supabase.co",
  workforceKey:"sb_publishable_xVI6Mjkk1bNVMGHZCPuK6w_8FSHKdkC",
  url:"https://elpbnytpciqnbexiaebp.supabase.co",
  key:"sb_publishable_xVI6Mjkk1bNVMGHZCPuK6w_8FSHKdkC",
  api:"https://elpbnytpciqnbexiaebp.supabase.co/functions/v1",
  home:"/dashboard.html"
});

(()=>{'use strict';
  const C=window.PORTAL_CONFIG;
  const AUTH_KEY='s4u_owner_operator_auth';
  window.S4U=C;
  window.S4UGetSupabaseClient=function(){
    if(window.__S4U_OWNER_OPERATOR_CLIENT__)return window.__S4U_OWNER_OPERATOR_CLIENT__;
    if(!window.supabase?.createClient)throw new Error('Supabase client library is not loaded.');
    window.__S4U_OWNER_OPERATOR_CLIENT__=window.supabase.createClient(
      C.workforceUrl,
      C.workforceKey,
      {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:AUTH_KEY}}
    );
    return window.__S4U_OWNER_OPERATOR_CLIENT__;
  };
  window.S4UWithPortal=function(body={}){
    const out={...body,portal_code:C.portalCode,requested_portal_code:C.portalCode};
    try{
      const sid=localStorage.getItem('s4u_'+C.portalCode+'_subscription')||'';
      const mid=localStorage.getItem('s4u_'+C.portalCode+'_membership')||'';
      if(sid&&!out.subscription_id)out.subscription_id=sid;
      if(mid&&!out.membership_id)out.membership_id=mid;
    }catch{}
    return out;
  };
})();


window.PORTAL_RUNTIME=Object.freeze({
  session:"owner-operator-session",
  actions:"owner-operator-actions",
  distribution:"owner-operator-distribution",
  members:"owner-operator-members",
  support:"workforce-support"
});
