(() => {
  "use strict";

  const SOURCE = window.CADAYA_SCHEDULE_DATA;
  const STORAGE_KEY = "cadaya_horarios_gestion_v1";
  const $ = id => document.getElementById(id);
  const clone = value => JSON.parse(JSON.stringify(value));
  const baseState = {config: clone(SOURCE.config), people: clone(SOURCE.people)};

  let working = loadLocalState();
  let user = null;
  let selectedIndex = 0;
  let view = "month";
  let currentMonth = parseMonth(working.config.month);
  let selectedDate = new Date(currentMonth);

  function loadLocalState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (isValidState(parsed)) return parsed;
    } catch (_) {}
    return clone(baseState);
  }

  function isValidState(value) {
    return !!value && typeof value === "object" && value.config && Array.isArray(value.people)
      && /^\d{4}-\d{2}$/.test(String(value.config.month || ""))
      && /^\d{4}-\d{2}-\d{2}$/.test(String(value.config.startDate || ""));
  }

  function parseISO(value) {
    const [y,m,d] = String(value).split("-").map(Number);
    return new Date(y, m - 1, d || 1);
  }

  function parseMonth(value) {
    const [y,m] = String(value).split("-").map(Number);
    return new Date(y, m - 1, 1);
  }

  function iso(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2,"0");
    const d = String(date.getDate()).padStart(2,"0");
    return `${y}-${m}-${d}`;
  }

  function monthKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}`;
  }

  function mondayDay(date) {
    const js = date.getDay();
    return js === 0 ? 7 : js;
  }

  function addDays(date, amount) {
    const result = new Date(date);
    result.setDate(result.getDate() + amount);
    return result;
  }

  function startOfWeek(date) {
    return addDays(date, 1 - mondayDay(date));
  }

  function formatDate(date, options = {}) {
    return new Intl.DateTimeFormat("es-CO", options).format(date);
  }

  async function sha256(text) {
    const bytes = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2,"0")).join("");
  }

  function getPerson() {
    return working.people[selectedIndex] || working.people[0];
  }

  function getWeekIndex(date) {
    const start = parseISO(working.config.startDate);
    start.setHours(0,0,0,0);
    const target = new Date(date);
    target.setHours(0,0,0,0);
    return Math.floor((target - start) / 604800000);
  }

  function getPattern(person, date) {
    const index = getWeekIndex(date);
    if (index < 0 || index >= 6) return "PENDING";
    return person.weeks[index] || "PENDING";
  }

  function scheduleFor(person, date) {
    const dateKey = iso(date);
    const start = parseISO(working.config.startDate);
    if (date < start) {
      return {type:"NOT_STARTED", label:"No aplica", detail:"Antes del inicio de vigencia", hours:0};
    }
    const holiday = working.config.holidays?.[dateKey];
    if (holiday) {
      return {type:"HOLIDAY", label:"Festivo", detail:holiday, holiday, hours:0};
    }
    const weekday = mondayDay(date);
    if (weekday === 7) return {type:"REST", label:"Descanso", detail:"Domingo", hours:0};

    const pattern = getPattern(person, date);
    if (pattern === "PENDING") {
      return {type:"PENDING", label:"Pendiente", detail:"Malla sin asignar", pattern, hours:0};
    }
    const shift = SOURCE.shifts[pattern];
    const values = shift?.days?.[weekday];
    if (!values) {
      return {type:"REST", label:"Descanso", detail:shift?.label || "Día sin jornada", pattern, hours:0};
    }
    return {
      type:pattern,
      label:shift.label,
      entry:values[0],
      exit:values[1],
      lunch:values[2],
      hours:values[3],
      pattern,
      detail:`${values[0]} – ${values[1]}`
    };
  }

  function monthStats(person, monthDate) {
    const y = monthDate.getFullYear();
    const m = monthDate.getMonth();
    const days = new Date(y, m + 1, 0).getDate();
    let hours = 0;
    let worked = 0;
    for (let d=1; d<=days; d++) {
      const item = scheduleFor(person, new Date(y,m,d));
      if (item.hours > 0) {hours += item.hours; worked++;}
    }
    return {hours, worked};
  }

  function setUserInterface() {
    $("userName").textContent = user.name;
    $("roleBadge").textContent = user.role === "admin" ? "Administrador" : "Solo consulta";
    $("adminPanel").classList.toggle("hidden", user.role !== "admin");
    $("monthInput").value = working.config.month;
    $("startDateInput").value = working.config.startDate;
  }

  function renderEmployeeList() {
    const query = $("employeeSearch").value.trim().toUpperCase();
    const container = $("employeeList");
    container.innerHTML = "";
    working.people.forEach((person,index) => {
      const haystack = `${person.name} ${person.area} ${person.role}`.toUpperCase();
      if (query && !haystack.includes(query)) return;
      const button = document.createElement("button");
      button.className = `employee${index === selectedIndex ? " active" : ""}`;
      button.innerHTML = `<strong>${escapeHtml(person.name)}</strong><span>${escapeHtml(person.area)} · ${escapeHtml(person.role)}</span>`;
      button.addEventListener("click", () => {
        selectedIndex = index;
        renderAll();
      });
      container.appendChild(button);
    });
  }

  function renderProfile() {
    const person = getPerson();
    $("profileName").textContent = person.name;
    $("profileArea").textContent = person.area;
    $("profileRole").textContent = person.role;
    $("profileSite").textContent = person.site;
    const stats = monthStats(person,currentMonth);
    $("monthlyHours").textContent = `${formatHours(stats.hours)} horas`;
    $("monthlyDays").textContent = `${stats.worked} días programados`;
    const pending = person.weeks.some(item => item === "PENDING");
    $("warning").classList.toggle("hidden", !pending);
    $("warning").textContent = pending ? "Este colaborador tiene una o más semanas pendientes de asignación." : "";
  }

  function renderAdminEditor() {
    if (!user || user.role !== "admin") return;
    const person = getPerson();
    const box = $("weekEditors");
    box.innerHTML = "";
    person.weeks.forEach((value,index) => {
      const wrap = document.createElement("label");
      wrap.innerHTML = `<span class="mini-label">Semana ${index+1}</span>`;
      const select = document.createElement("select");
      select.className = "small-select";
      SOURCE.patterns.forEach(([key,label]) => {
        const option = document.createElement("option");
        option.value = key;
        option.textContent = label;
        option.selected = key === value;
        select.appendChild(option);
      });
      select.addEventListener("change", () => {
        working.people[selectedIndex].weeks[index] = select.value;
        renderProfile();
        renderCurrentView();
      });
      wrap.appendChild(select);
      box.appendChild(wrap);
    });
    renderHolidayList();
  }

  function renderHolidayList() {
    const list = $("holidayList");
    list.innerHTML = "";
    Object.entries(working.config.holidays || {}).sort().forEach(([date,name]) => {
      const row = document.createElement("div");
      row.className = "holiday-row";
      row.innerHTML = `<input class="small-input" value="${escapeAttr(date)}" disabled><input class="small-input" value="${escapeAttr(name)}" disabled>`;
      const remove = document.createElement("button");
      remove.className = "danger";
      remove.type = "button";
      remove.textContent = "Quitar";
      remove.addEventListener("click", () => {
        delete working.config.holidays[date];
        renderHolidayList();
        renderCurrentView();
      });
      row.appendChild(remove);
      list.appendChild(row);
    });
  }

  function renderMonth() {
    const person = getPerson();
    const calendar = $("calendar");
    calendar.innerHTML = "";
    const y = currentMonth.getFullYear();
    const m = currentMonth.getMonth();
    const first = new Date(y,m,1);
    const leading = mondayDay(first) - 1;
    for (let i=0; i<leading; i++) {
      const empty = document.createElement("div");
      empty.className = "day empty";
      calendar.appendChild(empty);
    }
    const total = new Date(y,m+1,0).getDate();
    for (let d=1; d<=total; d++) {
      const date = new Date(y,m,d);
      const item = scheduleFor(person,date);
      const button = document.createElement("button");
      button.className = `day type-${item.type}`;
      button.innerHTML = `<span class="day-num">${d}</span><span class="shift">${escapeHtml(shortLabel(item))}</span><div class="time">${escapeHtml(item.detail || "")}</div>`;
      button.addEventListener("click", () => openDetail(date,item));
      calendar.appendChild(button);
    }
    $("periodLabel").textContent = formatDate(currentMonth,{month:"long",year:"numeric"});
  }

  function renderWeek() {
    const person = getPerson();
    const start = startOfWeek(selectedDate);
    const grid = $("weekGrid");
    grid.innerHTML = "";
    for (let i=0; i<7; i++) {
      const date = addDays(start,i);
      const item = scheduleFor(person,date);
      const card = document.createElement("button");
      card.className = `week-day type-${item.type}`;
      card.innerHTML = `<h4>${escapeHtml(formatDate(date,{weekday:"short",day:"numeric",month:"short"}))}</h4><span class="shift">${escapeHtml(shortLabel(item))}</span><p>${detailHtml(item)}</p>`;
      card.addEventListener("click", () => openDetail(date,item));
      grid.appendChild(card);
    }
    const end = addDays(start,6);
    $("periodLabel").textContent = `${formatDate(start,{day:"numeric",month:"short"})} – ${formatDate(end,{day:"numeric",month:"short",year:"numeric"})}`;
  }

  function renderCurrentView() {
    if (view === "month") renderMonth(); else renderWeek();
  }

  function renderAll() {
    renderEmployeeList();
    renderProfile();
    renderAdminEditor();
    renderCurrentView();
  }

  function shortLabel(item) {
    if (item.type === "HOLIDAY") return "Festivo";
    if (item.type === "REST") return "Descanso";
    if (item.type === "PENDING") return "Pendiente";
    if (item.type === "NOT_STARTED") return "No aplica";
    return item.label;
  }

  function detailHtml(item) {
    if (!item.entry) return escapeHtml(item.detail || item.label);
    return `<strong>Entrada:</strong> ${escapeHtml(item.entry)}<br><strong>Salida:</strong> ${escapeHtml(item.exit)}<br><strong>Almuerzo:</strong> ${escapeHtml(item.lunch)}<br><strong>Horas:</strong> ${formatHours(item.hours)}`;
  }

  function openDetail(date,item) {
    $("modalDate").textContent = formatDate(date,{weekday:"long",day:"numeric",month:"long",year:"numeric"});
    const details = item.entry ? [
      ["Malla",item.label],["Entrada",item.entry],["Salida",item.exit],["Almuerzo",item.lunch],["Horas efectivas",formatHours(item.hours)],["Sede",getPerson().site]
    ] : [["Estado",item.label],["Detalle",item.detail || "Sin información"],["Sede",getPerson().site]];
    $("modalDetails").innerHTML = details.map(([label,value]) => `<div class="detail"><small>${escapeHtml(label)}</small><strong>${escapeHtml(String(value))}</strong></div>`).join("");
    const monday = mondayDay(date) === 1 && item.type !== "HOLIDAY" && item.type !== "NOT_STARTED";
    $("modalNote").classList.toggle("hidden", !monday);
    $("modalNote").textContent = monday ? "El lunes la jornada inicia a las 7:30 a. m. en la sede Acopi para la integración. Después, cada persona se dirige a su sede o punto habitual." : "";
    $("modalBg").classList.remove("hidden");
  }

  function formatHours(value) {
    return Number.isInteger(value) ? String(value) : String(value).replace(".25"," h 15 min").replace(".5"," h 30 min").replace(".75"," h 45 min");
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g,char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
  }

  function escapeAttr(value) { return escapeHtml(value); }

  function downloadConfig() {
    const payload = {version:SOURCE.version, exportedAt:new Date().toISOString(), config:working.config, people:working.people};
    const blob = new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `mallas-cadaya-${working.config.month}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href),1000);
  }

  async function importConfig(file) {
    const parsed = JSON.parse(await file.text());
    if (!isValidState(parsed)) throw new Error("El archivo no tiene una configuración válida.");
    working = {config:clone(parsed.config),people:clone(parsed.people)};
    currentMonth = parseMonth(working.config.month);
    selectedDate = new Date(currentMonth);
    selectedIndex = 0;
    $("monthInput").value = working.config.month;
    $("startDateInput").value = working.config.startDate;
    renderAll();
  }

  $("loginForm").addEventListener("submit", async event => {
    event.preventDefault();
    const cc = $("cc").value.replace(/\D/g,"");
    const pin = $("pin").value.replace(/\D/g,"");
    $("loginError").textContent = "";
    if (!cc || !pin) return $("loginError").textContent = "Digita la cédula y el PIN.";
    $("loginButton").disabled = true;
    try {
      const hash = await sha256(`${cc}:${pin}`);
      user = SOURCE.access.find(item => item.credentialHash === hash) || null;
      if (!user) throw new Error("Cédula o PIN incorrectos.");
      $("loginScreen").classList.add("hidden");
      $("app").classList.remove("hidden");
      $("cc").value = ""; $("pin").value = "";
      setUserInterface();
      renderAll();
    } catch (error) {
      $("loginError").textContent = error.message || "No fue posible ingresar.";
    } finally {
      $("loginButton").disabled = false;
    }
  });

  $("logout").addEventListener("click", () => location.reload());
  $("employeeSearch").addEventListener("input", renderEmployeeList);
  $("monthViewBtn").addEventListener("click", () => {
    view="month";
    $("monthViewBtn").classList.add("active"); $("weekViewBtn").classList.remove("active");
    $("monthView").classList.remove("hidden"); $("weekView").classList.add("hidden");
    renderCurrentView();
  });
  $("weekViewBtn").addEventListener("click", () => {
    view="week";
    $("weekViewBtn").classList.add("active"); $("monthViewBtn").classList.remove("active");
    $("weekView").classList.remove("hidden"); $("monthView").classList.add("hidden");
    selectedDate = new Date(currentMonth);
    renderCurrentView();
  });
  $("prevPeriod").addEventListener("click", () => {
    if (view === "month") currentMonth = new Date(currentMonth.getFullYear(),currentMonth.getMonth()-1,1);
    else selectedDate = addDays(selectedDate,-7);
    renderProfile(); renderCurrentView();
  });
  $("nextPeriod").addEventListener("click", () => {
    if (view === "month") currentMonth = new Date(currentMonth.getFullYear(),currentMonth.getMonth()+1,1);
    else selectedDate = addDays(selectedDate,7);
    renderProfile(); renderCurrentView();
  });
  $("closeModal").addEventListener("click", () => $("modalBg").classList.add("hidden"));
  $("modalBg").addEventListener("click", event => {if (event.target === $("modalBg")) $("modalBg").classList.add("hidden");});

  $("monthInput").addEventListener("change", () => {
    if (!$("monthInput").value) return;
    working.config.month = $("monthInput").value;
    currentMonth = parseMonth(working.config.month);
    selectedDate = new Date(currentMonth);
    renderAll();
  });
  $("startDateInput").addEventListener("change", () => {
    if (!$("startDateInput").value) return;
    working.config.startDate = $("startDateInput").value;
    renderAll();
  });
  $("addHoliday").addEventListener("click", () => {
    const date = $("holidayDate").value;
    const name = $("holidayName").value.trim();
    if (!date || !name) return alert("Indica la fecha y el nombre del festivo.");
    working.config.holidays ||= {};
    working.config.holidays[date] = name;
    $("holidayDate").value=""; $("holidayName").value="";
    renderHolidayList(); renderCurrentView();
  });
  $("saveLocal").addEventListener("click", () => {
    localStorage.setItem(STORAGE_KEY,JSON.stringify(working));
    alert("La configuración quedó guardada en este navegador.");
  });
  $("exportConfig").addEventListener("click", downloadConfig);
  $("importConfig").addEventListener("change", async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {await importConfig(file); alert("Configuración importada correctamente.");}
    catch (error) {alert(error.message || "No fue posible importar el archivo.");}
    event.target.value="";
  });
  $("resetConfig").addEventListener("click", () => {
    if (!confirm("¿Restaurar la programación publicada y descartar los cambios locales?")) return;
    localStorage.removeItem(STORAGE_KEY);
    working = clone(baseState);
    currentMonth = parseMonth(working.config.month);
    selectedDate = new Date(currentMonth);
    selectedIndex = 0;
    $("monthInput").value=working.config.month;
    $("startDateInput").value=working.config.startDate;
    renderAll();
  });
})();
