
(function(){
const cfg=window.S4U;
if(!cfg) throw new Error("Portal configuration is missing.");
const supabase=window.supabase.createClient(cfg.url,cfg.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});

const NAV=[
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

const state={session:null,context:null,entitlements:{},permissions:[]};

async function edge(name,body){
  const {data:{session}}=await supabase.auth.getSession();
  const token=session?.access_token;
  if(!token) throw new Error("Your session has expired.");
  const r=await fetch(cfg.api+"/"+name,{
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "Authorization":"Bearer "+token,
      "apikey":cfg.key
    },
    body:JSON.stringify(body||{})
  });
  const j=await r.json().catch(()=>({}));
  if(!r.ok||j.error) throw new Error(j.error||("Request failed ("+r.status+")"));
  return j;
}

function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]))}
function money(v){const n=Number(v||0);return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(n)}
function fmt(v){if(!v)return"—";const d=new Date(v);return Number.isNaN(d.getTime())?esc(v):d.toLocaleDateString()}
function status(v){const s=String(v||"").toLowerCase();const cls=["active","complete","completed","paid","eligible","resolved"].includes(s)?"status":["cancelled","failed","inactive","suspended","terminated"].includes(s)?"status bad":"status warn";return `<span class="${cls}">${esc(v||"Unknown")}</span>`}

function renderShell(){
  const path=(location.pathname.split("/").pop()||"dashboard.html").toLowerCase();
  const nav=NAV.map(([href,icon,label])=>`<a href="/${href}" class="${path===href?"active":""}"><span class="icon">${icon}</span>${label}</a>`).join("");
  const shell=document.getElementById("portal-shell");
  if(!shell)return;
  shell.innerHTML=`
    <aside class="sidebar" id="sidebar">
      <div class="brand"><div class="brand-mark">S4U</div><div>Owner-Operator</div></div>
      <div class="nav-label">DOT Workspace</div>
      <nav class="nav">${nav}</nav>
    </aside>
    <main class="main">
      <header class="topbar">
        <div style="display:flex;align-items:center;gap:10px">
          <button class="btn btn-secondary mobile-menu" id="menu-btn" type="button">☰</button>
          <div class="topbar-title" id="org-name">Owner-Operator Portal</div>
        </div>
        <div class="topbar-actions">
          <a class="btn btn-secondary" href="https://dot.screenings4u.com/resources.html" target="_blank" rel="noopener">Resources</a>
          <button class="btn btn-secondary" id="signout-btn" type="button">Sign out</button>
        </div>
      </header>
      <div class="content" id="page-content"></div>
    </main>`;
  document.getElementById("menu-btn")?.addEventListener("click",()=>document.getElementById("sidebar")?.classList.toggle("open"));
  document.getElementById("signout-btn")?.addEventListener("click",async()=>{await supabase.auth.signOut();location.href="/login.html"});
}

async function guard(){
  const {data:{session}}=await supabase.auth.getSession();
  if(!session){location.replace("/login.html?next="+encodeURIComponent(location.pathname+location.search));return false}
  state.session=session;
  const ctx=await edge("dot-session-context",{requested_portal_code:"owner_operator"});
  const w=ctx.workspace||ctx.context||ctx;
  const portal=String(w.portal||ctx.portal_code||ctx.access?.portal_code||"");
  if(portal!=="owner_operator" && String(w.owner_operator_id||"")==="") throw new Error("This account is not authorized for the Owner-Operator portal.");
  state.context=w;
  state.entitlements=w.entitlements||ctx.entitlements||{};
  state.permissions=w.permissions||ctx.permissions||[];
  const org=document.getElementById("org-name");
  if(org)org.textContent=w.organization_name||w.owner_operator?.legal_name||"Owner-Operator Portal";
  const page=(location.pathname.split("/").pop()||"dashboard.html").toLowerCase();
  const required=featureByPage[page];
  if(required && state.entitlements && Object.keys(state.entitlements).length && state.entitlements[required]===false){
    throw new Error("This page is not included in your current Owner-Operator plan.");
  }
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
  if(el)el.innerHTML=pageHead("OWNER-OPERATOR PORTAL","We could not load this page","The portal returned an error while loading your account.")+`<div class="card"><div class="status bad">Error</div><p>${esc(e.message||e)}</p><button class="btn btn-primary" onclick="location.reload()">Try again</button></div>`;
}

async function owner(action,extra={}){return edge("workforce-owner-portal",{action,...extra})}
async function members(action,extra={}){return edge("workforce-owner-members",{action,...extra})}

async function loadDashboard(){
 const d=await owner("overview");
 const ownerObj=d.owner||{};
 const testing=d.testing||[], compliance=d.compliance||[], docs=d.document_packets||[], programs=d.programs||[], drivers=d.drivers||[];
 const activeCons=(d.consortium_enrollments||[]).filter(x=>String(x.status).toLowerCase()==="active").length;
 document.getElementById("page-content").innerHTML=
  pageHead("OWNER-OPERATOR DOT WORKSPACE","Your DOT program at a glance","A single-driver workspace for program status, consortium participation, testing, results, documents and follow-up activity.")+
  `<div class="notice"><strong>FMCSA owner-operator workflow:</strong> keep your consortium/random-pool participation, testing activity and program records visible in one place. This software supports administration and recordkeeping; it is not legal advice.</div>
  <div class="grid grid-4" style="margin-top:18px">
    <div class="card metric"><div class="label">Driver records</div><div class="value">${drivers.length}</div></div>
    <div class="card metric"><div class="label">Active DOT programs</div><div class="value">${programs.filter(x=>x.status==="active").length}</div></div>
    <div class="card metric"><div class="label">Active consortium enrollments</div><div class="value">${activeCons}</div></div>
    <div class="card metric"><div class="label">Open compliance items</div><div class="value">${compliance.filter(x=>!["resolved","closed"].includes(String(x.status))).length}</div></div>
  </div>
  <div class="grid grid-2" style="margin-top:18px">
    <div class="card"><h2>Recent testing</h2>${table(["Order","Reason","Test","Status","Created"],testing.slice(0,8).map(x=>`<tr><td>${esc(x.order_number||x.id)}</td><td>${esc(x.reason)}</td><td>${esc(x.test_type)}</td><td>${status(x.status)}</td><td>${fmt(x.created_at)}</td></tr>`))}</div>
    <div class="card"><h2>Program documents</h2>${table(["Document","Status","Valid until"],docs.slice(0,8).map(x=>`<tr><td>${esc(x.title)}</td><td>${status(x.status)}</td><td>${fmt(x.valid_until)}</td></tr>`))}</div>
  </div>`;
}

async function loadProfile(){
 const d=await owner("profile"), o=d.owner||d.profile||{};
 document.getElementById("page-content").innerHTML=pageHead("ACCOUNT","Company profile","Keep your Owner-Operator business and DOT identifiers current.")+
 `<div class="card"><form id="profile-form" class="form-grid">
   <div class="field"><label>Legal name</label><input name="legal_name" value="${esc(o.legal_name)}"></div>
   <div class="field"><label>DBA</label><input name="dba_name" value="${esc(o.dba_name)}"></div>
   <div class="field"><label>USDOT number</label><input name="dot_number" value="${esc(o.dot_number)}"></div>
   <div class="field"><label>MC number</label><input name="mc_number" value="${esc(o.mc_number)}"></div>
   <div class="field"><label>Email</label><input type="email" name="email" value="${esc(o.email)}"></div>
   <div class="field"><label>Phone</label><input name="phone" value="${esc(o.phone)}"></div>
   <div class="field"><label>State</label><input name="state" value="${esc(o.state)}"></div>
   <div class="field"><label>Vehicles</label><input type="number" min="1" name="vehicle_count" value="${esc(o.vehicle_count||1)}"></div>
   <div class="actions field full"><button class="btn btn-primary" type="submit">Save profile</button><span id="save-msg"></span></div>
 </form></div>`;
 document.getElementById("profile-form").addEventListener("submit",async e=>{
  e.preventDefault(); const fd=new FormData(e.currentTarget), profile=Object.fromEntries(fd.entries());
  profile.vehicle_count=Number(profile.vehicle_count||1);
  const msg=document.getElementById("save-msg"); msg.textContent="Saving…";
  try{await owner("save_profile",{profile});msg.textContent="Saved.";msg.className="success"}catch(err){msg.textContent=err.message;msg.className="error"}
 });
}

async function loadDrivers(){
 const d=await owner("drivers"), rows=d.drivers||[];
 document.getElementById("page-content").innerHTML=pageHead("DRIVER","Driver record","Maintain the driver record associated with your Owner-Operator account.")+
 table(["Name","Employee #","Status","CDL","State","DOT agency"],rows.map(x=>`<tr><td>${esc([x.first_name,x.last_name].filter(Boolean).join(" "))}</td><td>${esc(x.employee_number)}</td><td>${status(x.employment_status)}</td><td>${esc(x.cdl_number)}</td><td>${esc(x.cdl_state)}</td><td>${esc(x.dot_agency||"FMCSA")}</td></tr>`));
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
 const d=await owner("documents"), rows=d.documents||d.packets||d.document_packets||[];
 document.getElementById("page-content").innerHTML=pageHead("DOCUMENTS","Program documents","Keep certificates, packets and supporting program records organized.")+
 table(["Document","Type","Status","Updated","Valid until"],rows.map(x=>`<tr><td>${esc(x.title||x.name)}</td><td>${esc(x.document_type||x.packet_type)}</td><td>${status(x.status)}</td><td>${fmt(x.updated_at)}</td><td>${fmt(x.valid_until)}</td></tr>`));
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
   try{await members("invite",{member});msg.textContent="Invitation sent.";msg.className="success";setTimeout(()=>location.reload(),650)}catch(err){msg.textContent=err.message;msg.className="error"}
 });
}

async function loadAudit(){
 const d=await owner("audit"), rows=d.audit||d.events||[];
 document.getElementById("page-content").innerHTML=pageHead("AUDIT HISTORY","Audit history","Review significant account and program activity.")+
 table(["Action","Resource","Date"],rows.map(x=>`<tr><td>${esc(x.action)}</td><td>${esc(x.resource_type||x.resource_id)}</td><td>${fmt(x.created_at)}</td></tr>`));
}

async function loadSupport(){
 document.getElementById("page-content").innerHTML=pageHead("SUPPORT","Support","Contact Screenings4u for software support.")+
 `<div class="grid grid-2"><div class="card"><h2>Software support</h2><p>Email: <a href="mailto:support@screenings4u.com">support@screenings4u.com</a></p><p>Phone: <a href="tel:7732457009">(773) 245-7009</a></p></div><div class="card"><h2>FMCSA resources</h2><p>Use official FMCSA resources for regulatory guidance. Screenings4u provides software and administrative tools, not legal advice.</p><a class="btn btn-secondary" target="_blank" rel="noopener" href="https://www.fmcsa.dot.gov/regulations/drug-alcohol-testing/owner-operator">FMCSA Owner-Operator guidance</a></div></div>`;
}

async function initPage(){
 renderShell();
 try{
   if(!await guard())return;
   const page=(location.pathname.split("/").pop()||"dashboard.html").toLowerCase();
   const loaders={
    "dashboard.html":loadDashboard,"profile.html":loadProfile,"drivers.html":loadDrivers,"programs.html":loadPrograms,
    "consortium.html":loadConsortium,"testing.html":loadTesting,"results.html":loadResults,"compliance.html":loadCompliance,
    "rtd.html":loadRTD,"documents.html":loadDocuments,"reports.html":loadReports,"billing.html":loadBilling,
    "notifications.html":loadNotifications,"users.html":loadUsers,"audit-history.html":loadAudit,"support.html":loadSupport
   };
   await (loaders[page]||loadDashboard)();
 }catch(e){console.error(e);errorView(e)}
}

window.OwnerPortal={supabase,edge,initPage,esc,status,fmt,money};
})();
