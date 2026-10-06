
(function(){
const cfg=window.S4U;
if(!cfg) throw new Error("Portal configuration is missing.");
const supabase=window.S4UGetSupabaseClient();

const NAV=[
  ["onboarding.html","✓","Getting Started"],
  ["clearinghouse-setup.html","☑","Clearinghouse Setup"],
  ["dashboard.html","⌂","Dashboard"],
  ["profile.html","◎","Company Profile"],
  ["drivers.html","♟","Driver"],
  ["programs.html","≡","DOT Program"],
  ["consortium.html","◉","Consortium / Random Pool"],
  ["testing.html","◆","Testing"],
  ["results.html","✓","Results"],
  ["compliance.html","⚑","Compliance"],
  ["rtd.html","↻","Return-to-Duty"],
  ["documents.html","▤","Documents"],
  ["reports.html","▥","Reports"],
  ["billing.html","$","Billing"],
  ["notifications.html","●","Notifications"],
  ["users.html","♟","Users"],
  ["audit-history.html","≣","Audit History"],
  ["support.html","?","Support"]
];

const featureByPage={
  "drivers.html":"employee_management",
  "programs.html":"programs",
  "consortium.html":"random_pool",
  "testing.html":"testing_orders",
  "results.html":"results_summary",
  "compliance.html":"compliance",
  "rtd.html":"rtd_follow_up",
  "documents.html":"documents",
  "reports.html":"standard_reports",
  "notifications.html":"notifications",
  "users.html":"team_users",
  "audit-history.html":"audit_history"
};

const state={session:null,context:null,entitlements:{},permissions:[],onboarding:null,clearinghouse:null};
const pageCache=new Map();
const PAGE_CACHE_TTL=5*60*1000;
const PERSIST_CACHE_PREFIX='s4u_owner_page_cache:v2:';
const PREFETCH_ACTIONS=['overview','profile','drivers','programs','consortium','testing','results','compliance','rtd','documents','reports','billing','notifications','audit'];
function readPersistentCache(key){try{const x=JSON.parse(sessionStorage.getItem(PERSIST_CACHE_PREFIX+key)||'null');if(x&&Date.now()-Number(x.ts||0)<PAGE_CACHE_TTL)return x}catch{}return null}
function writePersistentCache(key,entry){try{sessionStorage.setItem(PERSIST_CACHE_PREFIX+key,JSON.stringify(entry))}catch{}}
function deletePageCache(key){pageCache.delete(key);try{sessionStorage.removeItem(PERSIST_CACHE_PREFIX+key)}catch{}}
let navigating=false;

async function edge(name,body){
  const requestBody=window.S4UWithPortal?window.S4UWithPortal(body||{}):(body||{});
  async function validSession(forceRefresh=false){
    let {data:{session},error}=forceRefresh?await supabase.auth.refreshSession():await supabase.auth.getSession();
    if(error) session=null;
    const expiresAt=Number(session?.expires_at||0)*1000;
    if(session?.access_token && (!expiresAt || expiresAt-Date.now()>60000)) return session;
    const refreshed=await supabase.auth.refreshSession();
    if(refreshed.error||!refreshed.data?.session?.access_token) throw new Error("Your session has expired. Please sign in again.");
    return refreshed.data.session;
  }
  async function send(session){
    return fetch(cfg.api+"/"+name,{
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "Authorization":"Bearer "+session.access_token,
        "apikey":cfg.key
      },
      body:JSON.stringify(requestBody)
    });
  }
  let session=await validSession(false);
  let r=await send(session);
  if(r.status===401){
    session=await validSession(true);
    r=await send(session);
  }
  const j=await r.json().catch(()=>({}));
  if(!r.ok||j.error) throw new Error(j.error||("Request failed ("+r.status+")"));
  return j;
}

function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]))}
function money(v){const n=Number(v||0);return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(n)}
function fmt(v){if(!v)return"—";const d=new Date(v);return Number.isNaN(d.getTime())?esc(v):d.toLocaleDateString()}
function status(v){const s=String(v||"").toLowerCase();const cls=["active","complete","completed","paid","eligible","resolved"].includes(s)?"status":["cancelled","failed","inactive","suspended","terminated"].includes(s)?"status bad":"status warn";return `<span class="${cls}">${esc(v||"Unknown")}</span>`}

const US_STATES=[
  ["AL","Alabama"],["AK","Alaska"],["AZ","Arizona"],["AR","Arkansas"],["CA","California"],["CO","Colorado"],["CT","Connecticut"],["DE","Delaware"],["FL","Florida"],["GA","Georgia"],["HI","Hawaii"],["ID","Idaho"],["IL","Illinois"],["IN","Indiana"],["IA","Iowa"],["KS","Kansas"],["KY","Kentucky"],["LA","Louisiana"],["ME","Maine"],["MD","Maryland"],["MA","Massachusetts"],["MI","Michigan"],["MN","Minnesota"],["MS","Mississippi"],["MO","Missouri"],["MT","Montana"],["NE","Nebraska"],["NV","Nevada"],["NH","New Hampshire"],["NJ","New Jersey"],["NM","New Mexico"],["NY","New York"],["NC","North Carolina"],["ND","North Dakota"],["OH","Ohio"],["OK","Oklahoma"],["OR","Oregon"],["PA","Pennsylvania"],["RI","Rhode Island"],["SC","South Carolina"],["SD","South Dakota"],["TN","Tennessee"],["TX","Texas"],["UT","Utah"],["VT","Vermont"],["VA","Virginia"],["WA","Washington"],["WV","West Virginia"],["WI","Wisconsin"],["WY","Wyoming"],["DC","District of Columbia"]
];
function stateOptions(selected=''){const v=String(selected||'').toUpperCase();return '<option value="">Select state</option>'+US_STATES.map(([code,name])=>`<option value="${code}" ${v===code?'selected':''}>${name}</option>`).join('')}

function renderShell(){
  const path=(location.pathname.split("/").pop()||"dashboard.html").toLowerCase();
  const nav=NAV.map(([href,icon,label])=>`<a href="/${href}" class="${path===href?"active":""}"><span class="ico">${icon}</span><span>${label}</span></a>`).join("");
  const shell=document.getElementById("portal-shell");
  if(!shell)return;
  shell.className="";
  shell.innerHTML=`
    <div class="app">
      <aside class="side" id="side">
        <div class="brand"><img src="https://elpbnytpciqnbexiaebp.supabase.co/storage/v1/object/public/enterprise_branding/workforce-dot.png" alt="workforce DOT Owner-Operator"></div>
        <nav class="nav">
          <div class="nav-title">Owner-Operator DOT Workspace</div>
          ${nav}
        </nav>
        <div class="side-foot">
          <div class="side-foot-label">Portal</div>
          <div class="side-foot-domain">owner-operator.screenings4u.com</div>
        </div>
      </aside>
      <main class="main">
        <header class="top">
          <div class="top-left">
            <button class="menu" id="menu" type="button" aria-label="Open navigation" aria-expanded="false" aria-controls="mobileNav">
              <span class="menu-bars" aria-hidden="true"><span></span><span></span><span></span></span>
            </button>
            <div class="top-context">
              <span class="top-eyebrow">workforce DOT Owner-Operator</span>
              <span class="crumb" id="org-name">Owner-Operator Portal</span>
            </div>
          </div>
          <div class="top-right">
            <div class="portal-clock" aria-label="Current date and time">
              <span id="portalClockDate" class="portal-clock-date"></span>
              <strong id="portalClockTime" class="portal-clock-time"></strong>
            </div>
            <div class="font-sizer" aria-label="Text size controls">
              <button type="button" id="fontDown" aria-label="Decrease text size">A−</button>
              <button type="button" id="fontReset" class="font-reset">Default</button>
              <button type="button" id="fontUp" aria-label="Increase text size">A+</button>
            </div>
            <a class="top-support" href="/support.html">Support</a>
            <button class="signout" id="signout-btn" type="button">Sign out</button>
          </div>
        </header>

        <div class="mobile-nav" id="mobileNav" aria-hidden="true">
          <div class="mobile-nav-inner">
            <div class="mobile-nav-head">
              <div><span>workforce DOT</span><strong>Owner-Operator Workspace</strong></div>
              <span class="mobile-nav-current">${(NAV.find(x=>x[0]===path)||[])[2]||"Portal"}</span>
            </div>
            <nav class="mobile-nav-links">${nav}</nav>
            <div class="mobile-nav-foot"><span>Owner-Operator Portal</span><small>owner-operator.screenings4u.com</small></div>
          </div>
        </div>

        <div class="content" id="page-content"></div>
      </main>
    </div>`;

  const FONT_KEY='s4u_owner_operator_font_size', FONT_DEFAULT=14, FONT_MIN=12, FONT_MAX=18;
  const applyFont=n=>{
    const v=Math.min(FONT_MAX,Math.max(FONT_MIN,Number(n)||FONT_DEFAULT));
    document.documentElement.style.setProperty('--portal-font-root',v+'px');
    localStorage.setItem(FONT_KEY,String(v));
    const el=document.getElementById('fontReset'); if(el)el.textContent=v===FONT_DEFAULT?'Default':String(v);
    return v;
  };
  let fs=applyFont(Number(localStorage.getItem(FONT_KEY))||FONT_DEFAULT);
  document.getElementById('fontDown')?.addEventListener('click',()=>{fs=applyFont(fs-1)});
  document.getElementById('fontUp')?.addEventListener('click',()=>{fs=applyFont(fs+1)});
  document.getElementById('fontReset')?.addEventListener('click',()=>{fs=applyFont(FONT_DEFAULT)});

  const updateClock=()=>{
    const d=document.getElementById('portalClockDate'),t=document.getElementById('portalClockTime');
    if(!d||!t)return;
    const now=new Date();
    d.textContent=new Intl.DateTimeFormat('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'}).format(now);
    t.textContent=new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit',hour12:true}).format(now);
  };
  updateClock(); clearInterval(window.__s4uOwnerClock); window.__s4uOwnerClock=setInterval(updateClock,30000);

  const menu=document.getElementById('menu'),mobile=document.getElementById('mobileNav');
  const closeMenu=()=>{menu?.classList.remove('open');menu?.setAttribute('aria-expanded','false');mobile?.classList.remove('open');mobile?.setAttribute('aria-hidden','true');document.body.classList.remove('mobile-nav-open')};
  menu?.addEventListener('click',()=>{
    const open=!mobile?.classList.contains('open');
    if(open){menu.classList.add('open');menu.setAttribute('aria-expanded','true');mobile.classList.add('open');mobile.setAttribute('aria-hidden','false');document.body.classList.add('mobile-nav-open')}
    else closeMenu();
  });
  mobile?.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
  // Clicking the already-active navigation item should not reload the page.
  document.querySelectorAll('.side .nav a.active,.mobile-nav-links a.active').forEach(a=>a.addEventListener('click',e=>e.preventDefault()));

  document.getElementById("signout-btn")?.addEventListener("click",async()=>{
    try{await supabase.auth.signOut({scope:'local'})}catch{}
    location.replace("/login.html");
  });
}

function waitForBootstrap(timeoutMs=8000){
  if(window.__S4U_OWNER_BOOTSTRAP__)return Promise.resolve(window.__S4U_OWNER_BOOTSTRAP__);
  return new Promise((resolve,reject)=>{
    let done=false;
    const finish=v=>{if(done)return;done=true;clearTimeout(timer);window.removeEventListener('s4u:dot-authenticated',onAuth);resolve(v)};
    const onAuth=()=>finish(window.__S4U_OWNER_BOOTSTRAP__);
    const timer=setTimeout(()=>{if(done)return;done=true;window.removeEventListener('s4u:dot-authenticated',onAuth);reject(new Error('Portal session verification timed out. Please refresh once.'))},timeoutMs);
    window.addEventListener('s4u:dot-authenticated',onAuth,{once:true});
  });
}

async function guard(){
  const {data:{session}}=await supabase.auth.getSession();
  if(!session){location.replace("/login.html?next="+encodeURIComponent(location.pathname+location.search));return false}
  state.session=session;
  const page=(location.pathname.split("/").pop()||"dashboard.html").toLowerCase();
  // portal-security.js is the single source of truth for access/bootstrap.
  // Waiting for its result avoids a second network bootstrap and eliminates
  // the visible refresh/flicker caused by two guards racing each other.
  const boot=await waitForBootstrap();
  if(!boot)throw new Error('Unable to verify Owner-Operator portal access.');
  const ctx=boot.context||boot;
  const w=ctx.workspace||ctx.context||ctx;
  const portal=String(w.portal||ctx.portal_code||ctx.access?.portal_code||"");
  if(portal!=="owner_operator" && String(w.owner_operator_id||w.owner_operator?.id||"")==="") throw new Error("This account is not authorized for the Owner-Operator portal.");
  state.context=w;
  state.entitlements=w.entitlements||ctx.entitlements||{};
  state.permissions=w.permissions||ctx.permissions||[];
  const org=document.getElementById("org-name");
  if(org)org.textContent=w.organization_name||w.organization?.dba_name||w.organization?.legal_name||w.owner_operator?.legal_name||"Owner-Operator Portal";
  state.onboarding=boot.onboarding||null;
  state.clearinghouse=boot.clearinghouse||null;
  if(onboardingLocked() && !["onboarding.html","checkout.html","order-drug-test.html","support.html"].includes(page)){history.replaceState({},'', '/onboarding.html');return true}
  if(clearinghouseLocked() && !["clearinghouse-setup.html","onboarding.html","checkout.html","order-drug-test.html","support.html"].includes(page)){navigatePortal("/clearinghouse-setup.html",{replace:true});return false}
  const required=featureByPage[page];
  if(required && state.entitlements && Object.keys(state.entitlements).length && state.entitlements[required]===false) throw new Error("This page is not included in your current Owner-Operator plan.");
  return true;
}

function pageHead(eyebrow,title,desc,action=""){
  return `<div class="page-head"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${desc}</p></div>${action}</div>`;
}
function table(headers,rows){
  if(!rows.length)return `<div class="empty">No records found.</div>`;
  return `<div class="table-wrap"><table><thead><tr>${headers.map(x=>`<th>${x}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`;
}
function errorView(e){
  const el=document.getElementById("page-content");
  if(el)el.innerHTML=pageHead("OWNER-OPERATOR PORTAL","We could not load this page","The portal returned an error while loading your account.")+`<div class="card"><div class="status bad">Error</div><p>${esc(e.message||e)}</p><button class="btn btn-primary" id="page-retry-btn">Try again</button></div>`;
}

async function owner(action,extra={}){
  const payload=window.S4UWithPortal?window.S4UWithPortal({action,...extra}):{action,...extra};
  const cacheable=!extra||Object.keys(extra).length===0;
  const key='owner:'+action;
  if(cacheable){
    let hit=pageCache.get(key);
    if(!hit){hit=readPersistentCache(key);if(hit)pageCache.set(key,hit)}
    if(hit&&Date.now()-hit.ts<PAGE_CACHE_TTL)return hit.data;
  }
  const data=await edge("owner-operator-portal-fast",payload);
  if(cacheable){const entry={ts:Date.now(),data};pageCache.set(key,entry);writePersistentCache(key,entry)}
  return data;
}
async function members(action,extra={}){return edge("owner-operator-members",{action,...extra})}
async function onboardingApi(action,extra={}){
  const payload=window.S4UWithPortal?window.S4UWithPortal({...extra}):{...extra};
  if(action==="status") return edge("owner-operator-actions",{...payload,action:"onboarding_status",page:"onboarding.html"});
  if(action==="complete_agreement") return edge("owner-operator-actions",{...payload,action:"complete_onboarding",page:"onboarding.html"});
  return edge("owner-operator-onboarding",window.S4UWithPortal?window.S4UWithPortal({action,...extra}):{action,...extra});
}
async function onboardingProfileApi(action,extra={}){
  return edge("owner-operator-onboarding-profile",window.S4UWithPortal?window.S4UWithPortal({action,...extra}):{action,...extra});
}

async function clearinghouseApi(action,extra={}){
  const payload=window.S4UWithPortal?window.S4UWithPortal({...extra}):{...extra};
  if(action==="status") return edge("owner-operator-actions",{...payload,action:"clearinghouse_status",page:"clearinghouse-setup.html"});
  if(action==="confirm") return edge("owner-operator-actions",{...payload,action:"confirm_clearinghouse",page:"clearinghouse-setup.html"});
  throw new Error("Unsupported Clearinghouse action.");
}

async function loadOnboarding(){
 const root=document.getElementById("page-content");
 let d=state.onboarding||null;
 let profileState=state.onboardingProfile||null;
 if(!d?.prefill||!profileState){
   const tasks=[];
   if(!d?.prefill)tasks.push(onboardingApi("status").then(x=>{d=x;state.onboarding=x}));
   if(!profileState)tasks.push(onboardingProfileApi("status").then(x=>{profileState=x;state.onboardingProfile=x}));
   await Promise.all(tasks);
 }
 const prefill=d?.prefill||{},agreement=d?.agreement||null,profilePrefill=profileState?.prefill||{};
 const profileDone=profileState?.completed===true||profileState?.locked===true;
 const agreementDone=!!d?.agreement_completed,preemploymentDone=!!d?.preemployment_complete;

 if(d?.completed&&profileDone){
   const proof=d.preemployment_proof,testReq=d.test_request;
   const companyName=esc(agreement?.company_name||prefill.company_name||"Owner-Operator");
   const signedDate=agreement?.signed_at?fmt(agreement.signed_at):"On file";
   const preemploymentText=proof?"Official negative result uploaded":testReq?"DOT 5-panel test requested":"Requirement complete";
   root.innerHTML=pageHead("GETTING STARTED","Owner-Operator onboarding completed","Your enrollment steps are on file. Review your status below, then continue to the Clearinghouse setup.")+`
   <div class="completion-shell">
    <section class="card completion-hero">
      <div class="completion-hero__badge">Completed</div>
      <div class="completion-hero__header">
        <div class="completion-hero__copy"><h2>${companyName}</h2><p>Your Owner-Operator onboarding has been submitted successfully and your portal is ready for the next required step.</p></div>
        <div class="completion-hero__next"><div class="completion-next-label">Next required step</div><h3>Clearinghouse Setup</h3><p>Designate Workforce DOT | screenings4u as your C/TPA in the FMCSA Clearinghouse.</p><div class="completion-next-actions"><a class="btn btn-primary" href="/clearinghouse-setup.html">Continue to Clearinghouse Setup</a></div></div>
      </div>
    </section>
    <div class="completion-grid">
      <section class="card completion-panel"><div class="section-kicker">STATUS SUMMARY</div><h3>What’s on file</h3><div class="completion-status-grid">
        <div class="completion-status-item success"><span class="completion-status-label">Owner / driver information</span><strong>Locked & on file</strong><small>Changes require Support.</small></div>
        <div class="completion-status-item success"><span class="completion-status-label">Consortium agreement</span><strong>${agreementDone?"Signed":"Submitted"}</strong><small>${signedDate}</small></div>
        <div class="completion-status-item success"><span class="completion-status-label">Pre-employment requirement</span><strong>${preemploymentText}</strong><small>${proof?"Pending verification":testReq?"Scheduling pending":"Complete"}</small></div>
      </div></section>
      <section class="card completion-panel"><div class="section-kicker">NEXT ACTION</div><h3>Before you move forward</h3><p>In order for Workforce DOT | screenings4u to represent you, you must designate us as your C/TPA in the FMCSA Drug & Alcohol Clearinghouse.</p><ul class="completion-checklist"><li>Register or sign in to the FMCSA Clearinghouse</li><li>Search for <strong>Workforce DOT | screenings4u</strong></li><li>Designate us as your C/TPA</li><li>Return here and confirm the setup</li></ul><div class="completion-next-actions"><a class="btn btn-primary" href="/clearinghouse-setup.html">Go to Clearinghouse Setup</a><a class="btn btn-secondary" href="/dashboard.html">Go to Dashboard</a></div></section>
    </div>
   </div>`;
   return;
 }

 const company=esc(prefill.company_name||""),authorized=esc(prefill.authorized_name||""),industry=String(prefill.industry_code||"FMCSA").toUpperCase();
 const checked=v=>industry===v?'checked':'';
 const profileSection=profileDone?`
  <div class="card onboarding-step complete-step"><div class="status">Step 1 complete</div><h2>Owner / driver information</h2><p>Your identity, DOT operating information, and driver details are locked and on file. Contact Support if a correction is required.</p></div>`:`
  <div class="card onboarding-step profile-step-card" id="profile-step">
   <div class="step-kicker">STEP 1 · REQUIRED</div>
   <div class="profile-step-title"><div><h2>Owner / driver information</h2><p>Enter the information Workforce DOT will use for your Owner-Operator account and driver record.</p></div><div class="lock-tooltip" tabindex="0" title="After Step 1 is submitted, these fields are permanently locked in the portal. Contact Support if a correction is needed."><span>i</span><div class="lock-tooltip__bubble">After you submit Step 1, this information is locked and cannot be changed in the portal. Contact Support if a correction is required.</div></div></div>
   <div class="profile-lock-notice"><strong>Important:</strong> Verify everything carefully before continuing. Once submitted, your company name, business address, name, email, phone number, USDOT/MC information, operating scope, role and CDL details are locked. Only Support can correct them.</div>
   <form id="onboarding-profile-form" class="form-grid onboarding-profile-form">
    <div class="field full"><div class="subsection-title">Company information</div></div>
    <div class="field full"><label>Company Name <span class="req">*</span></label><input name="company_name" value="${esc(profilePrefill.company_name||'')}" required></div>
    <div class="field full"><label>Address <span class="req">*</span></label><input name="address_line1" value="${esc(profilePrefill.address_line1||'')}" autocomplete="street-address" required></div>
    <div class="field full"><label>Address (Suite, Building, Apt, etc.) <span class="optional">Optional</span></label><input name="address_line2" value="${esc(profilePrefill.address_line2||'')}" autocomplete="address-line2"></div>
    <div class="field"><label>City <span class="req">*</span></label><input name="city" value="${esc(profilePrefill.city||'')}" autocomplete="address-level2" required></div>
    <div class="field"><label>State <span class="req">*</span></label><select name="state" autocomplete="address-level1" required>${stateOptions(profilePrefill.state||'')}</select></div>
    <div class="field"><label>ZIP Code <span class="req">*</span></label><input name="postal_code" value="${esc(profilePrefill.postal_code||'')}" inputmode="numeric" autocomplete="postal-code" required></div>
    <div class="field full"><div class="subsection-title">Owner information</div></div>
    <div class="field"><label>First Name <span class="req">*</span></label><input name="first_name" value="${esc(profilePrefill.first_name||'')}" required></div>
    <div class="field"><label>Last Name <span class="req">*</span></label><input name="last_name" value="${esc(profilePrefill.last_name||'')}" required></div>
    <div class="field"><label>Email <span class="req">*</span></label><input type="email" name="email" value="${esc(profilePrefill.email||'')}" required></div>
    <div class="field"><label>Phone Number <span class="req">*</span></label><input type="tel" name="phone" value="${esc(profilePrefill.phone||'')}" inputmode="tel" autocomplete="tel" required></div>
    <div class="field"><label>USDOT Number <span class="req">*</span></label><input name="dot_number" value="${esc(profilePrefill.dot_number||'')}" inputmode="numeric" required></div>
    <div class="field"><label>Operation <span class="req">*</span></label><select name="operation_scope" required><option value="">Select operation</option><option value="interstate" ${profilePrefill.operation_scope==='interstate'?'selected':''}>Interstate</option><option value="intrastate" ${profilePrefill.operation_scope==='intrastate'?'selected':''}>Intrastate</option></select></div>
    <div class="field" id="mc-number-field"><label>MC Number <span id="mc-required" class="req" style="display:none">*</span> <span id="mc-optional" class="optional">Optional for Intrastate</span></label><input name="mc_number" value="${esc(profilePrefill.mc_number||'')}"></div>
    <div class="field"><label>Are you the Owner or the Driver? <span class="req">*</span></label><select name="role_capacity" required><option value="">Select role</option><option value="owner" ${profilePrefill.role_capacity==='owner'?'selected':''}>Owner</option><option value="driver" ${profilePrefill.role_capacity==='driver'?'selected':''}>Driver</option><option value="owner_driver" ${profilePrefill.role_capacity==='owner_driver'?'selected':''}>Owner &amp; Driver</option></select></div>
    <div class="field full conditional-driver-fields" id="owner-driver-fields" hidden><div class="subsection-title">Driver information</div><div class="form-grid nested-grid">
      <div class="field"><label>Driver First Name <span class="req">*</span></label><input name="driver_first_name" value="${esc(profilePrefill.driver_first_name||'')}"></div>
      <div class="field"><label>Driver Last Name <span class="req">*</span></label><input name="driver_last_name" value="${esc(profilePrefill.driver_last_name||'')}"></div>
      <div class="field"><label>CDL Number <span class="req">*</span></label><input name="driver_cdl_number" value="${esc(profilePrefill.driver_cdl_number||'')}"></div>
      <div class="field"><label>CDL State <span class="req">*</span></label><select name="driver_cdl_state">${stateOptions(profilePrefill.driver_cdl_state||'')}</select></div>
      <div class="field"><label>Date of Birth <span class="req">*</span></label><input type="date" name="driver_birthdate" value="${esc(profilePrefill.driver_birthdate||'')}"></div>
    </div></div>
    <div class="field full conditional-driver-fields" id="self-driver-fields" hidden><div class="subsection-title">Your CDL information</div><div class="form-grid nested-grid">
      <div class="field"><label>CDL Number <span class="req">*</span></label><input name="cdl_number" value="${esc(profilePrefill.cdl_number||'')}"></div>
      <div class="field"><label>CDL State <span class="req">*</span></label><select name="cdl_state">${stateOptions(profilePrefill.cdl_state||'')}</select></div>
      <div class="field"><label>Date of Birth <span class="req">*</span></label><input type="date" name="birthdate" value="${esc(profilePrefill.birthdate||'')}"></div>
    </div></div>
    <div class="field full"><div id="profile-step-msg" class="form-message" aria-live="polite"></div><button class="btn btn-primary" id="profile-step-submit" type="submit">Save & Lock Information</button></div>
   </form>
  </div>`;

 const agreementSection=agreementDone?`
  <div class="card onboarding-step complete-step"><div class="status">Step 2 complete</div><h2>Consortium Letter of Agreement</h2><p>Your signed agreement is on file${agreement?.signed_at?` from ${fmt(agreement.signed_at)}`:""}.</p></div>`:`
  <div class="agreement-doc card" id="agreement-step">
   <div class="agreement-brand"><img src="https://elpbnytpciqnbexiaebp.supabase.co/storage/v1/object/public/enterprise_branding/workforce-dot.png" alt="Workforce DOT"><div><strong>Workforce DOT, LLC</strong><span>A subsidiary of screenings4u, LLC</span><span>8537 S Pulaski Rd · Chicago, IL 60652</span><span>Ph: 773-245-7009 · Fax: 773-850-8094</span></div></div>
   <h2>Consortium Letter of Agreement</h2>
   <p>This Letter of Agreement is between the company identified below and <strong>Workforce DOT, LLC</strong>, a subsidiary of <strong>screenings4u, LLC</strong>. Workforce DOT, LLC administers the workforce DOT drug and alcohol testing program and related consortium services.</p>
   <p>Services are administered under 49 CFR Part 40 and the rules of the DOT agency applicable to your operation, including 49 CFR Part 382 for FMCSA-regulated motor carriers. Enrollment becomes effective only after the Agreement is accepted and all required enrollment conditions are satisfied.</p>
   <div class="agreement-callout"><strong>Pre-employment requirement:</strong> Before active random-pool enrollment, an Owner-Operator must have a qualifying negative DOT pre-employment drug test on file. You may upload an official negative result dated within the last 30 days. If you do not have one, you must order and complete a DOT drug test.</div>
   <form id="agreement-form" class="agreement-form">
    <section><h3>Company & regulatory program</h3><div class="form-grid"><div class="field full"><label>Company legal name</label><input class="locked-transfer-field" name="company_name" value="${esc(profilePrefill.company_name||company)}" readonly aria-readonly="true" required><div class="field-help">Transferred from Step 1 and locked.</div></div><div class="field full"><label>DOT industry / agency</label><div class="agency-grid">${['FMCSA','USCG','FRA','FAA','FTA','PHMSA'].map(v=>`<label class="check-card"><input type="radio" name="industry_code" value="${v}" ${checked(v)} required><span>${v}</span></label>`).join('')}<label class="check-card"><input type="radio" name="industry_code" value="OTHER" ${checked('OTHER')} required><span>Other</span></label></div></div><div class="field full" id="other-industry-field" style="display:${industry==='OTHER'?'block':'none'}"><label>Other industry</label><input name="other_industry"></div></div></section>
    <section><h3>Services provided</h3><ul class="agreement-list"><li>Random database and roster management</li><li>Random selection program administration</li><li>Testing arrangements through qualified collection sites and laboratories</li><li>MRO review and verification where applicable</li><li>Program certificates and statistical/MIS reporting support</li><li>Administrative support for DOT audits and compliance records</li></ul><p>Additional services—including pre-employment, post-accident, reasonable-suspicion, return-to-duty/follow-up testing, mobile collections, training, DOT physicals, policy services and other compliance services—may be purchased separately unless specifically included in your active plan.</p></section>
    <section class="initial-section"><h3>Required acknowledgments</h3><div class="initial-row"><p>Your company will be enrolled in the workforce DOT consortium/random testing program applicable to the selected agency.</p><label>Initials<input name="initials_consortium" maxlength="6" required></label></div><div class="initial-row"><p>Each enrolled driver or safety-sensitive employee must satisfy applicable pre-employment testing requirements before active enrollment.</p><label>Initials<input name="initials_preemployment" maxlength="6" required></label></div><div class="initial-row"><p>You must review and confirm your active roster when requested. Workforce DOT may rely on the most recently verified roster if an updated roster is not timely provided.</p><label>Initials<input name="initials_quarterly_list" maxlength="6" required></label></div><div class="initial-row"><p>You certify that roster information submitted to Workforce DOT is accurate and complete.</p><label>Initials<input name="initials_roster_accuracy" maxlength="6" required></label></div><div class="initial-row"><p>You are responsible for notifying drivers of required testing, promptly reporting unavailability or refusals, and taking required action after positive or refusal results.</p><label>Initials<input name="initials_testing_duties" maxlength="6" required></label></div></section>
    <section><h3>Program term & billing</h3><p>This Agreement is valid for one year from the signing date. Portal access and consortium administration are tied to an active annual Owner-Operator subscription.</p><div class="price-table"><div><strong>Basic Compliance</strong><span>$74.95 / year</span></div><div><strong>Consortium + Drug Test</strong><span>$125.95 / year</span></div><div><strong>Complete Compliance</strong><span>$149.95 / year</span></div></div></section>
    <section><h3>Electronic signature</h3><div class="form-grid"><div class="field"><label>Authorized name</label><input name="authorized_name" value="${authorized}" required></div><div class="field"><label>Title / capacity</label><input name="authorized_title" placeholder="Owner / Authorized Representative"></div><div class="field full"><label>Electronic signature</label><input name="electronic_signature" required placeholder="Type your full legal name"></div><div class="field full"><label class="agreement-consent"><input type="checkbox" name="accepted" value="yes" required><span>I have read this Letter of Agreement and certify that I am authorized to sign for the company.</span></label></div><div class="field full"><div id="agreement-msg" class="form-message" aria-live="polite"></div><button class="btn btn-primary" id="agreement-submit" type="submit">Accept Agreement & Continue</button></div></div></section>
   </form>
  </div>`;

 const proofSection=preemploymentDone?`<div class="card onboarding-step complete-step" id="preemployment"><div class="status">Step 3 complete</div><h2>Pre-employment drug test</h2><p>${d.preemployment_proof?"Your official negative result has been uploaded and is pending verification.":"Your included DOT 5-panel drug test request has been submitted for scheduling."}</p><div class="actions"><a class="btn btn-primary" href="/clearinghouse-setup.html">Continue to Clearinghouse Setup</a></div></div>`:`<div class="card onboarding-step" id="preemployment"><div class="step-kicker">STEP 3 · REQUIRED</div><h2>Pre-employment negative drug test</h2><p>Provide an official negative DOT drug test result dated within the last 30 days, or order a new DOT 5-panel urine drug test.</p><div class="choice-grid"><div class="choice-card"><h3>I have an official negative result</h3><p>Upload a PDF, PNG, or JPEG dated within the last 30 days.</p><form id="proof-form"><div class="field"><label>Test date</label><input type="date" name="test_date" required></div><div class="field"><label>Official result file</label><input type="file" name="proof_file" accept="application/pdf,image/png,image/jpeg" required></div><label class="agreement-consent"><input type="checkbox" name="certified" required><span>I certify this is an official copy showing a negative DOT drug test result for me.</span></label><div id="proof-msg" class="form-message"></div><button class="btn btn-primary" type="submit">Upload Official Result</button></form></div><div class="choice-card"><h3>I need to take a drug test</h3><p>${d.test_included?`Your <strong>${esc(prefill.plan_name||"current plan")}</strong> includes one pre-employment DOT drug test.`:`A pre-employment drug test is not included in your current plan. Purchase the DOT 5-panel test first.`}</p><a class="btn ${d.test_included?'btn-primary':'btn-secondary'}" href="${d.test_included?'/order-drug-test.html':esc(d.purchase_url||'/checkout.html?service=dot_5_panel_urine')}">${d.test_included?'Order Included Drug Test':'Purchase DOT Drug Test — $59.95'}</a></div></div></div>`;

 root.innerHTML=pageHead("REQUIRED ONBOARDING","Owner-Operator onboarding","Complete all three required steps before using the rest of the Owner-Operator portal.")+`<div class="onboarding-progress onboarding-progress--three"><div class="${profileDone?'done':'active'}"><span>1</span><strong>Owner / Driver Information</strong></div><div class="${agreementDone?'done':profileDone?'active':''}"><span>2</span><strong>Consortium Agreement</strong></div><div class="${preemploymentDone?'done':agreementDone?'active':''}"><span>3</span><strong>Pre-employment Test</strong></div></div><div class="agreement-wrap">${profileSection}${profileDone?agreementSection:''}${profileDone&&agreementDone?proofSection:''}</div>`;

 if(!profileDone){
   const form=document.getElementById('onboarding-profile-form'),msg=document.getElementById('profile-step-msg'),btn=document.getElementById('profile-step-submit'),scope=form.elements.operation_scope,role=form.elements.role_capacity,mc=form.elements.mc_number,ownerFields=document.getElementById('owner-driver-fields'),selfFields=document.getElementById('self-driver-fields'),mcReq=document.getElementById('mc-required'),mcOpt=document.getElementById('mc-optional');
   const syncScope=()=>{
     const interstate=scope.value==='interstate';
     mc.required=interstate;
     mc.setAttribute('aria-required',interstate?'true':'false');
     mcReq.style.display=interstate?'inline':'none';
     mcOpt.style.display=interstate?'none':'inline';
   };
   const setRequired=(box,on)=>box.querySelectorAll('input,select').forEach(x=>{x.required=on;x.disabled=!on});
   const showBox=(box,on)=>{box.hidden=!on;box.style.display=on?'block':'none';setRequired(box,on)};
   const syncRole=()=>{
     const v=role.value;
     showBox(ownerFields,v==='owner');
     showBox(selfFields,v==='driver'||v==='owner_driver');
   };
   scope.addEventListener('change',syncScope);
   role.addEventListener('change',syncRole);
   syncScope();
   syncRole();
   form.addEventListener('submit',async e=>{e.preventDefault();msg.textContent='Saving and locking information…';msg.className='form-message';btn.disabled=true;const profile=Object.fromEntries(new FormData(form).entries());try{const saved=await onboardingProfileApi('save',{profile});if(saved?.error)throw new Error(saved.error);state.onboardingProfile={...(await onboardingProfileApi('status')),completed:true,locked:true};msg.textContent='Information saved and locked.';msg.className='form-message success';await loadOnboarding()}catch(err){msg.textContent=err?.message||String(err);msg.className='form-message error';btn.disabled=false}});
 } else if(!agreementDone){
   const form=document.getElementById('agreement-form'),msg=document.getElementById('agreement-msg'),btn=document.getElementById('agreement-submit');
   form.querySelectorAll('input[name="industry_code"]').forEach(el=>el.addEventListener('change',()=>{document.getElementById('other-industry-field').style.display=el.value==='OTHER'&&el.checked?'block':'none'}));
   form.addEventListener('submit',async e=>{e.preventDefault();msg.textContent='Saving agreement…';msg.className='form-message';btn.disabled=true;const fd=new FormData(form),agreement=Object.fromEntries(fd.entries());agreement.accepted=fd.get('accepted')==='yes';try{const saved=await onboardingApi('complete_agreement',{agreement});if(saved?.error)throw new Error(saved.error);const verify=await onboardingApi('status');state.onboarding=verify;await loadOnboarding()}catch(err){msg.textContent=err?.message||String(err);msg.className='form-message error';btn.disabled=false}});
 } else if(!preemploymentDone){
   const form=document.getElementById('proof-form');form?.addEventListener('submit',async e=>{e.preventDefault();const msg=document.getElementById('proof-msg'),file=form.elements.proof_file.files?.[0],date=form.elements.test_date.value;if(!file)return;msg.textContent='Uploading official result…';msg.className='form-message';if(file.size>10*1024*1024){msg.textContent='File must be 10 MB or smaller.';msg.className='form-message error';return}try{const base64=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]||'');r.onerror=reject;r.readAsDataURL(file)});await onboardingApi('upload_result',{proof:{test_date:date,file_name:file.name,mime_type:file.type,file_base64:base64,certified:form.elements.certified.checked}});state.onboarding=await onboardingApi('status');await loadOnboarding()}catch(err){msg.textContent=err.message||String(err);msg.className='form-message error'}});
 }
}

async function loadDrugTestOrder(){
 const d=state.onboarding||await onboardingApi('status'),p=d.prefill||{},root=document.getElementById('page-content');
 if(d.preemployment_complete){navigatePortal('/onboarding.html',{replace:true});return}
 if(!d.agreement_completed){navigatePortal('/onboarding.html',{replace:true});return}
 const paidOrder=new URLSearchParams(location.search).get('order_id')||localStorage.getItem('s4u_owner_operator_paid_test_order')||'';
 if(!d.test_included&&!paidOrder){await navigatePortal(d.purchase_url||'/checkout.html?service=dot_5_panel_urine',{replace:true});return}
 root.innerHTML=pageHead(d.test_included?'INCLUDED TEST':'PAID TEST','Order your DOT 5-panel drug test','Order your DOT 5-panel drug test','Provide the information below. We will use your current or future location to identify the closest available collection site.')+`
 <div class="card order-test-card"><div class="agreement-callout"><strong>${d.test_included?'Included with '+esc(p.plan_name||'your plan'):'Paid DOT 5-panel drug test'}.</strong> ${d.test_included?'There is no additional charge for this included pre-employment test request.':'Your portal purchase has been received. Complete this form so Workforce DOT can schedule the closest available collection site.'}</div>
 <form id="drug-test-order-form"><div class="form-grid">
  <div class="field"><label>First name</label><input name="first_name" value="${esc(p.first_name||'')}" required></div><div class="field"><label>Last name</label><input name="last_name" value="${esc(p.last_name||'')}" required></div>
  <div class="field"><label>USDOT Number</label><input name="dot_number" value="${esc(p.dot_number||'')}" required></div><div class="field"><label>MC Number <span class="optional">Optional</span></label><input name="mc_number" value="${esc(p.mc_number||'')}"></div>
  <div class="field"><label>CDL Number</label><input name="cdl_number" value="${esc(p.cdl_number||'')}" required></div><div class="field"><label>CDL State</label><select name="cdl_state" required>${stateOptions(p.cdl_state||'')}</select></div>
  <div class="field"><label>Birthdate</label><input type="date" name="birthdate" value="${esc(p.birthdate||'')}" required></div>
  <div class="field full"><h3>Address on your CDL</h3></div><div class="field full"><label>Street address</label><input name="cdl_address_line1" value="${esc(p.cdl_address_line1||'')}" required></div><div class="field full"><label>Address line 2 <span class="optional">Optional</span></label><input name="cdl_address_line2" value="${esc(p.cdl_address_line2||'')}"></div><div class="field"><label>City</label><input name="cdl_city" value="${esc(p.cdl_city||'')}" required></div><div class="field"><label>State</label><select name="cdl_state_address" required>${stateOptions(p.cdl_state_address||'')}</select></div><div class="field"><label>ZIP code</label><input name="cdl_postal_code" value="${esc(p.cdl_postal_code||'')}" required></div>
  <div class="field full"><h3>Where are you now, or where will you be for testing?</h3><p class="field-help">Use the address where you are now or where you will be. We will use this location to schedule the closest available collection site.</p></div><div class="field full"><label>Street address</label><input name="current_address_line1" required></div><div class="field full"><label>Address line 2 <span class="optional">Optional</span></label><input name="current_address_line2"></div><div class="field"><label>City</label><input name="current_city" required></div><div class="field"><label>State</label><select name="current_state" required>${stateOptions('')}</select></div><div class="field"><label>ZIP code</label><input name="current_postal_code" required></div>
  <div class="field full"><div id="drug-test-order-msg" class="form-message"></div><div class="actions"><a class="btn btn-secondary" href="/onboarding.html">Back</a><button class="btn btn-primary" type="submit">Submit Test Order</button></div></div>
 </div></form></div>`;
 document.getElementById('drug-test-order-form').addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget,msg=document.getElementById('drug-test-order-msg'),btn=form.querySelector('button[type="submit"]');msg.textContent='Submitting your included test order…';msg.className='form-message';btn.disabled=true;try{const order=Object.fromEntries(new FormData(form).entries());await onboardingApi('create_test_order',{order,paid_order_id:paidOrder});msg.textContent='Your test request has been submitted. Opening your dashboard…';msg.className='form-message success';navigatePortal('/dashboard.html',{replace:true})}catch(err){msg.textContent=err.message||String(err);msg.className='form-message error';btn.disabled=false}});
}

async function loadCheckout(){
 const d=state.onboarding||await onboardingApi('status'),p=d.prefill||{},root=document.getElementById('page-content');
 if(d.preemployment_complete){navigatePortal('/onboarding.html',{replace:true});return}
 if(!d.agreement_completed){navigatePortal('/onboarding.html',{replace:true});return}
 if(d.test_included){await navigatePortal('/order-drug-test.html',{replace:true});return}
 root.innerHTML=pageHead('SECURE CHECKOUT','Purchase your DOT 5-panel drug test','Complete payment securely inside your Owner-Operator portal. You will remain in the portal for the entire process.')+`
 <div class="grid grid-2 checkout-portal-grid">
  <div class="card"><div class="step-kicker">DOT PRE-EMPLOYMENT TEST</div><h2>DOT 5-Panel Urine Drug Test</h2><p>Required when you do not have an acceptable official negative DOT drug-test result dated within the last 30 days.</p><div class="price-line"><strong>$59.95</strong><span>one-time</span></div><ul class="agreement-list"><li>DOT-regulated 5-panel urine test</li><li>Collection-site scheduling support</li><li>Results linked to your Owner-Operator account</li><li>Secure portal workflow</li></ul><div class="agreement-callout"><strong>Seller:</strong> Workforce DOT, LLC<br><span>A subsidiary of screenings4u, LLC</span></div></div>
  <div class="card"><h2>Secure payment</h2><p class="fine-print">Payment is processed securely by Stripe. Your card details are entered directly into Stripe's mounted payment form and are not stored by this portal.</p><div id="checkout-status" class="form-message">Loading secure payment form…</div><div id="portal-payment-element" class="stripe-mount"></div><div id="checkout-error" class="form-message error" hidden></div><button class="btn btn-primary" id="checkout-pay-btn" type="button" disabled>Pay $59.95</button><div class="actions"><a class="btn btn-secondary" href="/onboarding.html#preemployment">Back to Onboarding</a></div></div>
 </div>`;
 try{
   if(typeof window.Stripe!=='function')throw new Error('Stripe.js did not load. Refresh the page and try again.');
   const session=await edge('create-payment-intent',{surface:'owner_operator_portal',serviceId:'dot_5_panel_urine',customer:{firstName:p.first_name||'',lastName:p.last_name||'',email:''}});
   if(!session.clientSecret||!session.stripePublishableKey)throw new Error('Secure payment configuration is unavailable.');
   const stripe=window.Stripe(session.stripePublishableKey),elements=stripe.elements({clientSecret:session.clientSecret,appearance:{theme:'stripe',variables:{colorPrimary:'#ef6c00',colorText:'#173761',borderRadius:'10px'}}});
   const payment=elements.create('payment',{layout:'tabs'});payment.mount('#portal-payment-element');
   const statusEl=document.getElementById('checkout-status'),errEl=document.getElementById('checkout-error'),btn=document.getElementById('checkout-pay-btn');
   statusEl.textContent='Secure payment powered by Stripe.';btn.disabled=false;
   btn.addEventListener('click',async()=>{btn.disabled=true;errEl.hidden=true;statusEl.textContent='Processing payment…';const result=await stripe.confirmPayment({elements,confirmParams:{return_url:location.origin+'/checkout.html?payment=return&order_id='+encodeURIComponent(session.orderId)},redirect:'if_required'});if(result.error){errEl.textContent=result.error.message||'Payment could not be completed.';errEl.hidden=false;statusEl.textContent='Payment was not completed.';btn.disabled=false;return}const pi=result.paymentIntent;if(pi&&['succeeded','processing'].includes(pi.status)){localStorage.setItem('s4u_owner_operator_paid_test_order',session.orderId);statusEl.textContent=pi.status==='succeeded'?'Payment received. Continue to your test order.':'Payment is processing. You can continue once Stripe confirms it.';root.querySelector('.checkout-portal-grid').insertAdjacentHTML('afterend',`<div class="card agreement-complete" style="margin-top:18px"><div class="status">Payment received</div><h2>Continue inside your portal</h2><p>Your payment reference is <strong>${esc(session.orderNumber||session.orderId)}</strong>.</p><div class="actions"><a class="btn btn-primary" href="/order-drug-test.html?order_id=${encodeURIComponent(session.orderId)}">Continue to Test Order</a></div></div>`);btn.hidden=true}else{statusEl.textContent='Stripe is still confirming the payment.';btn.disabled=false}});
 }catch(err){console.error(err);const el=document.getElementById('checkout-status');if(el){el.textContent=err.message||String(err);el.className='form-message error'}}
}

async function loadClearinghouseSetup(){
 const d=state.clearinghouse||await clearinghouseApi("status"),root=document.getElementById("page-content");
 if(d.completed){
   root.innerHTML=pageHead("FMCSA CLEARINGHOUSE","C/TPA designation confirmed","Your Clearinghouse designation is confirmed. Your dashboard and portal navigation are now unlocked.")+`
   <div class="clearinghouse-page-wrap"><div class="card clearinghouse-complete"><div class="status">Confirmed</div><h2>Workforce DOT | screenings4u</h2><p>Your C/TPA designation checklist is complete.</p>${d.designation?.confirmed_at?`<p><strong>Confirmed:</strong> ${fmt(d.designation.confirmed_at)}</p>`:""}<div class="actions"><a class="btn btn-primary" href="/dashboard.html">Continue to Dashboard</a><a class="btn btn-secondary" target="_blank" rel="noopener noreferrer" href="https://clearinghouse.fmcsa.dot.gov/">Open FMCSA Clearinghouse</a></div></div></div>`;
   return;
 }
 root.innerHTML=pageHead("REQUIRED SETUP","Designate your C/TPA in the FMCSA Clearinghouse","Owner-operators must designate a C/TPA in the FMCSA Drug & Alcohol Clearinghouse. Complete the steps below, then confirm the designation in this portal.")+`
 <div class="clearinghouse-page-wrap"><div class="card clearinghouse-callout"><div class="status warn">Required before portal access</div><h2>Designate: Workforce DOT | screenings4u</h2><p>Use the exact C/TPA name shown above when searching in the Clearinghouse.</p><div class="actions"><a class="btn btn-primary" target="_blank" rel="noopener noreferrer" href="https://clearinghouse.fmcsa.dot.gov/register">Register / Sign Up</a><a class="btn btn-secondary" target="_blank" rel="noopener noreferrer" href="https://clearinghouse.fmcsa.dot.gov/">Log In to Clearinghouse</a><a class="btn btn-secondary" target="_blank" rel="noopener noreferrer" href="https://clearinghouse.fmcsa.dot.gov/Resource/Index/Clearinghouse-Designate-CTPA">Official FMCSA Instructions</a></div></div>
 <div class="card clearinghouse-checklist-card"><h2>Clearinghouse checklist</h2><ol class="setup-checklist"><li><strong>Register or log in as the employer/owner-operator.</strong><span>If you are registering, indicate that you are an owner-operator when the Clearinghouse asks.</span></li><li><strong>Open your Employer Dashboard.</strong><span>Under <em>My Dashboard</em>, go to <strong>Manage → C/TPAs</strong></span></li><li><strong>Search for Workforce DOT | screenings4u.</strong><span>Use the C/TPA search field and select our registered C/TPA listing.</span></li><li><strong>Click Designate.</strong><span>Add Workforce DOT | screenings4u to your designated C/TPAs.</span></li><li><strong>Authorize the required functions.</strong><span>Select <strong>Report Violations</strong>, <strong>Report RTD Information</strong>, and <strong>Conduct Queries</strong>.</span></li><li><strong>Click Save.</strong><span>The Clearinghouse sends the C/TPA a request to accept the designation.</span></li></ol></div>
 <form class="card clearinghouse-confirm" id="clearinghouse-confirm-form"><h2>Confirm your designation</h2><p>After saving the designation in the FMCSA Clearinghouse, complete this checklist. We will keep your portal confirmation on file while the Clearinghouse designation is accepted/verified.</p><label class="checkline"><input type="checkbox" name="designated" value="yes" required><span>I designated <strong>Workforce DOT | screenings4u</strong> as my C/TPA.</span></label><label class="checkline"><input type="checkbox" name="report_violations" value="yes" required><span>I authorized <strong>Report Violations</strong>.</span></label><label class="checkline"><input type="checkbox" name="report_rtd" value="yes" required><span>I authorized <strong>Report RTD Information</strong>.</span></label><label class="checkline"><input type="checkbox" name="conduct_queries" value="yes" required><span>I authorized <strong>Conduct Queries</strong>.</span></label><label class="checkline"><input type="checkbox" name="certify" value="yes" required><span>I certify that I completed and saved these selections in the FMCSA Clearinghouse.</span></label><div id="clearinghouse-msg" class="form-message"></div><div class="actions"><button class="btn btn-primary" type="submit">Confirm Clearinghouse Setup</button></div></form></div>`;
 const form=document.getElementById("clearinghouse-confirm-form"),msg=document.getElementById("clearinghouse-msg");
 form.addEventListener("submit",async e=>{e.preventDefault();const btn=form.querySelector('button[type="submit"]'),fd=new FormData(form);msg.textContent="Saving your Clearinghouse confirmation…";msg.className="form-message";btn.disabled=true;try{const designation={designated:fd.get("designated")==="yes",report_violations:fd.get("report_violations")==="yes",report_rtd:fd.get("report_rtd")==="yes",conduct_queries:fd.get("conduct_queries")==="yes",certify:fd.get("certify")==="yes"};const saved=await clearinghouseApi("confirm",{designation});if(saved?.error)throw new Error(saved.error);state.clearinghouse={...(state.clearinghouse||{}),...saved,completed:true,designation:saved.designation||state.clearinghouse?.designation||null};state.onboarding={...(state.onboarding||{}),completed:true};syncActiveNav();msg.textContent="Clearinghouse designation confirmed. Your dashboard and portal navigation are now unlocked.";msg.className="form-message success";await navigatePortal("/dashboard.html",{replace:true})}catch(err){msg.textContent=err?.message||String(err);msg.className="form-message error";btn.disabled=false}});
}

async function loadDashboard(){
 const d=await owner("overview");
 const ownerObj=d.owner||{};
 const testing=d.testing||[], compliance=d.compliance||[], docs=(d.document_packets||d.documents||[]).filter(x=>String(x.document_status||x.status||"published").toLowerCase()==="published"), programs=d.programs||[], drivers=d.drivers||[];
 const activeCons=(d.consortium_enrollments||[]).filter(x=>["active","eligible"].includes(String(x.status||x.eligibility_status).toLowerCase())).length;
 const deadlineCell=x=>{
   if(!x.collection_deadline)return '<span class="deadline-empty">Not set</span>';
   const deadline=new Date(x.collection_deadline),done=["completed","final_result","closed","cancelled"].includes(String(x.status||"").toLowerCase()),late=!done&&Number.isFinite(deadline.getTime())&&deadline.getTime()<Date.now();
   return `<span class="test-deadline${late?" overdue":""}">${esc(fmt(x.collection_deadline))}${late?' <small>Overdue</small>':''}</span>`;
 };
 document.getElementById("page-content").innerHTML=
  `<div class="dashboard-view">`+
  pageHead("OWNER-OPERATOR DOT WORKSPACE","Your DOT program at a glance","A single-driver workspace for program status, consortium participation, testing, results, documents and follow-up activity.")+
  `<div class="notice"><strong>FMCSA owner-operator workflow:</strong> keep your consortium/random-pool participation, testing activity and program records visible in one place. This software supports administration and recordkeeping; it is not legal advice.</div>
  <div class="grid grid-4 dashboard-metrics" style="margin-top:16px">
    <div class="card metric"><div class="label">Driver records</div><div class="value">${drivers.length}</div></div>
    <div class="card metric"><div class="label">Active DOT programs</div><div class="value">${programs.filter(x=>x.status==="active").length}</div></div>
    <div class="card metric"><div class="label">Active consortium enrollments</div><div class="value">${activeCons}</div></div>
    <div class="card metric"><div class="label">Open compliance items</div><div class="value">${compliance.filter(x=>!["resolved","closed"].includes(String(x.status))).length}</div></div>
  </div>
  <div class="grid grid-2 dashboard-sections" style="margin-top:16px">
    <div class="card"><h2>Recent testing</h2>${table(["Order","Reason","Test","Status","Must test by","Created"],testing.slice(0,8).map(x=>`<tr><td>${esc(x.order_number||x.id)}</td><td>${esc(x.reason)}</td><td>${esc(x.test_type)}</td><td>${status(x.status)}</td><td>${deadlineCell(x)}</td><td>${fmt(x.created_at)}</td></tr>`))}</div>
    <div class="card"><h2>Program documents</h2>${table(["Document","Status","Valid until","Download"],docs.slice(0,8).map(x=>`<tr><td>${esc(x.title||x.display_title||x.file_name||"DOT Document")}</td><td>${status(x.document_status||x.status||"published")}</td><td>${fmt(x.valid_until||x.expires_on)}</td><td><button class="btn btn-primary dashboard-doc-download" type="button" data-id="${esc(x.id)}" data-source="${esc(x.source_type||"dot_document")}">Download PDF</button></td></tr>`))}</div>
  </div></div>`;
 document.querySelectorAll(".dashboard-doc-download").forEach(btn=>btn.addEventListener("click",async()=>{
   try{btn.disabled=true;const doc=await getDocumentDetail(btn.dataset.id,btn.dataset.source);await downloadDocumentPdf(doc)}
   catch(e){window.S4UDialog?.alert?window.S4UDialog.alert(e.message||String(e)):alert(e.message||e)}
   finally{btn.disabled=false}
 }));
}

async function loadProfile(){
 const [d,onboardingProfile]=await Promise.all([owner("profile"),onboardingProfileApi("status").catch(()=>null)]), o=d.owner||d.profile||{}, onboardingPrefill=onboardingProfile?.prefill||{};
 const profileState=onboardingPrefill.state||o.state||o.metadata?.state||"";
 document.getElementById("page-content").innerHTML=pageHead("ACCOUNT","Company profile","View the locked company information associated with your Owner-Operator account.")+
 `<div class="card">
   <div class="readonly-profile-notice"><strong>Read-only account information</strong><span>Owner-Operator company information is locked after onboarding. To request a correction, contact Support.</span><a class="btn btn-secondary" href="/support.html">Contact Support</a></div>
   <div class="form-grid readonly-profile-grid" aria-label="Locked company profile">
     <div class="field"><label>Legal name</label><input value="${esc(o.legal_name)}" readonly aria-readonly="true"></div>
     <div class="field"><label>DBA</label><input value="${esc(o.dba_name)}" readonly aria-readonly="true"></div>
     <div class="field"><label>USDOT number</label><input value="${esc(o.dot_number)}" readonly aria-readonly="true"></div>
     <div class="field"><label>MC number</label><input value="${esc(o.mc_number)}" readonly aria-readonly="true"></div>
     <div class="field"><label>Email</label><input type="email" value="${esc(o.email)}" readonly aria-readonly="true"></div>
     <div class="field"><label>Phone</label><input value="${esc(o.phone)}" readonly aria-readonly="true"></div>
     <div class="field"><label>State</label><input value="${esc(profileState)}" placeholder="Not on file" readonly aria-readonly="true"></div>
     <div class="field"><label>Vehicles</label><input value="${esc(o.vehicle_count||1)}" readonly aria-readonly="true"></div>
   </div>
 </div>`;
}

async function loadDrivers(){
 const d=await owner("drivers"), rows=d.drivers||[],root=document.getElementById("page-content");
 root.innerHTML=pageHead("DRIVER","Driver record","View the driver records associated with your Owner-Operator account and send the official FMCSA limited-query consent form.")+
 `<div class="notice"><strong>FMCSA consent:</strong> The form sent here is the official FMCSA sample for <strong>general consent to limited Clearinghouse queries</strong>. Full and pre-employment queries require the driver to provide specific electronic consent inside the FMCSA Clearinghouse.</div>`+
 table(["Name","Employee #","Status","CDL","State","DOT agency","Consent"],rows.map(x=>`<tr><td>${esc([x.first_name,x.last_name].filter(Boolean).join(" "))}</td><td>${esc(x.employee_number)}</td><td>${status(x.employment_status)}</td><td>${esc(x.cdl_number)}</td><td>${esc(x.cdl_state)}</td><td>${esc(x.dot_agency||"FMCSA")}</td><td><button class="btn btn-secondary driver-consent-btn" data-driver-id="${esc(x.id)}" data-driver-name="${esc([x.first_name,x.last_name].filter(Boolean).join(" "))}" data-driver-email="${esc(x.email||'')}">Send Consent Form</button></td></tr>`))+
 `<div class="popup" id="driver-consent-popup"><div class="popup-card"><div class="section-kicker">FMCSA CLEARINGHOUSE</div><h2>Send limited-query consent form</h2><p id="driver-consent-copy">Send the official FMCSA sample general consent form to this driver.</p><form id="driver-consent-form" class="form-grid"><input type="hidden" name="driver_id"><div class="field full"><label>Driver email</label><input type="email" name="email" required autocomplete="email"></div><div class="field full"><div id="driver-consent-msg" class="form-message"></div><div class="actions"><button class="btn btn-primary" type="submit">Send FMCSA Consent Form</button><button class="btn btn-secondary" type="button" id="driver-consent-cancel">Cancel</button></div></div></form></div></div>`;
 const pop=document.getElementById('driver-consent-popup'),form=document.getElementById('driver-consent-form'),msg=document.getElementById('driver-consent-msg'),copy=document.getElementById('driver-consent-copy');
 document.querySelectorAll('.driver-consent-btn').forEach(btn=>btn.addEventListener('click',()=>{form.elements.driver_id.value=btn.dataset.driverId||'';form.elements.email.value=btn.dataset.driverEmail||'';copy.textContent=`Send the official FMCSA sample general consent form to ${btn.dataset.driverName||'this driver'}.`;msg.textContent='';msg.className='form-message';pop.classList.add('open');form.elements.email.focus()}));
 document.getElementById('driver-consent-cancel')?.addEventListener('click',()=>pop.classList.remove('open'));
 form?.addEventListener('submit',async e=>{e.preventDefault();const btn=form.querySelector('button[type="submit"]');btn.disabled=true;msg.textContent='Sending consent form…';msg.className='form-message';try{const payload=Object.fromEntries(new FormData(form).entries());await edge('owner-operator-driver-consent',{action:'send_limited_query_consent',...payload});msg.textContent='FMCSA consent form sent.';msg.className='form-message success';deletePageCache('owner:drivers');setTimeout(()=>pop.classList.remove('open'),800)}catch(err){msg.textContent=err?.message||String(err);msg.className='form-message error'}finally{btn.disabled=false}});
}

async function loadPrograms(){
 const d=await owner("programs"), rows=d.programs||[];
 document.getElementById("page-content").innerHTML=pageHead("DOT PROGRAM","Program administration","Review your DOT program and driver enrollment.")+
 table(["Program","Type","Agency","Status","Created"],rows.map(x=>`<tr><td>${esc(x.name)}</td><td>${esc(x.program_type)}</td><td>${esc(x.dot_agency)}</td><td>${status(x.status)}</td><td>${fmt(x.created_at)}</td></tr>`));
}

async function loadConsortium(){
 const d=await owner("consortium");
 const enroll=d.enrollments||d.consortium_enrollments||[], pools=d.pools||[];
 document.getElementById("page-content").innerHTML=
 pageHead("RANDOM TESTING","Consortium / Random Pool","Owner-operators generally participate in a consortium for random testing. Track your enrollment and pool-related records here.")+
 `<div class="notice">Your C/TPA or consortium may administer random testing and related program functions. Keep the enrollment status and supporting documents current.</div>
 <div class="grid grid-2" style="margin-top:18px">
 <div class="card"><h2>Consortium enrollment</h2>${table(["Status","Agency","Effective","Expires"],enroll.map(x=>`<tr><td>${status(x.status)}</td><td>${esc(x.dot_agency||"FMCSA")}</td><td>${fmt(x.effective_date)}</td><td>${fmt(x.expiration_date)}</td></tr>`))}</div>
 <div class="card"><h2>Pool information</h2>${table(["Pool","Status","Agency"],pools.map(x=>`<tr><td>${esc(x.name||x.pool_name||x.id)}</td><td>${status(x.status)}</td><td>${esc(x.dot_agency||"FMCSA")}</td></tr>`))}</div>
 </div>`;
}

async function loadTesting(){
 const d=await owner("testing"), rows=d.testing||d.orders||[];
 document.getElementById("page-content").innerHTML=pageHead("TESTING","Testing activity","Track testing orders and status for your Owner-Operator program.")+
 table(["Order","Reason","Test type","Status","Deadline","Created"],rows.map(x=>`<tr><td>${esc(x.order_number||x.id)}</td><td>${esc(x.reason)}</td><td>${esc(x.test_type)}</td><td>${status(x.status)}</td><td>${fmt(x.collection_deadline)}</td><td>${fmt(x.created_at)}</td></tr>`));
}

async function loadResults(){
 const d=await owner("results"), rows=d.results||[];
 document.getElementById("page-content").innerHTML=pageHead("RESULTS","Testing results","View result summaries made available to your account.")+
 table(["Order","Result","MRO status","Result date"],rows.map(x=>`<tr><td>${esc(x.order_number||x.testing_order_id)}</td><td>${esc(x.final_status||x.verified_result||x.preliminary_status)}</td><td>${esc(x.mro_status)}</td><td>${fmt(x.result_date||x.finalized_at)}</td></tr>`));
}

async function loadCompliance(){
 const d=await owner("compliance"), rows=d.cases||d.compliance||[];
 document.getElementById("page-content").innerHTML=pageHead("COMPLIANCE","Compliance work","Track program issues, deadlines and follow-up activity.")+
 table(["Case","Event","Priority","Status","Due"],rows.map(x=>`<tr><td>${esc(x.case_number||x.id)}</td><td>${esc(x.event_type)}</td><td>${esc(x.priority)}</td><td>${status(x.status)}</td><td>${fmt(x.compliance_due_at)}</td></tr>`));
}

async function loadRTD(){
 const d=await owner("rtd"), rows=d.cases||d.rtd||d.follow_up_tests||[];
 document.getElementById("page-content").innerHTML=pageHead("RETURN-TO-DUTY","RTD / Follow-up","Track return-to-duty and follow-up records where applicable.")+
 table(["Type","Status","Due","Completed"],rows.map(x=>`<tr><td>${esc(x.test_type||x.event_type||x.reason)}</td><td>${status(x.status)}</td><td>${fmt(x.due_date||x.scheduled_for)}</td><td>${fmt(x.completed_at)}</td></tr>`));
}

async function loadDocuments(){
 const d=await owner("documents"), rows=(d.documents||d.packets||d.document_packets||[]).filter(x=>{const s=String(x.document_status||x.status||"published").toLowerCase();return s!=="draft"&&s!=="archived"});
 const docStatus=(x)=>x.document_status||x.status||"published";
 const title=(x)=>x.display_title||x.title||x.name||x.file_name||"Document";
 document.getElementById("page-content").innerHTML=pageHead("DOCUMENTS","Program documents","View and download onboarding documents and records published to your Owner-Operator portal.")+
 table(["Document","Type","Status","Updated","Valid until","Actions"],rows.map(x=>`<tr><td><strong>${esc(title(x))}</strong></td><td>${esc(x.document_type||x.packet_type||"document")}</td><td>${status(docStatus(x))}</td><td>${fmt(x.updated_at||x.signed_at||x.uploaded_at)}</td><td>${fmt(x.valid_until||x.expires_on)}</td><td><div class="doc-actions"><button class="btn btn-secondary doc-view-btn" type="button" data-id="${esc(x.id)}" data-source="${esc(x.source_type||"dot_document")}">View</button><button class="btn btn-primary doc-download-btn" type="button" data-id="${esc(x.id)}" data-source="${esc(x.source_type||"dot_document")}">Download PDF</button></div></td></tr>`));
 bindDocumentActions();
}

const WORKFORCE_DOT_LOGO="https://elpbnytpciqnbexiaebp.supabase.co/storage/v1/object/public/enterprise_branding/workforce-dot.png";
const WORKFORCE_DOT_WHITE_LOGO="https://elpbnytpciqnbexiaebp.supabase.co/storage/v1/object/public/enterprise_branding/workforce-dot2.png";
function docMergeFields(doc){
 const ctx=state.context||{},owner=ctx.owner_operator||{},employer=ctx.employer||{},org=ctx.organization||{},meta=owner.metadata||{},dm=doc.metadata||{};
 const company=doc.recipient_name||doc.company_name||meta.company_name||owner.legal_name||employer.legal_name||org.legal_name||"—";
 const line1=meta.address_line1||employer.address_line1||org.address_line1||"";
 const line2=meta.address_line2||employer.address_line2||org.address_line2||"";
 const city=meta.city||employer.city||org.city||"";
 const region=meta.state||owner.state||employer.state||org.state_region||"";
 const postal=meta.postal_code||employer.postal_code||org.postal_code||"";
 const locality=[city,region].filter(Boolean).join(", ")+(postal?` ${postal}`:"");
 const address=[line1,line2,locality].filter(Boolean).join("<br>")||"—";
 const niceDate=(v)=>{if(!v)return"—";const x=new Date(v);return Number.isNaN(x.getTime())?String(v):x.toLocaleDateString("en-US",{year:"numeric",month:"numeric",day:"numeric"})};
 const rawDate=doc.pushed_at||doc.updated_at||doc.signed_at||doc.uploaded_at||new Date().toISOString();
 const date=niceDate(rawDate);
 const effective=doc.effective_date||dm.effective_date||doc.pushed_at||doc.updated_at||doc.uploaded_at||rawDate;
 const expiration=doc.valid_until||doc.expires_on||doc.expires_at||dm.expiration_date||dm.valid_until||(()=>{const x=new Date(effective);if(Number.isNaN(x.getTime()))return null;x.setFullYear(x.getFullYear()+1);return x.toISOString()})();
 return {
   date,company_name:company,company,usdot:owner.dot_number||employer.dot_number||"—",dot_number:owner.dot_number||employer.dot_number||"—",
   mc_number:owner.mc_number||employer.mc_number||"—",address,address_line1:line1||"—",address_line2:line2||"",city:city||"—",state:region||"—",zip:postal||"—",postal_code:postal||"—",
   email:owner.email||org.primary_email||"—",phone:owner.phone||employer.phone||org.phone||"—",owner_name:[meta.owner_first_name,meta.owner_last_name].filter(Boolean).join(" ")||"—",
   effective_date:niceDate(effective),expiration_date:niceDate(expiration),valid_until:niceDate(expiration),tracking_number:trackingNumberValue(doc),document_title:doc.title||doc.display_title||doc.file_name||'Document'
 };
}
function isCertificateDocument(doc){return String(doc?.document_type||"")==="consortium_certificate"||/certificate-landscape/i.test(String(doc?.html_content||""))||String(doc?.metadata?.template||"")==="consortium_certificate"}
function trackingNumberValue(doc){const existing=doc?.metadata?.tracking_number||doc?.tracking_number||'';if(existing)return String(existing);const rawDate=doc?.pushed_at||doc?.updated_at||doc?.signed_at||doc?.uploaded_at||new Date().toISOString();const d=new Date(rawDate);const stamp=(Number.isNaN(d.getTime())?new Date():d).toISOString().slice(0,10).replace(/-/g,'');const seed=String(doc?.id||((globalThis.crypto&&typeof globalThis.crypto.randomUUID==='function')?globalThis.crypto.randomUUID():Math.random().toString(36).slice(2,10))).replace(/[^a-z0-9]/gi,'').toUpperCase();return `WFDOT-${stamp}-${(seed||'DOC00000').slice(0,8).padEnd(8,'0')}`}
function isTrackableDocument(doc){const template=String(doc?.metadata?.template||'').trim(),type=String(doc?.document_type||doc?.source_type||'').trim();return isCertificateDocument(doc)||['consortium_letter','consortium_agreement'].includes(type)||['consortium_letter','agreement'].includes(template)}
function securityFooterText(doc){const name=doc.title||doc.display_title||doc.file_name||((doc.source_type==='consortium_agreement'||doc.document_type==='consortium_agreement')?'Owner-Operator Consortium Agreement':'DOT Document');return `Workforce DOT, LLC · ${trackingNumberValue(doc)} - ${name}`}
function withSecurityWrapper(doc,inner,certificate){const trackable=isTrackableDocument(doc),watermark=trackable?`<div class="document-watermark" aria-hidden="true"><img src="${WORKFORCE_DOT_LOGO}" alt=""></div>`:'',head=trackable&&!certificate?`<div class="document-security-top"><span>Tracking Number: ${esc(trackingNumberValue(doc))}</span><span>Issued: ${esc(fmt(doc.pushed_at||doc.updated_at||doc.signed_at||doc.uploaded_at))}</span></div>`:'',foot=trackable&&!certificate?`<div class="document-security-bottom">${esc(securityFooterText(doc))}</div>`:'';return `<div class="document-security-shell${trackable?' is-trackable':''}">${watermark}${head}${inner}${foot}</div>`}
function ensureCertificateSecurityMarkup(html,doc){let out=String(html||'');const tracking=esc(trackingNumberValue(doc)),footer=esc(securityFooterText(doc));if(!/certificate-tracking/.test(out)&&/certificate-issued/.test(out))out=out.replace('<div class="certificate-issued">',`<div class="certificate-tracking"><span>Tracking Number</span><strong>${tracking}</strong></div><div class="certificate-issued">`);if(/certificate-footerline/i.test(out))out=out.replace(/<div class="certificate-footerline">[\s\S]*?<\/div>/i,`<div class="certificate-footerline">${footer}</div>`);else out=out.replace(/<\/div>\s*<\/div>\s*$/i,`<div class="certificate-footerline">${footer}</div></div></div>`);return out}
function mergeDocumentTemplate(html,doc){
 const fields=docMergeFields(doc);
 let merged=String(html||"").replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi,(m,k)=>Object.prototype.hasOwnProperty.call(fields,k)?String(fields[k]):m);
 if(isCertificateDocument(doc))merged=ensureCertificateSecurityMarkup(merged,doc);
 return merged;
}
function documentFooterText(doc){
 const fields=docMergeFields(doc);
 const company=fields.company_name&&fields.company_name!=="—"?fields.company_name:"Owner-Operator";
 const name=doc.title||doc.display_title||doc.file_name||((doc.source_type==="consortium_agreement"||doc.document_type==="consortium_agreement")?"Owner-Operator Consortium Agreement":"DOT Document");
 return isTrackableDocument(doc)?securityFooterText(doc):`Workforce DOT, LLC · ${company} - ${name}`;
}
function documentBodyHtml(doc){
 if(doc.source_type==="consortium_agreement"||doc.document_type==="consortium_agreement"){
   const snap=doc.agreement_snapshot||{},track=trackingNumberValue(doc);
   const inner=`<div class="doc-sheet"><div class="document-watermark" aria-hidden="true"><img src="${WORKFORCE_DOT_LOGO}" alt=""></div><div class="doc-brand"><img src="${WORKFORCE_DOT_WHITE_LOGO}" alt="Workforce DOT"></div><div class="document-security-top"><span>Tracking Number: ${esc(track)}</span><span>Executed: ${esc(fmt(doc.signed_at))}</span></div><h1>Owner-Operator Consortium Agreement</h1><div class="doc-meta-grid"><div><span>Company</span><strong>${esc(doc.company_name||snap.company_name||"—")}</strong></div><div><span>Status</span><strong>${esc(doc.status||"accepted")}</strong></div><div><span>Signed</span><strong>${fmt(doc.signed_at)}</strong></div><div><span>Effective</span><strong>${fmt(doc.effective_date)}</strong></div><div><span>Valid until</span><strong>${fmt(doc.expires_on)}</strong></div><div><span>Plan</span><strong>${esc(doc.plan_name||doc.plan_code||"—")}</strong></div></div><hr><p><strong>Authorized signer:</strong> ${esc(doc.authorized_name||"—")}${doc.authorized_title?` · ${esc(doc.authorized_title)}`:""}</p><p><strong>Electronic signature:</strong> ${esc(doc.electronic_signature||"—")}</p><p><strong>Consortium participation:</strong> ${esc(doc.initials_consortium||"—")}</p><p><strong>Pre-employment testing:</strong> ${esc(doc.initials_preemployment||"—")}</p><p><strong>Quarterly list acknowledgement:</strong> ${esc(doc.initials_quarterly_list||"—")}</p><p><strong>Roster accuracy acknowledgement:</strong> ${esc(doc.initials_roster_accuracy||"—")}</p><p><strong>Testing duties acknowledgement:</strong> ${esc(doc.initials_testing_duties||"—")}</p><div class="document-security-bottom">${esc(securityFooterText(doc))}</div></div>`;
   return inner;
 }
 const certificate=isCertificateDocument(doc);
 if(certificate){
   const f=docMergeFields(doc),track=trackingNumberValue(doc),title=doc.title||doc.display_title||"Consortium Enrollment Certificate";
   return `<div class="doc-sheet certificate-sheet professional-certificate"><div class="certificate-watermark" aria-hidden="true"><img src="${WORKFORCE_DOT_LOGO}" alt=""></div><div class="certificate-topbrand"><img src="${WORKFORCE_DOT_LOGO}" alt="Workforce DOT"><span>OFFICIAL DOT ENROLLMENT CERTIFICATE</span></div><div class="certificate-frame"><div class="certificate-inner"><div class="certificate-kicker">WORKFORCE DOT · CONSORTIUM ENROLLMENT</div><div class="certificate-title">CERTIFICATE</div><div class="certificate-subtitle">OF ENROLLMENT</div><div class="certificate-rule"></div><div class="certificate-reg">Department of Transportation · 49 CFR Part 40</div><div class="certificate-program">Random Drug &amp; Alcohol Testing Consortium</div><div class="certificate-presented">This certificate is presented to</div><div class="certificate-company">${esc(f.company_name)}</div><div class="certificate-usdot">USDOT #${esc(f.usdot)}</div><p class="certificate-copy">Workforce DOT, LLC hereby certifies that the above-named Company has enrolled in our consortium-administered random drug/alcohol testing program as mandated by the DOT 49 CFR Part 40.</p><div class="certificate-dates"><div><span>Effective Date</span><strong>${esc(f.effective_date)}</strong></div><div><span>Valid Through</span><strong>${esc(f.expiration_date)}</strong></div></div><div class="certificate-tracking"><span>Tracking Number</span><strong>${esc(track)}</strong></div><div class="certificate-issued"><strong>Issued by Workforce DOT, LLC</strong><span>Consortium / Third-Party Administrator</span></div><div class="certificate-footerline">${esc(`Workforce DOT, LLC · ${track} - ${title}`)}</div></div></div></div>`;
 }
 const body=doc.html_content?mergeDocumentTemplate(doc.html_content,doc):`<pre>${esc(doc.plain_text||"Document content is not available for preview.")}</pre>`;
 const trackable=isTrackableDocument(doc),watermark=trackable?`<div class="document-watermark" aria-hidden="true"><img src="${WORKFORCE_DOT_LOGO}" alt=""></div>`:"",security=trackable?`<div class="document-security-top"><span>Tracking Number: ${esc(trackingNumberValue(doc))}</span><span>Issued: ${esc(fmt(doc.pushed_at||doc.updated_at||doc.uploaded_at))}</span></div>`:"",securityBottom=trackable?`<div class="document-security-bottom">${esc(securityFooterText(doc))}</div>`:`<div class="doc-legal">${esc(documentFooterText(doc))}</div>`;
 return `<div class="doc-sheet">${watermark}<div class="doc-brand"><img src="${WORKFORCE_DOT_WHITE_LOGO}" alt="Workforce DOT"></div>${security}<h1>${esc(doc.title||doc.file_name||"DOT Document")}</h1><div class="doc-rendered-content">${body}</div>${securityBottom}</div>`;
}

async function getDocumentDetail(id,source){
 const d=await owner("document_detail",{document_id:id,source_type:source});
 return d.document||d;
}

function ensureDocumentViewer(){
 let el=document.getElementById("document-viewer-dialog");
 if(el)return el;
 el=document.createElement("dialog");
 el.id="document-viewer-dialog";el.className="doc-dialog";
 el.innerHTML=`<div class="doc-dialog-panel" role="document"><div class="doc-dialog-head"><strong id="doc-modal-title">Document</strong><div class="doc-actions"><button type="button" class="btn btn-primary" id="doc-modal-download">Download PDF</button><button type="button" class="btn btn-secondary" data-close-doc>Close</button></div></div><div class="doc-dialog-body"><iframe id="doc-view-frame" title="Document viewer" sandbox="allow-same-origin"></iframe></div></div>`;
 document.body.appendChild(el);
 const close=()=>{try{el.close()}catch{} document.body.classList.remove("doc-modal-open")};
 el.querySelector("[data-close-doc]")?.addEventListener("click",close);
 el.addEventListener("click",e=>{if(e.target===el)close()});
 el.addEventListener("cancel",e=>{e.preventDefault();close()});
 return el;
}

function documentViewerSrcdoc(doc){
 const body=documentBodyHtml(doc),certificate=isCertificateDocument(doc);
 return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
 *{box-sizing:border-box}html,body{margin:0;padding:0;background:#eef3f8;font-family:Arial,Helvetica,sans-serif;color:#183653}body{padding:24px}img{max-width:100%!important;height:auto!important}.doc-sheet{width:min(760px,100%);margin:0 auto;background:#fff;padding:38px 42px;box-sizing:border-box;color:#183653;font-size:14px;line-height:1.55;box-shadow:0 2px 12px rgba(16,47,85,.08)}.doc-sheet h1{font-size:26px;line-height:1.2;color:#102f55;margin:14px 0 20px}.doc-brand{background:#102f55;margin:-38px -42px 26px;padding:20px 28px}.doc-brand img{display:block;max-width:210px!important;max-height:58px!important;object-fit:contain}.doc-meta-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-bottom:20px}.doc-meta-grid>div{border:1px solid #dce5ef;border-radius:9px;padding:10px 12px}.doc-meta-grid span{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#6b7f93;margin-bottom:4px}.doc-meta-grid strong{color:#102f55}.doc-rendered-content{overflow-wrap:anywhere}.doc-rendered-content table{max-width:100%!important}.doc-rendered-content img{max-width:100%!important;height:auto!important}.doc-legal{margin-top:28px;padding-top:16px;border-top:1px solid #dce5ef;font-size:11px;color:#708197}.document-security-shell{position:relative;overflow:hidden}.document-security-shell>*{position:relative;z-index:1}.document-watermark{position:absolute;inset:74px 24px 36px;display:flex;align-items:center;justify-content:center;pointer-events:none;opacity:.065;z-index:0}.document-watermark img{max-width:72%!important;max-height:72%!important;object-fit:contain;filter:grayscale(100%)}.document-security-top{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;padding:0 0 12px;border-bottom:1px solid #dce5ef;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;color:#617389}.document-security-bottom{margin-top:18px;padding-top:12px;border-top:1px solid #dce5ef;font-size:10px;color:#708197;letter-spacing:.05em;text-align:center}.certificate-tracking{display:flex;justify-content:center;gap:10px;align-items:baseline;margin:0 0 12px}.certificate-tracking span{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#7b8ca0}.certificate-tracking strong{font-size:14px;color:#173f75}
 .certificate-sheet{width:1056px;max-width:1056px;min-height:816px;padding:36px 44px;box-shadow:0 3px 16px rgba(16,47,85,.12)}.certificate-topbrand{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #24467f;padding-bottom:12px;margin-bottom:18px}.certificate-topbrand img{width:190px!important;max-height:54px!important;object-fit:contain;object-position:left center}.certificate-topbrand span{font-size:10px;font-weight:900;letter-spacing:.13em;color:#f47b20}.certificate-landscape{height:670px;border:8px double #24467f;padding:10px;background:linear-gradient(135deg,#fff 0%,#fbfcfe 55%,#f4f8fc 100%)}.certificate-inner{height:100%;border:1px solid #cfdae8;padding:28px 58px 24px;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative}.certificate-kicker{font-size:11px;letter-spacing:.22em;font-weight:900;color:#f47b20;margin-bottom:8px}.certificate-title{font-family:Georgia,'Times New Roman',serif;font-size:50px;line-height:1;color:#24467f;font-weight:700;letter-spacing:.06em}.certificate-subtitle{font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#24467f;font-weight:700;letter-spacing:.19em;margin-top:8px}.certificate-rule{width:210px;height:3px;background:#f47b20;margin:18px auto 14px}.certificate-reg{margin:0;color:#64758a;font-size:14px}.certificate-program{margin:6px 0 18px;color:#26384d;font-size:16px;font-weight:800}.certificate-presented{margin:0 0 4px;font-family:Georgia,'Times New Roman',serif;font-style:italic;color:#6b7d91;font-size:15px}.certificate-company{font-family:Georgia,'Times New Roman',serif;font-size:34px;line-height:1.15;color:#173f75;font-weight:700;margin:2px 0 4px}.certificate-usdot{font-size:17px;color:#24467f;font-weight:800;margin-bottom:16px}.certificate-copy{max-width:760px;margin:0 auto 18px;line-height:1.6;color:#40536a;font-size:14px}.certificate-dates{display:flex;justify-content:center;gap:80px;margin:4px 0 20px}.certificate-dates div{min-width:180px;border-top:1px solid #aebed0;padding-top:7px}.certificate-dates span,.certificate-issued span{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#7b8ca0}.certificate-dates strong{display:block;margin-top:3px;color:#173f75;font-size:14px}.certificate-issued{width:72%;margin:4px auto 0;text-align:center;border-top:1px solid #7f93ab;padding-top:8px}.certificate-issued strong{display:block;color:#173f75;font-size:14px}.certificate-footerline{position:absolute;bottom:12px;left:0;right:0;font-size:9px;color:#8090a3;letter-spacing:.04em}
 @media(max-width:1120px){body{overflow:auto}.certificate-sheet{transform-origin:top left;transform:scale(.82);margin-bottom:-140px}}@media(max-width:900px){.certificate-sheet{transform:scale(.66);margin-bottom:-270px}}@media(max-width:700px){body{padding:10px}.doc-sheet:not(.certificate-sheet){padding:24px 20px}.doc-brand{margin:-24px -20px 20px;padding:18px 20px}.doc-meta-grid{grid-template-columns:1fr}.certificate-sheet{transform:scale(.48);margin-left:0;margin-bottom:-420px}}
 </style></head><body class="${certificate?'certificate-document':''}">${body}</body></html>`;
}

let html2pdfLoadPromise=null;
function ensureHtml2Pdf(){
 if(typeof html2pdf==="function")return Promise.resolve();
 if(html2pdfLoadPromise)return html2pdfLoadPromise;
 html2pdfLoadPromise=new Promise((resolve,reject)=>{
   const existing=document.querySelector('script[data-s4u-html2pdf]');
   if(existing){existing.addEventListener('load',()=>typeof html2pdf==="function"?resolve():reject(new Error("PDF generator failed to initialize.")),{once:true});existing.addEventListener('error',()=>reject(new Error("PDF generator could not be loaded.")),{once:true});return}
   const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';s.async=true;s.dataset.s4uHtml2pdf='1';s.crossOrigin='anonymous';s.onload=()=>typeof html2pdf==="function"?resolve():reject(new Error("PDF generator failed to initialize."));s.onerror=()=>reject(new Error("PDF generator could not be loaded."));document.head.appendChild(s);
 });
 return html2pdfLoadPromise;
}

async function downloadDocumentPdf(doc){
 await ensureHtml2Pdf();
 const certificate=isCertificateDocument(doc),wrap=document.createElement("div");wrap.className="pdf-export-wrap"+(certificate?" certificate-pdf-export":"");wrap.innerHTML=documentBodyHtml(doc);document.body.appendChild(wrap);
 const safe=(doc.title||doc.display_title||doc.file_name||"document").replace(/[^a-z0-9-_]+/gi,"-").replace(/^-|-$/g,"").toLowerCase()+".pdf";
 try{
   const opt=certificate
     ?{margin:0,filename:safe,image:{type:"jpeg",quality:.99},pagebreak:{mode:["avoid-all"]},html2canvas:{scale:2,useCORS:true,backgroundColor:"#ffffff",width:1056,height:816,windowWidth:1056,windowHeight:816,scrollX:0,scrollY:0},jsPDF:{unit:"px",format:[1056,816],orientation:"landscape",hotfixes:["px_scaling"]}}
     :{margin:[0.45,0.45,0.55,0.45],filename:safe,image:{type:"jpeg",quality:.98},html2canvas:{scale:2,useCORS:true,backgroundColor:"#ffffff"},jsPDF:{unit:"in",format:"letter",orientation:"portrait"}};
   const pdfSource=certificate?(wrap.querySelector(".certificate-sheet")||wrap.firstElementChild):wrap.firstElementChild;
   await html2pdf().set(opt).from(pdfSource).save();
 }finally{wrap.remove()}
}

function bindDocumentActions(){
 document.querySelectorAll(".doc-view-btn").forEach(btn=>btn.addEventListener("click",async()=>{
   try{btn.disabled=true;const doc=await getDocumentDetail(btn.dataset.id,btn.dataset.source);const modal=ensureDocumentViewer();modal.querySelector("#doc-modal-title").textContent=doc.title||doc.display_title||doc.file_name||"Document";const frame=modal.querySelector("#doc-view-frame");frame.srcdoc=documentViewerSrcdoc(doc);const dl=modal.querySelector("#doc-modal-download");dl.onclick=()=>downloadDocumentPdf(doc);document.body.classList.add("doc-modal-open");if(typeof modal.showModal==="function")modal.showModal();else modal.setAttribute("open","")}catch(e){window.S4UDialog?.alert?window.S4UDialog.alert(e.message||String(e)):alert(e.message||e)}finally{btn.disabled=false}
 }));
 document.querySelectorAll(".doc-download-btn").forEach(btn=>btn.addEventListener("click",async()=>{
   try{btn.disabled=true;const doc=await getDocumentDetail(btn.dataset.id,btn.dataset.source);await downloadDocumentPdf(doc)}catch(e){window.S4UDialog?.alert?window.S4UDialog.alert(e.message||String(e)):alert(e.message||e)}finally{btn.disabled=false}
 }));
}

async function loadReports(){
 const d=await owner("reports");
 const r=d.reports||d.summary||d;
 document.getElementById("page-content").innerHTML=pageHead("REPORTING","Program reporting","Review operational activity across your driver, testing and compliance records.")+
 `<div class="grid grid-3">
 <div class="card metric"><div class="label">Testing orders</div><div class="value">${Number(r.testing_orders||r.testing_count||0)}</div></div>
 <div class="card metric"><div class="label">Open compliance</div><div class="value">${Number(r.open_compliance||r.compliance_count||0)}</div></div>
 <div class="card metric"><div class="label">Documents</div><div class="value">${Number(r.documents||r.document_count||0)}</div></div>
 </div><div class="card" style="margin-top:18px"><p>Detailed reporting availability follows your active Owner-Operator subscription.</p></div>`;
}

async function loadBilling(){
 const d=await owner("billing"), invoices=d.invoices||[], sub=d.subscription||{};
 document.getElementById("page-content").innerHTML=pageHead("BILLING","Subscription & billing","Review your Owner-Operator subscription and invoices.")+
 `<div class="grid grid-2">
  <div class="card"><h2>Subscription</h2><p><strong>${esc(sub.plans?.name||sub.plan_name||"Owner-Operator Plan")}</strong></p><p>Status: ${status(sub.status)}</p><p>Billing: ${esc(sub.billing_frequency||"monthly")}</p></div>
  <div class="card"><h2>Invoices</h2>${table(["Invoice","Status","Amount","Due"],invoices.map(x=>`<tr><td>${esc(x.invoice_number||x.id)}</td><td>${status(x.status)}</td><td>${money(x.total_amount||x.amount_due)}</td><td>${fmt(x.due_date)}</td></tr>`))}</div>
 </div>`;
}

async function loadNotifications(){
 const d=await owner("notifications"), rows=d.notifications||[];
 document.getElementById("page-content").innerHTML=pageHead("NOTIFICATIONS","Notifications","Program messages and account activity.")+
 table(["Subject","Status","Date"],rows.map(x=>`<tr><td>${esc(x.subject||x.body||x.event_type)}</td><td>${status(x.status)}</td><td>${fmt(x.created_at||x.queued_at)}</td></tr>`));
}

async function loadUsers(){
 const d=await members("list"), rows=d.staff||[];
 document.getElementById("page-content").innerHTML=pageHead("USERS","Users","Manage staff access when included in your plan.",d.can_manage?`<button class="btn btn-primary" id="invite-btn">Invite user</button>`:"")+
 table(["Name","Email","Role","Result access","Status"],rows.map(x=>`<tr><td>${esc(x.full_name)}</td><td>${esc(x.email)}</td><td>${esc(x.role_code)}</td><td>${esc(x.result_access)}</td><td>${status(x.status)}</td></tr>`))+
 `<div class="popup" id="invite-popup"><div class="popup-card"><h2>Invite Owner-Operator staff</h2><form id="invite-form" class="form-grid">
 <div class="field"><label>First name</label><input name="first_name"></div><div class="field"><label>Last name</label><input name="last_name"></div>
 <div class="field full"><label>Email</label><input type="email" name="email" required></div>
 <div class="field full"><label>Result access</label><select name="result_access"><option value="summary">Summary</option><option value="authorized">Authorized</option><option value="none">None</option></select></div>
 <div class="actions field full"><button class="btn btn-primary" type="submit">Send invite</button><button class="btn btn-secondary" type="button" id="invite-cancel">Cancel</button><span id="invite-msg"></span></div>
 </form></div></div>`;
 document.getElementById("invite-btn")?.addEventListener("click",()=>document.getElementById("invite-popup").classList.add("open"));
 document.getElementById("invite-cancel")?.addEventListener("click",()=>document.getElementById("invite-popup").classList.remove("open"));
 document.getElementById("invite-form")?.addEventListener("submit",async e=>{
   e.preventDefault();const member=Object.fromEntries(new FormData(e.currentTarget).entries()),msg=document.getElementById("invite-msg");msg.textContent="Sending…";
   try{await members("invite",{member});msg.textContent="Invitation sent.";msg.className="success";deletePageCache('owner:members'); setTimeout(()=>loadUsers().catch(errorView),150)}catch(err){msg.textContent=err.message;msg.className="error"}
 });
}

async function loadAudit(){
 const d=await owner("audit"), rows=d.audit||d.events||[];
 document.getElementById("page-content").innerHTML=pageHead("AUDIT HISTORY","Audit history","Review significant account and program activity.")+
 table(["Action","Resource","Date"],rows.map(x=>`<tr><td>${esc(x.action)}</td><td>${esc(x.resource_type||x.resource_id)}</td><td>${fmt(x.created_at)}</td></tr>`));
}

async function loadSupport(){
 const root=document.getElementById('page-content');
 root.innerHTML=pageHead('SUPPORT','Support','Create a support ticket if you need help completing Owner-Operator onboarding or using the portal.')+`
 <div class="support-layout">
  <div class="card support-ticket-card">
   <div class="step-kicker">PORTAL SUPPORT</div>
   <h2>Create a support ticket</h2>
   <p>Describe the issue you are having. Your ticket will be tied to your Owner-Operator account so our support team can follow up.</p>
   <form id="support-ticket-form" class="form-grid">
    <div class="field full"><label>Subject</label><input name="subject" maxlength="140" required placeholder="What do you need help with?"></div>
    <div class="field"><label>Category</label><select name="category" required><option value="onboarding">Onboarding</option><option value="account">Account / Login</option><option value="testing">Drug Testing</option><option value="clearinghouse">Clearinghouse</option><option value="billing">Billing</option><option value="portal">Portal / Technical</option></select></div>
    <div class="field"><label>Priority</label><select name="priority" required><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></div>
    <div class="field full"><label>Message</label><textarea name="message" rows="7" required placeholder="Tell us what happened, what page you were on, and any error message you saw."></textarea></div>
    <div class="field full"><div id="support-ticket-msg" class="form-message" aria-live="polite"></div><button class="btn btn-primary" type="submit">Create Support Ticket</button></div>
   </form>
  </div>
  <div class="card support-contact-card"><h2>Need immediate help?</h2><p><strong>Email</strong><br><a href="mailto:owner-operator@screenings4u.com">owner-operator@screenings4u.com</a></p><p><strong>Phone</strong><br><a href="tel:7732457009">(773) 245-7009</a></p>${onboardingLocked()?`<div class="actions support-back-actions"><a class="btn btn-secondary" href="/onboarding.html">Back to Onboarding</a></div><p class="fine-print">During required onboarding, only Onboarding, Support, and Sign out are available.</p>`:`<p class="fine-print">Your Owner-Operator portal navigation is available. Use the sidebar to open your portal pages.</p>`}</div>
 </div>`;
 const form=document.getElementById('support-ticket-form'),msg=document.getElementById('support-ticket-msg');
 form?.addEventListener('submit',async e=>{e.preventDefault();const btn=form.querySelector('button[type="submit"]'),fd=new FormData(form);btn.disabled=true;msg.textContent='Creating support ticket…';msg.className='form-message';try{const out=await edge('workforce-support',{action:'create',subject:String(fd.get('subject')||''),category:String(fd.get('category')||'portal'),priority:String(fd.get('priority')||'normal'),message:String(fd.get('message')||''),portal_page:currentPage(),page_title:document.title,page_url:location.href});if(out?.error)throw new Error(out.error);msg.textContent='Support ticket '+(out?.ticket?.ticket_number||'created')+'. Our support team can now review your request.';msg.className='form-message success';form.reset()}catch(err){msg.textContent=err?.message||String(err);msg.className='form-message error'}finally{btn.disabled=false}});
}

const LOADERS={
  "onboarding.html":loadOnboarding,"clearinghouse-setup.html":loadClearinghouseSetup,"checkout.html":loadCheckout,
  "order-drug-test.html":loadDrugTestOrder,"dashboard.html":loadDashboard,"profile.html":loadProfile,"drivers.html":loadDrivers,
  "programs.html":loadPrograms,"consortium.html":loadConsortium,"testing.html":loadTesting,"results.html":loadResults,
  "compliance.html":loadCompliance,"rtd.html":loadRTD,"documents.html":loadDocuments,"reports.html":loadReports,
  "billing.html":loadBilling,"notifications.html":loadNotifications,"users.html":loadUsers,"audit-history.html":loadAudit,"support.html":loadSupport
};
function warmPortalCache(){
  if(onboardingLocked())return;
  if(window.__S4U_OWNER_CACHE_WARMING__)return;
  window.__S4U_OWNER_CACHE_WARMING__=true;
  const run=async()=>{
    const queue=PREFETCH_ACTIONS.filter(a=>{const k='owner:'+a;const m=pageCache.get(k)||readPersistentCache(k);if(m){pageCache.set(k,m);return false}return true});
    const workers=Array.from({length:4},async()=>{
      while(queue.length){const action=queue.shift();if(!action)break;try{await owner(action)}catch{}}
    });
    await Promise.all(workers);
    window.__S4U_OWNER_CACHE_WARMED__=true;
  };
  if('requestIdleCallback' in window)requestIdleCallback(()=>run(),{timeout:250});else setTimeout(run,25);
}
function currentPage(){return (location.pathname.split("/").pop()||"dashboard.html").toLowerCase()}
function onboardingLocked(){return !!(state.onboarding && !state.onboarding.completed && !state.clearinghouse?.completed)}
function clearinghouseLocked(){return !!(!onboardingLocked() && state.onboarding?.completed && state.clearinghouse && !state.clearinghouse.completed)}
function syncActiveNav(){
  const page=currentPage();
  const locked=onboardingLocked();
  document.body.classList.toggle('onboarding-nav-locked',locked);
  document.querySelectorAll('.side .nav a,.mobile-nav-links a').forEach(a=>{
    const href=(a.getAttribute('href')||'').split('?')[0].split('#')[0].replace(/^\//,'').toLowerCase();
    a.classList.toggle('active',href===page);
    const allowed=!locked||href==='onboarding.html'||href==='support.html';
    a.classList.toggle('onboarding-disabled',!allowed);
    if(!allowed){a.setAttribute('aria-disabled','true');a.setAttribute('tabindex','-1')}else{a.removeAttribute('aria-disabled');a.removeAttribute('tabindex')}
  });
  const current=(NAV.find(x=>x[0]===page)||[])[2]||'Portal';
  const chip=document.querySelector('.mobile-nav-current');if(chip)chip.textContent=current;
}
function allowedRoute(page){
  if(onboardingLocked() && !["onboarding.html","checkout.html","order-drug-test.html","support.html"].includes(page))return '/onboarding.html';
  if(clearinghouseLocked() && !["clearinghouse-setup.html","onboarding.html","checkout.html","order-drug-test.html","support.html"].includes(page))return '/clearinghouse-setup.html';
  return null;
}
async function renderCurrentPage(){
  let page=currentPage();
  const redirect=allowedRoute(page);
  if(redirect&&page!==redirect.replace(/^\//,'')){history.replaceState({},'',redirect);page=currentPage()}
  syncActiveNav();
  const root=document.getElementById('page-content');
  if(root){root.setAttribute('aria-busy','true');root.classList.toggle('dashboard-page',page==='dashboard.html')}
  const required=featureByPage[page];
  if(required && state.entitlements && Object.keys(state.entitlements).length && state.entitlements[required]===false)throw new Error("This page is not included in your current Owner-Operator plan.");
  const loader=LOADERS[page]||loadDashboard;
  await loader();
  if(root)root.setAttribute('aria-busy','false');
}
async function navigatePortal(url,{replace=false}={}){
  if(navigating)return;
  const u=new URL(url,location.href);
  if(u.origin!==location.origin){location.href=u.href;return}
  const next=(u.pathname.split('/').pop()||'dashboard.html').toLowerCase();
  const forced=allowedRoute(next);
  if(forced){u.pathname=forced;u.search='';u.hash=''}
  const same=u.pathname===location.pathname&&u.search===location.search&&u.hash===location.hash;
  if(same)return;
  navigating=true;
  try{
    if(replace)history.replaceState({},'',u.pathname+u.search+u.hash);else history.pushState({},'',u.pathname+u.search+u.hash);
    syncActiveNav();
    await renderCurrentPage();
    window.scrollTo(0,0);
  }catch(e){console.error(e);errorView(e)}finally{navigating=false}
}
function bindSpaNavigation(){
  if(window.__S4U_OWNER_SPA_BOUND__)return;window.__S4U_OWNER_SPA_BOUND__=true;
  document.addEventListener('click',e=>{
    const a=e.target.closest('a[href]');if(!a||e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
    if(a.target==='_blank'||a.hasAttribute('download'))return;
    const u=new URL(a.href,location.href);if(u.origin!==location.origin)return;
    if(!/\.html$/i.test(u.pathname))return;
    const next=(u.pathname.split('/').pop()||'').toLowerCase();
    if(onboardingLocked()&&a.closest('.side,.mobile-nav')&&!['onboarding.html','support.html'].includes(next)){e.preventDefault();return}
    e.preventDefault();navigatePortal(u.pathname+u.search+u.hash);
  });
  addEventListener('popstate',()=>{renderCurrentPage().catch(e=>{console.error(e);errorView(e)})});
  document.addEventListener('pointerenter',e=>{
    if(onboardingLocked())return;
    const a=e.target.closest?.('a[href]');if(!a)return;
    const page=(new URL(a.href,location.href).pathname.split('/').pop()||'').toLowerCase();
    const map={"dashboard.html":"overview","profile.html":"profile","drivers.html":"drivers","programs.html":"programs","consortium.html":"consortium","testing.html":"testing","results.html":"results","compliance.html":"compliance","rtd.html":"rtd","documents.html":"documents","reports.html":"reports","billing.html":"billing","notifications.html":"notifications","audit-history.html":"audit"};
    const action=map[page];if(action&&!pageCache.has('owner:'+action))owner(action).catch(()=>{});
  },true);
}
async function initPage(){
  renderShell();bindSpaNavigation();
  try{
    if(!await guard())return;
    await renderCurrentPage();
    warmPortalCache();
    document.getElementById('page-retry-btn')?.addEventListener('click',()=>renderCurrentPage().catch(errorView));
  }catch(e){console.error(e);errorView(e)}
}

window.OwnerPortal={supabase,edge,initPage,navigate:navigatePortal,esc,status,fmt,money};
})();
