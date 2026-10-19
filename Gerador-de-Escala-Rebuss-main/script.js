
const STORAGE_KEY = "rebuss_escalas_v4";
const USER_NAME_KEY = "rebuss_user_name";

let selectedCity = "São Paulo";
let selectedUF   = "SP";
let stationData  = null;   
let includeStation = true;
let searchTimer  = null;


const LINE_COLORS = {
  // SP Metrô
  "1":"#0066B3","2":"#007E40","3":"#EE2E24",
  "4":"#FFDD00","5":"#9B2990","15":"#F37021",
  // SP CPTM
  "7":"#F47920","8":"#9B1E8E","9":"#01A94D",
  "10":"#007EC1","11":"#F04E23","12":"#003691","13":"#00AEEF",
  // RJ Metrô
  "1-rj":"#E8A000","2-rj":"#E8003D","3-rj":"#7B2D8B",
  // BH CBTU/Metrô
  "1-bh":"#005BAA",
  // Brasília Metrô
  "laranja":"#F47920","verde":"#007E40",
  // Goiânia BRT/Rede
  "brt":"#00AEEF",
};

function lineColor(ref, city) {
  if (!ref) return "#38bdf8";
  const key = ref + (city === "Rio de Janeiro" ? "-rj" : city === "Belo Horizonte" ? "-bh" : "");
  return LINE_COLORS[key] || LINE_COLORS[ref] || "#38bdf8";
}


function selectCity(city, uf, el) {
  selectedCity = city;
  selectedUF   = uf;
  document.querySelectorAll(".city-tab").forEach(b => b.classList.remove("active"));
  el.classList.add("active");
  clearStationUI();
  stationData = null;
  const addr = document.getElementById("address").value.trim();
  if (addr.length >= 6) scheduleStationSearch();
}

const RADIUS_M = 30000; 

function scheduleStationSearch() {
  clearTimeout(searchTimer);
  const addr = document.getElementById("address").value.trim();
  if (addr.length < 6) { clearStationUI(); return; }
  searchTimer = setTimeout(() => findNearestStation(addr), 900);
}

async function findNearestStation(address) {
  setSpinner(true);
  clearStationUI(true);
  stationData = null;
  
  // Limpeza robusta: remove múltiplos espaços, trata traços e limpa vírgulas redundantes
  const cleanAddr = address.replace(/\s+/g, ' ').replace(/-+/g, '-').replace(/,+/g, ',').replace(/,\s*$/, '').trim();

  try {
    // Busca coordenadas do endereço
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanAddr + ", " + selectedCity + ", " + selectedUF + ", Brasil")}&format=json&limit=1`,
      { headers: { "Accept-Language": "pt-BR", "User-Agent": "RebussEscalas/4.0" } }
    );
    const geoData = await geoRes.json();
    if (!geoData.length) throw new Error("not_found");

    const { lat, lon } = geoData[0];

    // Busca nwr (node, way, relation) para pegar terminais grandes mapeados como polígonos
    const query = `
[out:json][timeout:25];
(
  nwr(around:${RADIUS_M}, ${lat}, ${lon})["railway"~"station|halt"];
  nwr(around:${RADIUS_M}, ${lat}, ${lon})["station"="subway"];
  nwr(around:${RADIUS_M}, ${lat}, ${lon})["highway"="bus_station"];
  nwr(around:${RADIUS_M}, ${lat}, ${lon})["amenity"="bus_station"];
  nwr(around:${RADIUS_M}, ${lat}, ${lon})["public_transport"~"station|stop_area"];
);
out center;`;

    const ovRes  = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST", body: query,
    });
    const ovData = await ovRes.json();
    if (!ovData.elements || !ovData.elements.length) throw new Error("not_found");

    
    const R = 6371000; 
    function distM(a, b, c, d) {
      const dLat = (c - a) * Math.PI / 180;
      const dLon = (d - b) * Math.PI / 180;
      const x = Math.sin(dLat/2)**2 + Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(dLon/2)**2;
      return 2 * R * Math.asin(Math.sqrt(x));
    }

    const elements = ovData.elements
      .filter(el => el.tags && el.tags.name)
      .map(el => {
        // Pega lat/lon de nodes ou o centro de ways/relations
        const eLat = el.lat || (el.center && el.center.lat);
        const eLon = el.lon || (el.center && el.center.lon);
        return {
          ...el,
          distM: distM(parseFloat(lat), parseFloat(lon), eLat, eLon),
          isRail: el.tags.railway === "station" || el.tags.station === "subway" || el.tags.railway === "halt",
        };
      })
      .sort((a, b) => {
       
        if (a.isRail !== b.isRail) return a.isRail ? -1 : 1;
        return a.distM - b.distM;
      });

    if (!elements.length) throw new Error("not_found");

    const best = elements[0];
    const tags = best.tags;
    const name = tags.name || tags["name:pt"] || "Estação";
    const lineRef = tags.ref || tags.line || tags["ref:line"] || tags["route_ref"] || "";
    const isBus = !best.isRail;
    const distKm = (best.distM / 1000).toFixed(1);
    const color = isBus ? "#38bdf8" : lineColor(lineRef, selectedCity);
    const typeLabel = isBus ? "Terminal" : "Estação";
    const typeEmoji = isBus ? "🚌" : "🚇";

    stationData = { name, typeLabel, typeEmoji, lineRef, color, distKm, isBus };

    document.getElementById("station-name").textContent =
      `${typeEmoji} ${name}${lineRef ? ` · L${lineRef}` : ""}`;
    document.getElementById("station-dist").textContent = `~${distKm} km`;
    document.getElementById("line-dot").style.background = color;
    document.getElementById("station-chip").classList.remove("hidden");

  } catch {
    document.getElementById("station-error").classList.add("show");
  } finally {
    setSpinner(false);
  }
}

function setSpinner(on) {
  document.getElementById("spinner").classList.toggle("active", on);
}
function clearStationUI(keepSpinner = false) {
  if (!keepSpinner) setSpinner(false);
  document.getElementById("station-chip").classList.add("hidden");
  document.getElementById("station-error").classList.remove("show");
}

function toggleStation() {
  includeStation = !includeStation;
  document.getElementById("station-toggle").classList.toggle("on", includeStation);
}


function saudacao() {
  const h = new Date().getHours();
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}
function weekdayName(i) {
  return ["domingo","segunda-feira","terça-feira","quarta-feira",
          "quinta-feira","sexta-feira","sábado"][i];
}
function pad(n) { return String(n).padStart(2,"0"); }
function escHtml(s) {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
function showToast(msg, ico = "✓") {
  document.getElementById("toast-msg").textContent = msg;
  document.getElementById("toast-ico").textContent = ico;
  const t = document.getElementById("toast");
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2600);
}


function generate() {
  const dt = document.getElementById("date").value;
  const tm = document.getElementById("time").value;
  const st = document.getElementById("store").value.trim();
  const ad = document.getElementById("address").value.trim();
  const ar = document.getElementById("arrival").value.trim();
  const ob = document.getElementById("obs").value.trim();
  const un = document.getElementById("userName").value.trim() || "Equipe";

  if (!dt || !tm || !st || !ad || !un) {
    showToast("Preencha todos os campos, incluindo seu nome.", "⚠️");
    return;
  }
  localStorage.setItem(USER_NAME_KEY, un);

  const [yyyy, mm, dd] = dt.split("-");
  const dateObj = new Date(yyyy, mm - 1, dd); 
  const dateStr = `${dd}/${mm}/${yyyy}`;
  const wd = weekdayName(dateObj.getDay());

  let stationInfoText = "";
  if (includeStation && stationData) {
    const lineRefText = stationData.lineRef ? ` (L${stationData.lineRef})` : "";
    stationInfoText = `\n${stationData.typeEmoji} *${stationData.typeLabel} mais próximo${stationData.isBus ? "" : "a"}:* ${stationData.name}${lineRefText} (~${stationData.distKm} km)`;
  }

  const arrivalInfoText = ar
    ? `\n🚶 *Como chegar:*\n1️⃣ Clique no link abaixo:\n🔗 ${ar}\n2️⃣ Quando abrir o Maps, clique em *Rotas*.\n3️⃣ O aplicativo vai mostrar o caminho para você chegar ao local.`
    : "";
  const obsInfoText = ob ? `\n📝 ${ob}` : "";

  const text =
`${saudacao()}! Segue sua escala:

📅 *${dateStr}* (${wd}) às *${tm}*
🏪 *${st}*
📍 ${ad} – ${selectedCity}/${selectedUF}${stationInfoText}${arrivalInfoText}${obsInfoText}

Confirma presença? ✅

_${un} – Rebuss_`;

  document.getElementById("preview").textContent = text;
  saveToHistory({ dt, tm, store: st, address: ad, city: selectedCity, uf: selectedUF,
    obs: ob, arrival: ar, text, station: stationData ? {...stationData} : null,
    createdAt: new Date().toISOString() });
  renderHistory();
}

async function copyText() {
  const text = document.getElementById("preview").textContent.trim();
  if (!text) { showToast("Gere a mensagem primeiro.", "⚠️"); return; }
  
  try {
    await navigator.clipboard.writeText(text);
    showToast("Mensagem copiada com sucesso!", "✅");
  } catch {
    // Fallback for older browsers
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    showToast("Mensagem copiada com sucesso!", "✅");
  }
}


function loadHistory() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
}
function saveToHistory(entry) {
  const h = loadHistory();
 
  const isDupe = h.some(x => x.store === entry.store && x.dt === entry.dt && x.tm === entry.tm);
  if (!isDupe) {
    h.unshift({ ...entry, id: Date.now() }); 
    if (h.length > 50) h.length = 50; 
    localStorage.setItem(STORAGE_KEY, JSON.stringify(h));
  }
}
function deleteEntry(id) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(loadHistory().filter(h => h.id !== id)));
  renderHistory();
  showToast("Removido.", "🗑️");
}
function clearAll() {
  if (!loadHistory().length) return; 
  if (confirm("Apagar todo o histórico?")) {
    localStorage.removeItem(STORAGE_KEY);
    renderHistory();
    showToast("Histórico limpo.", "🗑️");
  }
}
function fmtDate(iso) {
  if (!iso) return "";
  const [y,m,d] = iso.split("-");
  return `${d}/${m}`;
}
function fmtCreated(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth()+1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function renderHistory() {
  const history = loadHistory();
  document.getElementById("history-count").textContent = history.length;
  const container = document.getElementById("history-list");

  if (!history.length) {
    container.innerHTML = `
      <div class="history-empty">
        <div class="ico">📋</div>
        Nenhuma escala ainda.<br>Gere a primeira acima.
      </div>`;
    return;
  }

  container.innerHTML = history.map(h => {
    const stTxt = h.station
      ? `<div class="hi-station">${h.station.typeEmoji} ${escHtml(h.station.name)}${h.station.lineRef ? ` · L${h.station.lineRef}` : ""} · ~${h.station.distKm} km</div>`
      : "";
    const cityTag = h.city ? ` · ${h.city}` : "";
    return `
    <div class="history-item">
      <div class="hi-top">
        <span class="hi-store">${escHtml(h.store)}</span>
        <span class="hi-date">${fmtDate(h.dt)} ${h.tm}</span>
      </div>
      <div class="hi-meta">${escHtml((h.address||"").substring(0,40))}${(h.address||"").length>40?"…":""}${cityTag}</div>
      ${stTxt}
      <div class="hi-actions">
        <button class="btn-mini bm-copy" onclick="copyHistoryItem(${h.id})">Copiar</button>
        <button class="btn-mini bm-view" onclick="viewHistoryItem(${h.id})">Ver</button>
        <button class="btn-mini bm-del"  onclick="deleteEntry(${h.id})">Excluir</button>
      </div>
    </div>`;
  }).join("");
}

function copyHistoryItem(id) {
  const h = loadHistory().find(x => x.id === id);
  if (h) navigator.clipboard.writeText(h.text).then(() => showToast("Copiado!"));
}
function viewHistoryItem(id) {
  const h = loadHistory().find(x => x.id === id);
  if (!h) return;
  document.getElementById("modal-title").textContent = `${h.store} — ${fmtDate(h.dt)}`;
  document.getElementById("modal-msg").textContent = h.text;
  document.getElementById("modal-overlay").classList.add("open");
}
function closeModal() { document.getElementById("modal-overlay").classList.remove("open"); }
function closeModalOutside(e) { if (e.target.id === "modal-overlay") closeModal(); }
function copyModal() {
  navigator.clipboard.writeText(document.getElementById("modal-msg").textContent)
    .then(() => { showToast("Copiado!"); closeModal(); });
}
document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });


document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("userName").value = localStorage.getItem(USER_NAME_KEY) || "";
  renderHistory();

  // Maps link live hint
  document.getElementById("arrival").addEventListener("input", function() {
    const hint = document.getElementById("maps-hint");
    const val = this.value.trim();
    if (val) {
      hint.innerHTML = `🔗 <a href="${escHtml(val)}" target="_blank" rel="noopener">${escHtml(val.length > 60 ? val.substring(0,60)+"…" : val)}</a>`;
      hint.classList.add("show");
    } else {
      hint.classList.remove("show");
    }
  });
});