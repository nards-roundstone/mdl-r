// Simple offline ticket board using localStorage; loads defaults from /data CSVs on first run.
const LS_KEY = "mdl_r_tickets_v1";

function csvParse(text){
  const rows = text.trim().split(/\r?\n/).map(r=>r.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(c=>c.replace(/^"|"$/g,"")));
  const [head,...body] = rows;
  return body.map(r => Object.fromEntries(head.map((h,i)=>[h,r[i]??""])));
}

async function loadData(){
  // Categories
  const catCsv = await fetch("data/ticket_categories.csv").then(r=>r.text());
  const cats = csvParse(catCsv);
  const catSel = document.getElementById("categorySelect");
  catSel.innerHTML = cats.map(c=>`<option>${c.category_code}</option>`).join("");

  // Units
  const unitCsv = await fetch("data/units_R.csv").then(r=>r.text());
  const units = csvParse(unitCsv);
  const dl = document.getElementById("units");
  dl.innerHTML = units.map(u=>`<option value="${u.unit_code}">`).join("");

  // Default priority by category
  window.defaultPriority = Object.fromEntries(cats.map(c=>[c.category_code, c.default_priority]));
  document.getElementById("categorySelect").addEventListener("change", e=>{
    const p = defaultPriority[e.target.value] || "Normal";
    document.getElementById("prioritySelect").value = p;
  });
}

function uid(){ return "R-" + Math.random().toString(36).slice(2,8).toUpperCase() }
function getTickets(){ return JSON.parse(localStorage.getItem(LS_KEY) || "[]") }
function setTickets(arr){ localStorage.setItem(LS_KEY, JSON.stringify(arr)); render() }

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
  const list = getTickets().map(t=> t.id===id ? {...t, status:"Closed", closed_at:new Date().toISOString()} : t);
  setTickets(list);
}

document.addEventListener("DOMContentLoaded", ()=>{
  document.getElementById("ticketForm").addEventListener("submit", e=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const now = new Date().toISOString();
    const ticket = {
      id: uid(),
      status: "Open",
      created_at: now,
      updated_at: now,
      ...Object.fromEntries(fd.entries())
    };
    const list = getTickets(); list.push(ticket); setTickets(list);
    e.target.reset();
  });

  document.getElementById("exportCsv").addEventListener("click", ()=>{
    const list = getTickets();
    if(!list.length){ alert("No tickets to export."); return; }
    const fields = Array.from(new Set(list.flatMap(o=>Object.keys(o))));
    const csv = [fields.join(",")].concat(list.map(o=> fields.map(k=> (o[k]??"").toString().replace(/"/g,'""')).map(v=>`"${v}"`).join(","))).join("\n");
    const blob = new Blob([csv], {type:"text/csv"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "tickets_export.csv";
    a.click();
  });

  document.getElementById("clearAll").addEventListener("click", ()=>{
    if(confirm("Clear all tickets stored locally?")){ localStorage.removeItem(LS_KEY); render(); }
  });

  loadData().then(render);
});
