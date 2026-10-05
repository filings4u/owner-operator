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
<<<<<<< HEAD
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

;(()=>{
  const R=window.PORTAL_RUNTIME=Object.freeze({
    session:"owner-operator-session",
    actions:"owner-operator-actions",
    distribution:"owner-operator-distribution"
  });
  const C=window.PORTAL_CONFIG||window.S4U||{};
  C.runtimeFunctions=R;
  if(window.__S4U_ISOLATED_FETCH_PATCHED__)return;
  window.__S4U_ISOLATED_FETCH_PATCHED__=true;
  const baseFetch=window.fetch.bind(window);
  const knownSession=new Set(['dot-session-context']);
  const knownDistribution=new Set(['dot-distribution-runtime']);
  const knownCatalog=new Set(['portal-order-catalog']);
  window.fetch=function(input,init){
    try{
      let raw=typeof input==='string'?input:(input?.url||'');
      if(!raw||!raw.includes('/functions/v1/'))return baseFetch(input,init);
      const u=new URL(raw,location.href),parts=u.pathname.split('/'),idx=parts.indexOf('v1');
      if(idx<0||!parts[idx+1])return baseFetch(input,init);
      const original=parts[idx+1]; let target=original,routeToActions=false;
      if(knownSession.has(original))target=R.session;
      else if(knownDistribution.has(original))target=R.distribution;
      else if(knownCatalog.has(original)){target=R.actions;routeToActions=true;}
      else if(original.startsWith('workforce-')||original==='dot-portal-actions'){target=R.actions;routeToActions=true;}
      if(target===original)return baseFetch(input,init);
      parts[idx+1]=target;u.pathname=parts.join('/');
      const i=init?{...init}:{};
      if(i.body&&typeof i.body==='string'){
        try{
          const b=JSON.parse(i.body);
          b.portal_code='owner_operator';
          b.requested_portal_code='owner_operator';
          if(routeToActions&&!b.legacy_endpoint)b.legacy_endpoint=original;
          i.body=JSON.stringify(window.S4UWithPortal(b));
        }catch{}
      }
      return baseFetch(u.toString(),i);
    }catch(e){return baseFetch(input,init)}
  };
})();
=======
};
/* Reuse one Supabase Auth client per portal/browser context. */
(()=>{const C=window.PORTAL_CONFIG;if(!C)return;const wrap=lib=>{if(!lib?.createClient||lib.__s4uSingleClient)return lib;const create=lib.createClient.bind(lib);lib.createClient=(url,key,options)=>{if(url===C.workforceUrl&&key===C.workforceKey)return window.S4U_SUPABASE||(window.S4U_SUPABASE=create(url,key,options));return create(url,key,options)};try{Object.defineProperty(lib,'__s4uSingleClient',{value:true})}catch{}return lib};if(window.supabase)wrap(window.supabase);else{let assigned;try{Object.defineProperty(window,'supabase',{configurable:true,get(){return assigned},set(v){assigned=wrap(v)}})}catch{}}})();
>>>>>>> c5668977375ebcee965f279e0b077cb55222d7d7
