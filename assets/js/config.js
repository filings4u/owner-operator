
window.S4U={
  url:"https://elpbnytpciqnbexiaebp.supabase.co",
  key:"sb_publishable_xVI6Mjkk1bNVMGHZCPuK6w_8FSHKdkC",
  portalCode:"owner_operator",
  api:"https://elpbnytpciqnbexiaebp.supabase.co/functions/v1",
  home:"/dashboard.html"
};
/* Reuse one Supabase Auth client per portal/browser context. */
(()=>{const C=window.PORTAL_CONFIG;if(!C)return;const wrap=lib=>{if(!lib?.createClient||lib.__s4uSingleClient)return lib;const create=lib.createClient.bind(lib);lib.createClient=(url,key,options)=>{if(url===C.workforceUrl&&key===C.workforceKey)return window.S4U_SUPABASE||(window.S4U_SUPABASE=create(url,key,options));return create(url,key,options)};try{Object.defineProperty(lib,'__s4uSingleClient',{value:true})}catch{}return lib};if(window.supabase)wrap(window.supabase);else{let assigned;try{Object.defineProperty(window,'supabase',{configurable:true,get(){return assigned},set(v){assigned=wrap(v)}})}catch{}}})();
