// Maintenance Desk Lite — single-file JS
// Works at / and at /light/ by auto-picking the right data folder.
// --- Category dropdown: CSV with safe fallback ---
const DEFAULT_CATEGORIES = [
  ["PMO","Elevator","Stuck - car not moving","Elevator Team","1"],
  ["PMO","Security","Unauthorized access","Security Desk","4"],
  ["PMO","Structural","Cracks or holes","Engineering","24"],
  ["PMO","Amenities","Clubhouse request","Admin","24"],
  ["PMO","Billing","SOA concern","Finance","48"],
  ["PMO","Staff","House rules compliance","Admin","24"],
  ["PMO","Community","Noise or smoking","Security Desk","8"],
  ["PMO","Admin","Document request","Admin","48"],
  ["InBuilding","Plumbing","Leak under sink","Building Plumber","24"],
  ["InBuilding","Electrical","No power in room","Building Electrician","24"],
  ["InBuilding","ACU","Water drip","HVAC Tech","24"],
  ["InBuilding","Housekeeping","Spill cleanup","Janitorial","8"],
  ["InBuilding","Parking","Blocked slot","Parking Marshal","4"],
  ["InBuilding","Pets","Leash/collar complaint","Security Desk","8"],
];

function parseCsv(txt) {
  const lines = txt.trim().split(/\r?\n/);
  lines.shift(); // remove header
  return lines.map(l => l.split(',').map(s => s.trim()));
}

async function loadCategoryRows() {
  const path = location.pathname.includes('/light/')
    ? '../data/ticket_categories.csv'
    : './data/ticket_categories.csv';
  try {
    const res = await fetch(path, { cache: 'no-store' });
    if (!res.ok) throw new Error('csv not ok');
    const txt = await res.text();
    const rows = parseCsv(txt);
    return rows.length ? rows : DEFAULT_CATEGORIES;
  } catch (e) {
    return DEFAULT_CATEGORIES;
  }
}

async function initCategories() {
  const catEl = document.getElementById('categorySelect');
  const subEl = document.getElementById('subcategorySelect'); // ok if missing
  if (!catEl) return;

  const rows = await loadCategoryRows();

  // Build category -> {scope, subcats}
  const order = { PMO: 0, InBuilding: 1 };
  const catMap = new Map();
  rows.forEach(([scope, category, subcat]) => {
    if (!catMap.has(category)) catMap.set(category, { scope, subcats: new Set() });
    if (subcat) catMap.get(category).subcats.add(subcat);
  });

  // Fill the Category dropdown (PMO first, then InBuilding)
  const items = [...catMap.entries()].sort((a,b) =>
    (order[a[1].scope]-order[b[1].scope]) || a[0].localeCompare(b[0])
  );
  catEl.innerHTML = `<option value="" disabled selected>Select a category...</option>` +
    items.map(([cat,info]) => `<option value="${cat}" data-scope="${info.scope}">${cat}</option>`).join('');

  // Optional: Subcategory dropdown auto-fill
  if (subEl) {
    subEl.innerHTML = `<option value="" disabled selected>Select a subcategory...</option>`;
    catEl.addEventListener('change', () => {
      const info = catMap.get(catEl.value);
      if (!info) return;
      const subs = [...info.subcats].sort((a,b)=>a.localeCompare(b));
      subEl.innerHTML = `<option value="" disabled selected>Select a subcategory...</option>` +
        subs.map(s => `<option value="${s}">${s}</option>`).join('');
      subEl.disabled = subs.length === 0;
    });
  }
}

window.addEventListener('DOMContentLoaded', initCategories);



const LS_KEY = "mdl_r_tickets_v1";
const DATA_PREFIX = location.pathname.includes("/light/") ? "../data/" : "data/";

function csvParse(text){
  const rows = text.trim().split(/\r?\n/).map(r =>
    r.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(c => c.replace(/^"|"$/g,""))
  );
  const [head, ...body] = rows;
  return body.map(r => Object.fromEntries(head.map((h,i)=>[h, r[i] ?? ""])));
}

async function loadData(){
  const catCsv = await fetch(`${DATA_PREFIX}ticket_categories.csv`).then(r=>r.text());
  const cats = csvParse(catCsv);
  const catSel = document.getElementById("categorySelect");
  catSel.innerHTML = cats.map(c=>`<option>${c.category_code}</option>`).join("");

  const unitCsv = await fetch(`${DATA_PREFIX}units_R.csv`).then(r=>r.text());
  const units = csvParse(unitCsv);
  const dl = document.getElementById("units");
  dl.innerHTML = units.map(u=>`<option value="${u.unit_code}">`).join("");

  window.defaultPriority = Object.fromEntries(cats.map(c=>[c.category_code, c.default_priority]));
  document.getElementById("categorySelect").addEventListener("change", e=>{
    document.getElementById("prioritySelect").value = defaultPriority[e.target.value] || "Normal";
  });
}

function uid(){ return "R-" + Math.random().toString(36).slice(2,8).toUpperCase(); }
function getTickets(){ return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); }
function setTickets(a){ localStorage.setItem(LS_KEY, JSON.stringify(a)); render(); }

function render(){
  const box = document.getElementById("queue");
  const list = getTickets().sort((a,b)=> (b.created_at||"").localeCompare(a.created_at||""));
  box.innerHTML = list.map(t => `
    <div class="ticket priority-${t.priority}">
      <div>
        <strong>${t.category}</strong> — <em>${t.unit_code}</em><br/>
        <div class="meta">${t.description || ""}</div>
        <div class="meta">Contact: ${t.contact_name||""} ${t.contact_phone?("("+t.contact_phone+")"):""}</div>
      </div>
      <div class="meta" style="text-align:right">
        <div>${t.priority}</div>
        <div>${new Date(t.created_at).toLocaleString()}</div>
        <button onclick="closeTicket('${t.id}')">Close</button>
      </div>
    </div>
  `).join("") || "<p>No tickets yet.</p>";
}

function closeTicket(id){
  setTickets(getTickets().map(t => t.id===id ? {...t, status:"Closed", closed_at:new Date().toISOString()} : t));
}

document.addEventListener("DOMContentLoaded", ()=>{
  document.getElementById("ticketForm").addEventListener("submit", e=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const now = new Date().toISOString();
    const ticket = { id: uid(), status: "Open", created_at: now, updated_at: now, ...Object.fromEntries(fd.entries()) };
    const list = getTickets(); list.push(ticket); setTickets(list);
    e.target.reset();
  });

  document.getElementById("exportCsv").addEventListener("click", ()=>{
    const list = getTickets();
    if(!list.length){ alert("No tickets to export."); return; }
    const fields = Array.from(new Set(list.flatMap(o=>Object.keys(o))));
    const csv = [fields.join(",")].concat(list.map(o => fields.map(k =>
      (o[k]??"").toString().replace(/"/g,'""')
    ).map(v=>`"${v}"`).join(","))).join("\n");
    const blob = new Blob([csv], {type:"text/csv"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "tickets_export.csv"; a.click();
  });

  document.getElementById("clearAll").addEventListener("click", ()=>{
    if(confirm("Clear all tickets stored locally?")){ localStorage.removeItem(LS_KEY); render(); }
  });

  loadData().then(render);
});
