
const APP_VERSION = "v19";
const LAST_UPDATED = "2026-04-13 compact mode + height";

const STORAGE_KEY = "ztracker_data_v10";
const PROFILE_KEY = "ztracker_profiles_v10";
const CURRENT_PROFILE_KEY = "ztracker_current_profile_v10";
const BG_STORAGE_KEY = "ztracker_background_v10";

const AVATAR_COLORS = ["#2563eb","#7c3aed","#16a34a","#ea580c","#db2777","#0891b2","#4f46e5","#dc2626"];

function pickAvatarColor(name = "") {
  const base = String(name || "");
  let total = 0;
  for (const ch of base) total += ch.charCodeAt(0);
  return AVATAR_COLORS[total % AVATAR_COLORS.length];
}
function getProfileInitial(name = "") {
  const trimmed = String(name || "").trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : "U";
}
function createEmptyProfile(name = "") {
  const fresh = structuredClone(defaultState);
  fresh.avatarType = "color";
  fresh.avatarColor = pickAvatarColor(name);
  fresh.avatarImage = "";
  return fresh;
}
function renderAvatar(name = "", profileState = state, size = 36) {
  const type = profileState?.avatarType || "color";
  const color = profileState?.avatarColor || pickAvatarColor(name);
  const image = profileState?.avatarImage || "";
  if (type === "image" && image) {
    return `<div class="chat-avatar" style="width:${size}px;height:${size}px;background:#fff"><img src="${image}" alt="${escapeHtml(name)} avatar" /></div>`;
  }
  return `<div class="chat-avatar" style="width:${size}px;height:${size}px;background:${color}">${escapeHtml(getProfileInitial(name))}</div>`;
}


const todayISO = () => new Date().toISOString().slice(0, 10);
const monthKey = (date) => String(date).slice(0, 7);
const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 2 });

function formatMonthLabel(key) {
  const [year, month] = key.split("-");
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}
function shiftMonthKey(key, delta) {
  const [year, month] = key.split("-").map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
function getWeekOfMonth(dateString) {
  const d = new Date(dateString + "T00:00:00");
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const offset = first.getDay();
  return Math.ceil((d.getDate() + offset) / 7);
}
function daysDiff(from, to) {
  const a = new Date(from + "T00:00:00");
  const b = new Date(to + "T00:00:00");
  return Math.round((b - a) / 86400000);
}
function dueStatus(itemDate, status) {
  if (status === "Paid") return { type: "paid", text: "Paid" };
  const diff = daysDiff(todayISO(), itemDate);
  if (diff < 0) return { type: "overdue", text: `Overdue by ${Math.abs(diff)} day${Math.abs(diff) === 1 ? "" : "s"}` };
  if (diff === 0) return { type: "overdue", text: "Due today" };
  if (diff <= 3) return { type: "due-soon", text: `Due in ${diff} day${diff === 1 ? "" : "s"}` };
  return { type: "normal", text: `Due in ${diff} days` };
}
function iconEmoji(type) {
  return ({ income:"↗", expense:"↘", saving:"💧", bill:"🧾", paid:"✓", balance:"₱", account:"🏦" })[type] || "•";
}
function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));
}

const defaultState = {
  selectedMonth: monthKey(todayISO()),
  activeTab: "home",
  entryFilter: "all",
  billFilter: "all",
  entries: [],
  bills: [],
  savings: [],
  accounts: [],
  transfers: [],
  budgets: [],
  seenVersion: "",
  expenseCategories: ["Food","Transport","Utilities","Rent","Shopping","Health","School","Other"],
  incomeCategories: ["Salary","Allowance","Side Job","Freelance","Gift","Other"],
  billCategories: ["Utility","Loan","Subscription","Rent","School","Other"],
  accountTypes: ["E-wallet","Bank","Cash","Savings","Other"],
  settingsOpen: false,
  graphModal: null,
  insightModal: null,
  assistantOpen: false,
  assistantMessages: [],
  assistantUnread: 0,
  focusItem: null,
  launchMode: "default",
  launchDropdownOpen: false,
  pendingProfileOpen: null,
  aiMode: "private",
  avatarType: "color",
  avatarColor: "#2563eb",
  avatarImage: ""
};

let profiles = loadProfiles();
let currentProfile = loadCurrentProfile();
let state = currentProfile && profiles[currentProfile] ? loadProfileState(currentProfile) : createEmptyProfile("");
let deferredPrompt = null;

function loadProfiles() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function loadCurrentProfile() {
  return localStorage.getItem(CURRENT_PROFILE_KEY) || null;
}
function loadProfileState(name) {
  const stored = profiles[name] || createEmptyProfile(name);
  return {
    ...structuredClone(defaultState),
    ...stored,
    settingsOpen: false,
    graphModal: null,
    insightModal: null,
    assistantOpen: false,
    focusItem: null,
    aiMode: stored.aiMode || "private",
    avatarType: stored.avatarType || "color",
    avatarColor: stored.avatarColor || pickAvatarColor(name),
    avatarImage: stored.avatarImage || "",
    transfers: stored.transfers || [],
    seenVersion: stored.seenVersion || "",
    assistantUnread: stored.assistantUnread || 0
  };
}
function saveState() {
  if (!currentProfile) return;
  const persistState = {
    ...state,
    settingsOpen: false,
    graphModal: null,
    insightModal: null,
    assistantOpen: false,
    focusItem: null
  };
  profiles[currentProfile] = persistState;
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profiles));
  localStorage.setItem(CURRENT_PROFILE_KEY, currentProfile);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(persistState));
}
function chooseProfile(name) {
  if (!profiles[name]) profiles[name] = createEmptyProfile(name);
  currentProfile = name;
  state = loadProfileState(name);
  state.launchMode = "default";
  state.launchDropdownOpen = false;
  state.pendingProfileOpen = null;
  saveState();
  render();
}
function exitToProfilePicker() {
  currentProfile = null;
  state = createEmptyProfile();
  state.launchMode = "default";
  state.launchDropdownOpen = false;
  state.pendingProfileOpen = null;
  localStorage.removeItem(CURRENT_PROFILE_KEY);
  render();
}
function getProfileNames() {
  return Object.keys(profiles);
}
function removeProfile(name) {
  delete profiles[name];
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profiles));
  if (currentProfile === name) {
    currentProfile = null;
    state = null;
    localStorage.removeItem(CURRENT_PROFILE_KEY);
  }
  render();
}

function loadBackground() {
  try { return JSON.parse(localStorage.getItem(BG_STORAGE_KEY) || "{}"); }
  catch { return {}; }
}
function saveBackground(bg) {
  localStorage.setItem(BG_STORAGE_KEY, JSON.stringify(bg));
}
function applyBackground() {
  const bg = loadBackground();
  document.body.classList.remove("custom-image");
  document.body.style.background = "";
  document.body.style.backgroundImage = "";
  if (bg.type === "preset") {
    const presets = {
      default: "radial-gradient(circle at top, #f7efe2, #ece3d4 50%, #e5dbc9)",
      sky: "linear-gradient(135deg,#dbeafe,#f8fafc)",
      rose: "linear-gradient(135deg,#ffe4e6,#fff1f2)",
      mint: "linear-gradient(135deg,#dcfce7,#f0fdf4)"
    };
    document.body.style.background = presets[bg.value] || presets.default;
  } else if (bg.type === "image" && bg.value) {
    document.body.classList.add("custom-image");
    document.body.style.backgroundImage = `url('${bg.value}')`;
  } else {
    document.body.style.background = "radial-gradient(circle at top, #f7efe2, #ece3d4 50%, #e5dbc9)";
  }
}

function ensureRecurringBills() {
  if (!state) return;
  const selectedMonth = state.selectedMonth || monthKey(todayISO());
  const [targetYear, targetMonth] = selectedMonth.split("-").map(Number);
  const originals = state.bills.filter(b => b.recurring);
  originals.forEach(baseBill => {
    const due = new Date(baseBill.dueDate + "T00:00:00");
    const clonedDate = new Date(targetYear, targetMonth - 1, Math.min(due.getDate(), new Date(targetYear, targetMonth, 0).getDate()));
    const cloneDueDate = `${clonedDate.getFullYear()}-${String(clonedDate.getMonth()+1).padStart(2,"0")}-${String(clonedDate.getDate()).padStart(2,"0")}`;
    const exists = state.bills.some(x => x.name === baseBill.name && x.dueDate === cloneDueDate);
    if (!exists && monthKey(cloneDueDate) !== monthKey(baseBill.dueDate)) {
      state.bills.push({ ...baseBill, id: crypto.randomUUID(), dueDate: cloneDueDate, status: "Unpaid" });
    }
  });
}

function getAllMonths() {
  const currentYear = Number(todayISO().slice(0, 4));
  const years = new Set([currentYear - 1, currentYear, currentYear + 1]);
  if (state) {
    state.entries.forEach(x => years.add(Number(x.date.slice(0, 4))));
    state.bills.forEach(x => years.add(Number(x.dueDate.slice(0, 4))));
    state.savings.forEach(x => years.add(Number(x.date.slice(0, 4))));
    state.budgets.forEach(x => years.add(Number(x.month.slice(0, 4))));
  }
  const monthKeys = [];
  [...years].sort((a,b)=>b-a).forEach(year => {
    for (let month = 12; month >= 1; month--) monthKeys.push(`${year}-${String(month).padStart(2, "0")}`);
  });
  return monthKeys;
}
function computeMonth(selectedMonth = state.selectedMonth || monthKey(todayISO())) {
  const monthEntries = state.entries.filter(x => monthKey(x.date) === selectedMonth);
  const monthSavings = state.savings.filter(x => monthKey(x.date) === selectedMonth);
  const monthBills = state.bills.filter(x => monthKey(x.dueDate) === selectedMonth);

  const monthlyIncome = monthEntries.filter(x => x.type === "income").reduce((a,b) => a + Number(b.amount), 0);
  const monthlyExpenses = monthEntries.filter(x => x.type === "expense").reduce((a,b) => a + Number(b.amount), 0);
  const monthlySavings = monthSavings.reduce((a,b) => a + Number(b.amount), 0);
  const paidBills = monthBills.filter(x => x.status === "Paid").reduce((a,b) => a + Number(b.amount), 0);
  const unpaidBills = monthBills.filter(x => x.status === "Unpaid").reduce((a,b) => a + Number(b.amount), 0);
  const remainingBalance = monthlyIncome - monthlyExpenses - paidBills - monthlySavings;

  const weekly = {};
  for (let i=1;i<=6;i++) weekly[i] = { income:0, expense:0, savings:0 };
  monthEntries.forEach(item => { weekly[getWeekOfMonth(item.date)][item.type] += Number(item.amount); });
  monthSavings.forEach(item => { weekly[getWeekOfMonth(item.date)].savings += Number(item.amount); });

  return { selectedMonth, monthEntries, monthSavings, monthBills, monthlyIncome, monthlyExpenses, monthlySavings, paidBills, unpaidBills, remainingBalance, weekly };
}

function recentTransferItems() {
  return state.transfers.map(x => ({
    ...x,
    section: "transfers",
    type: "transfer",
    date: x.date,
    displayTitle: `${x.fromName} → ${x.toName}`,
    amount: x.amount,
    note: x.note || ""
  }));
}
function accountOptionList(selected = "") {
  return state.accounts.map(a => `<option value="${a.id}" ${a.id === selected ? "selected" : ""}>${escapeHtml(a.name)}</option>`).join("");
}
function transferCard(item) {
  return `<div class="history-item" data-card-id="${item.id}">
    <div class="row">
      <div>
        <h4>${escapeHtml(item.fromName)} → ${escapeHtml(item.toName)} <span class="badge account">transfer</span></h4>
        <div class="muted" style="margin-top:8px">${item.date}</div>
        ${item.note ? `<div class="muted">${escapeHtml(item.note)}</div>` : ""}
      </div>
      <div style="text-align:right">
        <div class="text-purple" style="font-size:28px;font-weight:900">${peso.format(item.amount)}</div>
      </div>
    </div>
  </div>`;
}
function totalAccountBalance() {
  return state.accounts.reduce((sum, a) => sum + Number(a.balance || 0), 0);
}
function recentItems() {
  return [
    ...state.entries.map(x => ({ ...x, section:"entries", displayTitle:x.label })),
    ...state.bills.map(x => ({ ...x, section:"bills", type:"bill", date:x.dueDate, displayTitle:x.name })),
    ...state.savings.map(x => ({ ...x, section:"savings", type:"saving", date:x.date, displayTitle:x.label })),
    ...state.accounts.map(x => ({ ...x, section:"accounts", type:"account", date:todayISO(), displayTitle:x.name, amount:x.balance })),
    ...recentTransferItems()
  ].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 8);
}
function reminderItems() {
  return state.bills.filter(x => x.status !== "Paid").map(x => ({ ...x, dueInfo: dueStatus(x.dueDate, x.status) })).filter(x => x.dueInfo.type === "overdue" || x.dueInfo.type === "due-soon").sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate));
}
function monthCompareInsight() {
  const current = computeMonth(state.selectedMonth);
  const prev = computeMonth(shiftMonthKey(state.selectedMonth, -1));
  return { diff: current.monthlyExpenses - prev.monthlyExpenses, prev: prev.monthlyExpenses, current: current.monthlyExpenses };
}
function topExpenseCategory(selectedMonth) {
  const map = {};
  state.entries.filter(e => e.type === "expense" && monthKey(e.date) === selectedMonth).forEach(e => {
    map[e.category] = (map[e.category] || 0) + Number(e.amount);
  });
  const entries = Object.entries(map).sort((a,b)=>b[1]-a[1]);
  return entries[0] || null;
}
function calendarCells(selectedMonth) {
  const [year, month] = selectedMonth.split("-").map(Number);
  const first = new Date(year, month - 1, 1);
  const startOffset = first.getDay();
  const days = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i=0;i<startOffset;i++) cells.push({ muted:true });
  for (let day=1; day<=days; day++) {
    const d = `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    const income = state.entries.filter(e => e.type === "income" && e.date === d).reduce((s,e)=>s+Number(e.amount),0);
    const expense = state.entries.filter(e => e.type === "expense" && e.date === d).reduce((s,e)=>s+Number(e.amount),0);
    cells.push({ day, income, expense });
  }
  return cells;
}
function budgetStatusForMonth() {
  return state.budgets.filter(b => b.month === state.selectedMonth).map(b => {
    const spent = state.entries.filter(e => e.type === "expense" && e.category === b.category && monthKey(e.date) === b.month).reduce((s,e)=>s+Number(e.amount),0);
    return { ...b, spent, remaining: Number(b.limit) - spent, exceeded: spent > Number(b.limit) };
  });
}
function monthlyTrend(monthsBack = 6) {
  const points = [];
  let current = state.selectedMonth;
  for (let i = monthsBack - 1; i >= 0; i--) {
    const key = shiftMonthKey(current, -i);
    const m = computeMonth(key);
    points.push({ label: formatMonthLabel(key).split(" ")[0], income: m.monthlyIncome, expense: m.monthlyExpenses, savings: m.monthlySavings });
  }
  return points;
}
function weeklyDayTrend(weekNum) {
  const sel = state.selectedMonth;
  const [year, month] = sel.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const points = [];
  for (let day=1; day<=daysInMonth; day++) {
    const d = `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    if (getWeekOfMonth(d) !== Number(weekNum)) continue;
    const income = state.entries.filter(e => e.type === "income" && e.date === d).reduce((s,e)=>s+Number(e.amount),0);
    const expense = state.entries.filter(e => e.type === "expense" && e.date === d).reduce((s,e)=>s+Number(e.amount),0);
    const savings = state.savings.filter(s => s.date === d).reduce((sum,s)=>sum+Number(s.amount),0);
    points.push({ label: String(day), income, expense, savings });
  }
  return points.length ? points : [{ label:"No data", income:0, expense:0, savings:0 }];
}

function setFocus(section, id) {
  state.focusItem = { section, id };
}
function navigateToItem(section, id) {
  if (section === "entries") state.activeTab = "income-expense";
  else if (section === "bills") state.activeTab = "bills";
  else if (section === "savings") state.activeTab = "savings";
  else if (section === "accounts") state.activeTab = "accounts";
  setFocus(section, id);
  saveState();
  render();
  setTimeout(() => {
    const el = document.querySelector(`[data-card-id="${id}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, 120);
  setTimeout(() => {
    state.focusItem = null;
    saveState();
    render();
  }, 1800);
}

function openInsight(type) {
  const current = computeMonth(state.selectedMonth);
  const prevKey = shiftMonthKey(state.selectedMonth, -1);
  const prev = computeMonth(prevKey);
  const diff = current.monthlyExpenses - prev.monthlyExpenses;
  const expenseItems = state.entries.filter(e => e.type === "expense" && monthKey(e.date) === state.selectedMonth);
  const categoryMap = {};
  expenseItems.forEach(e => { categoryMap[e.category] = (categoryMap[e.category] || 0) + Number(e.amount); });
  const sorted = Object.entries(categoryMap).sort((a,b)=>b[1]-a[1]);
  const top = sorted[0] || null;

  if (type === "expense-change") {
    state.insightModal = {
      title: "Expense change vs last month",
      subtitle: `Comparing ${formatMonthLabel(prevKey)} and ${formatMonthLabel(state.selectedMonth)}`,
      html: `
        <div class="info-item"><div class="muted">Last month expenses</div><div style="font-size:28px;font-weight:900">${peso.format(prev.monthlyExpenses)}</div></div>
        <div class="info-item"><div class="muted">This month expenses</div><div style="font-size:28px;font-weight:900">${peso.format(current.monthlyExpenses)}</div></div>
        <div class="info-item"><div class="muted">Difference</div><div style="font-size:28px;font-weight:900" class="${diff > 0 ? "text-orange" : diff < 0 ? "text-green" : ""}">${diff === 0 ? "No change" : diff > 0 ? peso.format(diff) + " higher" : peso.format(Math.abs(diff)) + " lower"}</div></div>
      `
    };
  } else {
    const totalExpenses = expenseItems.reduce((s,e)=>s+Number(e.amount),0);
    const pct = top && totalExpenses ? ((top[1]/totalExpenses)*100).toFixed(1) : "0.0";
    const related = top ? expenseItems.filter(e => e.category === top[0]) : [];
    state.insightModal = {
      title: "Top expense category",
      subtitle: formatMonthLabel(state.selectedMonth),
      html: top ? `
        <div class="info-item"><div class="muted">Top category</div><div style="font-size:28px;font-weight:900">${top[0]}</div></div>
        <div class="info-item"><div class="muted">Total spent</div><div style="font-size:28px;font-weight:900">${peso.format(top[1])}</div></div>
        <div class="info-item"><div class="muted">Share of monthly expenses</div><div style="font-size:28px;font-weight:900">${pct}%</div></div>
        <div class="info-list">${related.map(x => `<div class="info-item"><div style="font-weight:900">${escapeHtml(x.label)}</div><div class="muted">${x.date}</div><div class="muted">${escapeHtml(x.note || "")}</div><div style="margin-top:6px;font-weight:900">${peso.format(x.amount)}</div></div>`).join("")}</div>
      ` : `<div class="info-item">No expense data yet.</div>`
    };
  }
  render();
}


function getAiModeLabel() {
  return state.aiMode === "online"
    ? "Online mode only sends your message for broader help. Your stored app data is not sent."
    : "Local mode keeps your data on this device. Because replies are generated locally, answers can be limited and some questions may not get a full response.";
}
function smartOnlineStyleReply(q) {
  const text = String(q || "").toLowerCase();
  if (text.includes("hi") || text.includes("hello") || text.includes("hey")) {
    return "Hello! I'm Zed Bot. Online mode is active. Only the message you type is meant to be used here, not your stored app data.";
  }
  if (text.includes("budget")) {
    return "A simple budget tip: separate fixed bills first, then set a weekly limit for flexible spending.";
  }
  if (text.includes("save") || text.includes("saving")) {
    return "Try saving a fixed amount as soon as income comes in. Even a small amount works if you stay consistent.";
  }
  if (text.includes("debt") || text.includes("loan")) {
    return "Focus on due dates first, then reduce the most urgent or highest-cost debt when possible.";
  }
  return "Online mode is best for general advice. For personal money analysis, local mode is safer because it keeps your data on your device.";
}

function smartAssistantReply(q) {
  const text = q.toLowerCase();
  const m = computeMonth(state.selectedMonth);
  const remindersCount = reminderItems().length;
  const expenseItems = state.entries.filter(e => e.type === "expense" && monthKey(e.date) === state.selectedMonth);
  const cat = {};
  expenseItems.forEach(e => { cat[e.category] = (cat[e.category] || 0) + Number(e.amount); });
  const top = Object.entries(cat).sort((a,b)=>b[1]-a[1])[0];
  if (text.includes("save") || text.includes("saving")) {
    if (top) return `Your top expense this month is ${top[0]} at ${peso.format(top[1])}. Try setting a lower budget for ${top[0]} and move a fixed amount into savings first.`;
    return "Try saving a fixed amount right after income comes in, even a small amount each week.";
  }
  if (text.includes("expense") || text.includes("spend")) {
    if (top) return `You are spending the most on ${top[0]} this month. Total expenses are ${peso.format(m.monthlyExpenses)}.`;
    return "You do not have enough expense data yet to analyze spending.";
  }
  if (text.includes("bill") || text.includes("loan") || text.includes("due")) {
    return remindersCount ? `You have ${remindersCount} urgent bill reminder${remindersCount === 1 ? "" : "s"} right now. Check the reminders panel and prioritize anything marked due today or overdue.` : "You do not have any urgent bill reminders right now.";
  }
  if (text.includes("budget")) {
    return "Use the Budgets section to set a monthly category limit. Start with food or transport because those are usually the easiest to control.";
  }
  return "Tip: review your monthly summary first, then check your top expense category and upcoming bills. That gives the fastest picture of where your money is going.";
}
function askAssistant(question) {
  const q = String(question || "").trim();
  if (!q) return;
  state.assistantMessages.push({ role: "user", text: q });
  const reply = state.aiMode === "online" ? smartOnlineStyleReply(q) : smartAssistantReply(q);
  state.assistantMessages.push({ role: "bot", text: reply });
  const input = document.getElementById("assistantInput");
  if (input) input.value = "";
  saveState();
  render();
}

function drawLineChart(canvas, points) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  const pad = { top:20, right:20, bottom:50, left:55 };
  ctx.clearRect(0,0,w,h);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0,0,w,h);

  const allValues = points.flatMap(p => [p.income, p.expense, p.savings]);
  const max = Math.max(100, ...allValues);
  const chartW = w - pad.left - pad.right;
  const chartH = h - pad.top - pad.bottom;

  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1;
  for (let i=0;i<=4;i++) {
    const y = pad.top + (chartH / 4) * i;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(w - pad.right, y); ctx.stroke();
    const val = Math.round(max - (max/4)*i);
    ctx.fillStyle = "#64748b";
    ctx.font = "12px sans-serif";
    ctx.fillText(val.toLocaleString(), 8, y + 4);
  }
  function drawSeries(key, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    points.forEach((p, i) => {
      const x = pad.left + (chartW / Math.max(1, points.length - 1)) * i;
      const y = pad.top + chartH - ((p[key] || 0) / max) * chartH;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
    points.forEach((p, i) => {
      const x = pad.left + (chartW / Math.max(1, points.length - 1)) * i;
      const y = pad.top + chartH - ((p[key] || 0) / max) * chartH;
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
    });
  }
  drawSeries("income", "#16a34a");
  drawSeries("expense", "#dc2626");
  drawSeries("savings", "#0ea5e9");

  ctx.fillStyle = "#64748b";
  ctx.font = "12px sans-serif";
  points.forEach((p, i) => {
    const x = pad.left + (chartW / Math.max(1, points.length - 1)) * i;
    ctx.fillText(p.label, x - 10, h - 16);
  });
}

function openWeekGraph(weekNum) {
  state.graphModal = {
    title: `Week ${weekNum} graph`,
    subtitle: `Daily trend for ${formatMonthLabel(state.selectedMonth)}`,
    points: weeklyDayTrend(weekNum)
  };
  render();
}
function openMonthGraph() {
  state.graphModal = {
    title: "6-month trend",
    subtitle: "Income, expenses, and savings",
    points: monthlyTrend(6)
  };
  render();
}
function closeGraph() {
  state.graphModal = null;
  render();
}

function summaryCard(title, value, hint, iconType, tint, card) {
  return `<button class="sum-card ${tint}" type="button" data-card="${card}">
    <div class="sum-inner">
      <div class="sum-head">
        <div>
          <p class="sum-title">${title}</p>
          <p class="sum-value ${card === "balance" ? "text-green" : ""}">${value}</p>
          <p class="sum-hint">${hint}</p>
        </div>
        <div class="icon-chip">${iconEmoji(iconType)}</div>
      </div>
    </div>
  </button>`;
}
function tabButton(value, label) {
  return `<button class="tab ${state.activeTab === value ? "active" : ""}" data-tab="${value}">${label}</button>`;
}
function emptyHtml(title, subtitle) {
  return `<div class="empty"><div style="font-size:26px;font-weight:900">${title}</div><div class="muted" style="margin-top:8px">${subtitle}</div></div>`;
}
function entryCard(item) {
  return `<div class="history-item ${state.focusItem?.section === "entries" && state.focusItem?.id === item.id ? "focused-card" : ""}" data-card-id="${item.id}">
    <div class="row">
      <div>
        <h4>${escapeHtml(item.label)} <span class="badge ${item.type}">${item.type}</span></h4>
        <div class="muted" style="margin-top:8px">${item.date}</div>
        <div class="muted">${escapeHtml(item.category)}</div>
        ${item.note ? `<div class="muted">${escapeHtml(item.note)}</div>` : ""}
      </div>
      <div style="text-align:right">
        <div class="${item.type === "income" ? "text-green" : "text-red"}" style="font-size:28px;font-weight:900">${peso.format(item.amount)}</div>
        <div class="actions"><button class="btn ghost small delete-btn" data-section="entries" data-id="${item.id}">Delete</button></div>
      </div>
    </div>
  </div>`;
}
function billCard(item) {
  const dueInfo = dueStatus(item.dueDate, item.status);
  const dueBadge = dueInfo.type === "due-soon" || dueInfo.type === "overdue" ? `<span class="badge ${dueInfo.type}">${dueInfo.text}</span>` : "";
  return `<div class="history-item ${state.focusItem?.section === "bills" && state.focusItem?.id === item.id ? "focused-card" : ""}" data-card-id="${item.id}">
    <div class="row">
      <div>
        <h4>${escapeHtml(item.name)} <span class="badge bill">bill</span> <span class="badge ${item.status.toLowerCase()}">${item.status}</span> ${item.recurring ? `<span class="badge account">Recurring</span>` : ""} ${dueBadge}</h4>
        <div class="muted" style="margin-top:8px">Due: ${item.dueDate}</div>
        <div class="muted">${escapeHtml(item.category)}</div>
        ${item.note ? `<div class="muted">${escapeHtml(item.note)}</div>` : ""}
      </div>
      <div style="text-align:right">
        <div style="font-size:28px;font-weight:900">${peso.format(item.amount)}</div>
        <div class="actions">
          <button class="btn ghost small toggle-bill-btn" data-id="${item.id}">Toggle</button>
          <button class="btn ghost small delete-btn" data-section="bills" data-id="${item.id}">Delete</button>
        </div>
      </div>
    </div>
  </div>`;
}
function savingCard(item) {
  return `<div class="history-item ${state.focusItem?.section === "savings" && state.focusItem?.id === item.id ? "focused-card" : ""}" data-card-id="${item.id}">
    <div class="row">
      <div>
        <h4>${escapeHtml(item.label)} <span class="badge saving">saving</span></h4>
        <div class="muted" style="margin-top:8px">${item.date}</div>
        ${item.note ? `<div class="muted">${escapeHtml(item.note)}</div>` : ""}
      </div>
      <div style="text-align:right">
        <div class="text-blue" style="font-size:28px;font-weight:900">${peso.format(item.amount)}</div>
        <div class="actions"><button class="btn ghost small delete-btn" data-section="savings" data-id="${item.id}">Delete</button></div>
      </div>
    </div>
  </div>`;
}
function accountCard(item) {
  return `<div class="history-item ${state.focusItem?.section === "accounts" && state.focusItem?.id === item.id ? "focused-card" : ""}" data-card-id="${item.id}">
    <div class="row">
      <div>
        <h4>${escapeHtml(item.name)} <span class="badge account">${escapeHtml(item.type)}</span></h4>
        ${item.note ? `<div class="muted" style="margin-top:8px">${escapeHtml(item.note)}</div>` : `<div class="muted" style="margin-top:8px">No note</div>`}
      </div>
      <div style="text-align:right">
        <div class="text-purple" style="font-size:28px;font-weight:900">${peso.format(item.balance)}</div>
        <div class="actions"><button class="btn ghost small delete-btn" data-section="accounts" data-id="${item.id}">Delete</button></div>
      </div>
    </div>
  </div>`;
}
function recentCard(item) {
  return `<div class="history-item clickable" data-nav-section="${item.section}" data-nav-id="${item.id}">
    <div class="row">
      <div>
        <h4>${escapeHtml(item.displayTitle)} <span class="badge ${item.type}">${item.type}</span> ${item.status ? `<span class="badge ${item.status.toLowerCase()}">${item.status}</span>` : ""}</h4>
        <div class="muted" style="margin-top:8px">${item.date || ""}</div>
        ${item.category ? `<div class="muted">${escapeHtml(item.category)}</div>` : ""}
        ${item.note ? `<div class="muted">${escapeHtml(item.note)}</div>` : ""}
      </div>
      <div style="text-align:right">
        <div style="font-size:28px;font-weight:900">${item.amount !== undefined ? peso.format(Number(item.amount)) : ""}</div>
        <div class="actions">
          ${item.section === "bills" ? `<button class="btn ghost small toggle-bill-btn" data-id="${item.id}">Toggle</button>` : ""}
          ${item.section !== "transfers" ? `<button class="btn ghost small delete-btn" data-section="${item.section}" data-id="${item.id}">Delete</button>` : ""}
        </div>
      </div>
    </div>
  </div>`;
}
function reminderCard(item) {
  return `<div class="notice clickable ${item.dueInfo.type}" data-reminder-id="${item.id}">
    <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">
      <div>
        <div style="font-weight:900;font-size:22px">${escapeHtml(item.name)}</div>
        <div class="muted">Due date: ${item.dueDate}</div>
        <div class="muted">${escapeHtml(item.category)}</div>
      </div>
      <div style="text-align:right">
        <div style="font-weight:900">${peso.format(item.amount)}</div>
        <div class="badge ${item.dueInfo.type}">${item.dueInfo.text}</div>
      </div>
    </div>
  </div>`;
}


function renderProfileLaunch() {
  const names = getProfileNames();
  const hasProfiles = names.length > 0;
  const launchMode = state?.launchMode || "default";
  const dropdownOpen = state?.launchDropdownOpen || false;

  const defaultControls = hasProfiles ? `
    <div class="launch-stack" style="margin-top:4px;">
      <div class="launch-dropdown">
        <button class="launch-action" type="button" id="launchProfileToggleBtn">
          Choose Profile ▼
        </button>
        ${dropdownOpen ? `
          <div class="launch-dropdown-menu">
            ${names.map(name => `<button class="launch-dropdown-item" type="button" data-launch-profile="${escapeHtml(name)}">${escapeHtml(name)}</button>`).join("")}
          </div>
        ` : ""}
      </div>
      <button class="launch-action secondary" type="button" id="launchAddProfileBtn">ADD PROFILE</button>
    </div>
  ` : `
    <div class="launch-stack" style="margin-top:4px;">
      <button class="launch-action secondary" type="button" id="launchAddProfileBtn">ADD PROFILE</button>
    </div>
  `;

  const addProfileControls = `
    <div class="launch-form">
      <input id="launchNewProfileInput" placeholder="Enter profile name" />
      <button class="launch-action secondary" type="button" id="launchSaveProfileBtn">ADD PROFILE</button>
      <button class="btn ghost" type="button" id="launchCancelAddProfileBtn">Back</button>
    </div>
  `;

  return `
    <div class="launch-shell">
      <div class="launch-panel">
        <div class="launch-brand" style="justify-content:center;">
          <div class="launch-brand-icon"><img src="icons/icon-192.png" alt="Ztracker icon" /></div>
          <h1>ZTracker</h1>
        </div>

        <div class="launch-message">
          WELCOME PLEASE CREATE OR CHOOSE A PROFILE
        </div>

        ${launchMode === "add" ? addProfileControls : defaultControls}
      </div>

      <div id="launchConfirmModal" class="confirm-backdrop ${state?.pendingProfileOpen ? "show" : ""}">
        <div class="confirm-panel">
          <h3>Open Profile</h3>
          <p>Open this profile ${state?.pendingProfileOpen ? `<strong>"${escapeHtml(state.pendingProfileOpen)}"</strong>` : ""}?</p>
          <div class="confirm-actions">
            <button class="btn ghost" type="button" id="cancelProfileOpenBtn">Cancel</button>
            <button class="btn" type="button" id="confirmProfileOpenBtn">Open</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderProfileSelectorInline() {
  return `
    <div class="header-profile-bar">
      <div class="select-wrap">
        <select id="profileSelect">
          ${getProfileNames().map(p => `<option value="${escapeHtml(p)}" ${p === currentProfile ? "selected" : ""}>${escapeHtml(p)}</option>`).join("")}
        </select>
      </div>
      <button id="addProfileBtn" class="btn small" type="button">+</button>
    </div>
  `;
}


function ensureVersionNotice() {
  if (!state || !currentProfile) return;
  if (state.seenVersion !== APP_VERSION) {
    if (!Array.isArray(state.assistantMessages)) state.assistantMessages = [];
    state.assistantMessages.push({
      role: "bot",
      text: `Update ${APP_VERSION}: Zed Bot is now a floating chat with an unread badge, and account transfers are available in Accounts.`
    });
    if (!state.assistantOpen) state.assistantUnread = (state.assistantUnread || 0) + 1;
    state.seenVersion = APP_VERSION;
    saveState();
  }
}


function scrollAssistantToBottom() {
  const el = document.getElementById("assistantMessages");
  if (el) el.scrollTop = el.scrollHeight;
}

function render() {
  const app = document.getElementById("app");
  applyBackground();

  if (!currentProfile) {
    state.settingsOpen = false;
    state.assistantOpen = false;
    state.graphModal = null;
    state.insightModal = null;
    app.innerHTML = renderProfileLaunch();
    bindProfileLaunchEvents();
    return;
  }

  ensureVersionNotice();
  ensureRecurringBills();
  const m = computeMonth();
  const entriesFiltered = state.entryFilter === "all" ? m.monthEntries : m.monthEntries.filter(x => x.type === state.entryFilter);
  const billsFiltered = state.billFilter === "all" ? m.monthBills : m.monthBills.filter(x => x.status.toLowerCase() === state.billFilter);
  const reminders = reminderItems();
  const compare = monthCompareInsight();
  const topCat = topExpenseCategory(state.selectedMonth);
  const budgets = budgetStatusForMonth();
  const calendar = calendarCells(state.selectedMonth);

  app.innerHTML = `
    <div class="shell">
      ${renderProfileSelectorInline()}
      <div class="topbar">
        <button class="brand-btn" id="goHomeBtn" aria-label="Go home">
          <img src="icons/icon-192.png" alt="Ztracker icon" />
          <div>
            <h1>Ztracker</h1>
            <p>Tap the logo any time to go back home</p>
          </div>
        </button>

        <div class="header-tools">
          <button class="btn ghost icon" id="prevMonthBtn" aria-label="Previous month">←</button>
          <div class="select-wrap">
            <select id="monthSelect">
              ${getAllMonths().map(month => `<option value="${month}" ${month === m.selectedMonth ? "selected" : ""}>${formatMonthLabel(month)}</option>`).join("")}
            </select>
          </div>
          <button class="btn ghost icon" id="nextMonthBtn" aria-label="Next month">→</button>
          <button class="btn secondary" id="openSettingsBtn" aria-label="Settings">Settings</button>
        </div>
      </div>

      <div class="cards">
        ${summaryCard("Total Income", peso.format(m.monthlyIncome), "Tap to filter income", "income", "tint-income", "income")}
        ${summaryCard("Total Expenses", peso.format(m.monthlyExpenses), "Tap to filter expenses", "expense", "tint-expense", "expense")}
        ${summaryCard("Total Savings", peso.format(m.monthlySavings), "Tap to open savings", "saving", "tint-savings", "savings")}
        ${summaryCard("Paid Bills", peso.format(m.paidBills), "Tap to filter paid bills", "paid", "tint-paid", "paid-bills")}
        ${summaryCard("Unpaid Bills", peso.format(m.unpaidBills), "Tap to filter unpaid bills", "bill", "tint-unpaid", "unpaid-bills")}
        ${summaryCard("Remaining Balance", peso.format(m.remainingBalance), "Tap to go home", "balance", "tint-balance", "balance")}
      </div>

      <div class="grid">
        <div>
          <div class="panel"><div class="panel-body">
            <div class="tabs">
              ${tabButton("home","Home")}
              ${tabButton("income-expense","Income / Expense")}
              ${tabButton("bills","Bills")}
              ${tabButton("savings","Savings")}
              ${tabButton("accounts","Accounts")}
              ${tabButton("budgets","Budgets")}
            </div>

            <section class="section ${state.activeTab === "home" ? "active" : ""}">
              <h2 class="panel-title">Home</h2>
              <div class="two-col">
                <div class="card-box">
                  <h3>Weekly Summary</h3>
                  <div class="week-grid">
                    ${Object.entries(m.weekly).map(([week, values]) => `
                      <button class="week-item clickable graph-week-btn" data-week="${week}">
                        <div style="font-size:28px;font-weight:900">Week ${week}</div>
                        <div class="muted" style="margin-top:10px">Income: <span class="text-green">${peso.format(values.income)}</span></div>
                        <div class="muted">Expenses: <span class="text-red">${peso.format(values.expense)}</span></div>
                        <div class="muted">Savings: <span class="text-blue">${peso.format(values.savings)}</span></div>
                        <div class="muted" style="margin-top:8px;font-weight:700">Tap for graph</div>
                      </button>
                    `).join("")}
                  </div>
                </div>
                <div class="card-box">
                  <h3>Monthly Summary</h3>
                  <div class="stack">
                    <button class="week-item clickable graph-month-btn" type="button"><div style="font-weight:900;font-size:26px">6-Month Trend</div><div class="muted" style="margin-top:6px">Tap for line graph popup</div></button>
                    <div class="week-item"><div style="font-weight:900;font-size:26px">Income</div><div class="text-green">${peso.format(m.monthlyIncome)}</div></div>
                    <div class="week-item"><div style="font-weight:900;font-size:26px">Expenses</div><div class="text-red">${peso.format(m.monthlyExpenses)}</div></div>
                    <div class="week-item"><div style="font-weight:900;font-size:26px">Savings</div><div class="text-blue">${peso.format(m.monthlySavings)}</div></div>
                    <div class="week-item"><div style="font-weight:900;font-size:26px">Paid Bills</div><div class="text-purple">${peso.format(m.paidBills)}</div></div>
                    <div class="week-item"><div style="font-weight:900;font-size:26px">Unpaid Bills</div><div class="text-orange">${peso.format(m.unpaidBills)}</div></div>
                  </div>
                </div>
              </div>

              <div class="two-col" style="margin-top:18px">
                <div class="card-box">
                  <h3>Insights</h3>
                  <div class="stack">
                    <button class="insight clickable" type="button" data-insight="expense-change">
                      <div style="font-weight:900">Expense change vs last month</div>
                      <div class="${compare.diff <= 0 ? 'text-green' : 'text-orange'}" style="font-size:26px;font-weight:900;margin-top:6px">
                        ${compare.diff === 0 ? "No change" : compare.diff > 0 ? `${peso.format(compare.diff)} higher` : `${peso.format(Math.abs(compare.diff))} lower`}
                      </div>
                    </button>
                    <button class="insight clickable" type="button" data-insight="top-category">
                      <div style="font-weight:900">Top expense category this month</div>
                      <div style="font-size:22px;font-weight:900;margin-top:6px">${topCat ? escapeHtml(topCat[0]) : "No expense data yet"}</div>
                      <div class="muted">${topCat ? peso.format(topCat[1]) : ""}</div>
                    </button>
                  </div>
                </div>
                <div class="card-box">
                  <h3>Calendar View</h3>
                  <div class="calendar-grid">
                    ${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => `<div class="calendar-head">${d}</div>`).join("")}
                    ${calendar.map(cell => cell.muted ? `<div class="calendar-day muted-cell"></div>` : `<div class="calendar-day"><div class="calendar-date">${cell.day}</div>${cell.income ? `<div class='calendar-amt text-green'>+ ${peso.format(cell.income)}</div>` : ""}${cell.expense ? `<div class='calendar-amt text-red'>- ${peso.format(cell.expense)}</div>` : ""}</div>`).join("")}
                  </div>
                </div>
              </div>
            </section>

            <section class="section ${state.activeTab === "income-expense" ? "active" : ""}">
              <h2 class="panel-title">Add Income / Expense</h2>
              <div class="field-grid">
                <div class="field"><label>Type</label><select id="entryType"><option value="income">Income</option><option value="expense">Expense</option></select></div>
                <div class="field"><label>Date</label><input id="entryDate" type="date" value="${todayISO()}" /></div>
                <div class="field"><label>Category</label><select id="entryCategory"></select></div>
                <div class="field"><label>Add Custom Category</label><div class="inline"><input id="newEntryCategory" placeholder="New category" /><button class="btn ghost small" id="addEntryCategoryBtn">Add</button></div></div>
                <div class="field"><label>Label</label><input id="entryLabel" placeholder="e.g. Salary, Grocery" /></div>
                <div class="field"><label>Amount</label><input id="entryAmount" type="number" placeholder="0.00" /></div>
                <div class="field full"><label>Notes</label><input id="entryNote" placeholder="Optional notes" /></div>
                <div class="field full"><button class="btn" id="saveEntryBtn">Save Entry</button></div>
              </div>
              <div class="panel" style="margin-top:18px"><div class="panel-body">
                <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap">
                  <h3 style="font-size:32px;margin:0">Entry History</h3>
                  <div class="select-wrap" style="min-width:180px">
                    <select id="entryFilterSelect">
                      <option value="all" ${state.entryFilter === "all" ? "selected" : ""}>All Entries</option>
                      <option value="income" ${state.entryFilter === "income" ? "selected" : ""}>Income</option>
                      <option value="expense" ${state.entryFilter === "expense" ? "selected" : ""}>Expenses</option>
                    </select>
                  </div>
                </div>
                <div class="stack" style="margin-top:14px">${entriesFiltered.length ? entriesFiltered.map(entryCard).join("") : emptyHtml("No entries yet","Add your first income or expense.")}</div>
              </div></div>
            </section>

            <section class="section ${state.activeTab === "bills" ? "active" : ""}">
              <h2 class="panel-title">Bills & Installments</h2>
              <div class="field-grid">
                <div class="field"><label>Bill / Installment Name</label><input id="billName" placeholder="e.g. Electricity, Loan 1" /></div>
                <div class="field"><label>Amount</label><input id="billAmount" type="number" placeholder="0.00" /></div>
                <div class="field"><label>Due Date</label><input id="billDueDate" type="date" value="${todayISO()}" /></div>
                <div class="field"><label>Status</label><select id="billStatus"><option>Unpaid</option><option>Paid</option></select></div>
                <div class="field"><label>Category</label><select id="billCategory">${state.billCategories.map(c => `<option>${escapeHtml(c)}</option>`).join("")}</select></div>
                <div class="field"><label>Add Custom Bill Category</label><div class="inline"><input id="newBillCategory" placeholder="New bill category" /><button class="btn ghost small" id="addBillCategoryBtn">Add</button></div></div>
                <div class="field full"><label>Note</label><input id="billNote" placeholder="Optional note" /></div>
                <div class="field"><label>Recurring monthly?</label><select id="billRecurring"><option value="false">No</option><option value="true">Yes</option></select></div>
                <div class="field"><label>&nbsp;</label><button class="btn" id="saveBillBtn">Add Bill</button></div>
              </div>
              <div class="panel" style="margin-top:18px"><div class="panel-body">
                <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap">
                  <h3 style="font-size:32px;margin:0">Bills List</h3>
                  <div class="select-wrap" style="min-width:180px">
                    <select id="billFilterSelect">
                      <option value="all" ${state.billFilter === "all" ? "selected" : ""}>All Bills</option>
                      <option value="paid" ${state.billFilter === "paid" ? "selected" : ""}>Paid</option>
                      <option value="unpaid" ${state.billFilter === "unpaid" ? "selected" : ""}>Unpaid</option>
                    </select>
                  </div>
                </div>
                <div class="stack" style="margin-top:14px">${billsFiltered.length ? billsFiltered.map(billCard).join("") : emptyHtml("No bills yet","Add your first bill or installment.")}</div>
              </div></div>
            </section>

            <section class="section ${state.activeTab === "savings" ? "active" : ""}">
              <h2 class="panel-title">Savings Tracker</h2>
              <div class="field-grid">
                <div class="field"><label>Date</label><input id="savingDate" type="date" value="${todayISO()}" /></div>
                <div class="field"><label>Amount</label><input id="savingAmount" type="number" placeholder="0.00" /></div>
                <div class="field full"><label>Label / Category</label><input id="savingLabel" placeholder="e.g. Emergency fund" /></div>
                <div class="field full"><label>Note</label><input id="savingNote" placeholder="Optional note" /></div>
                <div class="field full"><button class="btn" id="saveSavingBtn">Add Savings</button></div>
              </div>
              <div class="panel" style="margin-top:18px"><div class="panel-body">
                <h3 style="font-size:32px;margin:0 0 14px 0">Savings History</h3>
                <div class="stack">${m.monthSavings.length ? m.monthSavings.map(savingCard).join("") : emptyHtml("No savings this month","Add a savings entry to start tracking.")}</div>
              </div></div>
            </section>

            <section class="section ${state.activeTab === "accounts" ? "active" : ""}">
              <h2 class="panel-title">Accounts & Balances</h2>
              <div class="three-col" style="margin-bottom:18px">
                <div class="week-item"><div style="font-size:24px;font-weight:900">Total Account Balance</div><div class="text-purple" style="font-size:30px;font-weight:900;margin-top:8px">${peso.format(totalAccountBalance())}</div></div>
                <div class="week-item"><div style="font-size:24px;font-weight:900">Accounts</div><div style="font-size:30px;font-weight:900;margin-top:8px">${state.accounts.length}</div></div>
                <div class="week-item"><div style="font-size:24px;font-weight:900">Transfers</div><div style="font-size:30px;font-weight:900;margin-top:8px">${state.transfers.length}</div></div>
              </div>

              <div class="two-col">
                <div class="panel"><div class="panel-body">
                  <h3 style="font-size:32px;margin:0 0 14px 0">Add Account</h3>
                  <div class="field-grid">
                    <div class="field"><label>Account Name</label><input id="accountName" placeholder="e.g. GCash 1" /></div>
                    <div class="field"><label>Balance</label><input id="accountBalance" type="number" placeholder="0.00" /></div>
                    <div class="field"><label>Type</label><select id="accountType">${state.accountTypes.map(t => `<option>${escapeHtml(t)}</option>`).join("")}</select></div>
                    <div class="field"><label>Add Custom Type</label><div class="inline"><input id="newAccountType" placeholder="New type" /><button class="btn ghost small" id="addAccountTypeBtn">Add</button></div></div>
                    <div class="field full"><label>Note</label><input id="accountNote" placeholder="Optional note" /></div>
                    <div class="field full"><button class="btn" id="saveAccountBtn">Add Account</button></div>
                  </div>
                </div></div>

                <div class="panel"><div class="panel-body">
                  <h3 style="font-size:32px;margin:0 0 14px 0">Transfer Between Accounts</h3>
                  ${state.accounts.length >= 2 ? `
                    <div class="field-grid">
                      <div class="field"><label>From</label><select id="transferFrom">${accountOptionList()}</select></div>
                      <div class="field"><label>To</label><select id="transferTo">${accountOptionList()}</select></div>
                      <div class="field"><label>Amount</label><input id="transferAmount" type="number" placeholder="0.00" /></div>
                      <div class="field"><label>Date</label><input id="transferDate" type="date" value="${todayISO()}" /></div>
                      <div class="field full"><label>Note</label><input id="transferNote" placeholder="Optional note" /></div>
                      <div class="field full"><button class="btn" id="saveTransferBtn">Transfer</button></div>
                    </div>
                  ` : emptyHtml("Need at least 2 accounts","Add two or more accounts to transfer money between them.")}
                </div></div>
              </div>

              <div class="panel" style="margin-top:18px"><div class="panel-body">
                <h3 style="font-size:32px;margin:0 0 14px 0">Saved Accounts</h3>
                <div class="stack">${state.accounts.length ? state.accounts.map(accountCard).join("") : emptyHtml("No accounts yet","Add your first GCash, bank, or cash balance.")}</div>
              </div></div>

              <div class="panel" style="margin-top:18px"><div class="panel-body">
                <h3 style="font-size:32px;margin:0 0 14px 0">Transfer History</h3>
                <div class="stack">${state.transfers.length ? state.transfers.map(transferCard).join("") : emptyHtml("No transfers yet","Transfers between your own accounts will appear here.")}</div>
              </div></div></section>

            <section class="section ${state.activeTab === "budgets" ? "active" : ""}">
              <h2 class="panel-title">Budgets</h2>
              <div class="field-grid">
                <div class="field"><label>Month</label><input id="budgetMonth" type="month" value="${state.selectedMonth}" /></div>
                <div class="field"><label>Category</label><select id="budgetCategory">${state.expenseCategories.map(c => `<option>${escapeHtml(c)}</option>`).join("")}</select></div>
                <div class="field"><label>Budget Limit</label><input id="budgetLimit" type="number" placeholder="0.00" /></div>
                <div class="field"><label>&nbsp;</label><button class="btn" id="saveBudgetBtn">Save Budget</button></div>
              </div>
              <div class="panel" style="margin-top:18px"><div class="panel-body">
                <h3 style="font-size:32px;margin:0 0 14px 0">Current Month Budget Status</h3>
                <div class="stack">${budgets.length ? budgets.map(b => `<div class="history-item"><div class="row"><div><h4>${escapeHtml(b.category)} ${b.exceeded ? `<span class='badge overdue'>Over budget</span>` : `<span class='badge paid'>Within budget</span>`}</h4><div class='muted' style='margin-top:8px'>Limit: ${peso.format(b.limit)}</div><div class='muted'>Spent: ${peso.format(b.spent)}</div></div><div style='text-align:right'><div style='font-size:28px;font-weight:900' class='${b.exceeded ? "text-red" : "text-green"}'>${peso.format(Math.abs(b.remaining))}</div><div class='muted'>${b.exceeded ? "Over" : "Remaining"}</div></div></div></div>`).join("") : emptyHtml("No budgets yet","Add a budget for this month.")}</div>
              </div></div>
            </section>
          </div></div>
        </div>

        <div class="stack">
          <div class="panel"><div class="panel-body"><h2 class="sidebar-title">Reminders</h2><div class="notice-list">${reminders.length ? reminders.map(reminderCard).join("") : emptyHtml("No urgent reminders","Bills due soon or overdue will show here.")}</div></div></div>
          <div class="panel"><div class="panel-body"><h2 class="sidebar-title">Recent Activity</h2><div class="stack">${recentItems().length ? recentItems().map(recentCard).join("") : emptyHtml("No activity yet","Your latest entries will appear here.")}</div></div></div>
        </div>
      </div>

      <button class="btn ai-fab" id="openAssistantFab" aria-label="Open Zed Bot">💬${state.assistantUnread ? `<span class="ai-badge">${state.assistantUnread > 9 ? "9+" : state.assistantUnread}</span>` : ""}</button>

      <div id="settingsModal" class="settings-backdrop ${state.settingsOpen ? "show" : ""}">
        <div class="settings-panel">
          <div class="modal-header">
            <div>
              <div style="font-size:30px;font-weight:900">Settings</div>
              <div class="muted">App settings and customization</div>
            </div>
            <button class="btn ghost" id="closeSettingsBtn">Close</button>
          </div>

          <div class="settings-section">
            <h3>Appearance</h3>
            <div class="theme-grid">
              <button class="theme-swatch preview-default" type="button" data-preset="default" title="Default"></button>
              <button class="theme-swatch preview-sky" type="button" data-preset="sky" title="Sky"></button>
              <button class="theme-swatch preview-rose" type="button" data-preset="rose" title="Rose"></button>
              <button class="theme-swatch preview-mint" type="button" data-preset="mint" title="Mint"></button>
            </div>
            <div style="margin-top:12px"><input id="bgImageInput" type="file" accept="image/*" /></div>
            <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn ghost small" id="clearBgBtn" type="button">Reset Background</button></div>
          </div>

          <div class="settings-section">
            <h3>Profile Avatar</h3>
            <div class="avatar-preview-wrap">
              ${renderAvatar(currentProfile || "User", state, 44)}
              <div>
                <div class="avatar-preview-label">${escapeHtml(currentProfile || "Current profile")}</div>
                <div class="muted">Use a color by default or upload a profile photo.</div>
              </div>
            </div>
            <div class="avatar-swatch-row">
              ${AVATAR_COLORS.map(color => `<button class="avatar-swatch ${state.avatarType === "color" && state.avatarColor === color ? "active" : ""}" style="background:${color}" type="button" data-avatar-color="${color}" title="${color}"></button>`).join("")}
            </div>
            <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">
              <input id="avatarImageInput" type="file" accept="image/*" />
              <button class="btn ghost small" id="removeAvatarBtn" type="button">Remove Photo</button>
            </div>
          </div>

          <div class="settings-section">
            
          <div class="settings-section">
            <h3>About Ztracker</h3>
            <div class="muted">Version: <strong>${APP_VERSION}</strong></div>
            <div class="muted">Last updated: ${LAST_UPDATED}</div>
          </div>

<h3>Profiles</h3>
            <div class="muted">Switch profiles here or choose again on launch.</div>
            <div class="profile-actions">
              <div class="select-wrap" style="min-width:190px">
                <select id="settingsProfileSelect">
                  ${getProfileNames().map(p => `<option value="${escapeHtml(p)}" ${p === currentProfile ? "selected" : ""}>${escapeHtml(p)}</option>`).join("")}
                </select>
              </div>
              <button class="btn ghost small" id="settingsSwitchProfileBtn" type="button">Switch</button>
              <button class="btn ghost small" id="settingsExitProfileBtn" type="button">Choose on launch</button>
            </div>
          </div>
        </div>
      </div>

      <div id="insightModal" class="info-backdrop ${state.insightModal ? "show" : ""}">
        <div class="info-panel">
          <div class="modal-header">
            <div>
              <div style="font-size:30px;font-weight:900">${state.insightModal?.title || "Insight"}</div>
              <div class="muted">${state.insightModal?.subtitle || ""}</div>
            </div>
            <button class="btn ghost" id="closeInsightBtn">Close</button>
          </div>
          <div class="stack">${state.insightModal?.html || ""}</div>
        </div>
      </div>

      <div id="assistantModal" class="assistant-window ${state.assistantOpen ? "show" : ""}">
        <div class="assistant-panel floating">
          <div class="modal-header">
            <div>
              <div style="font-size:30px;font-weight:900">Zed Bot</div>
              <div class="muted">Private and helpful money guidance</div>
            </div>
            <button class="btn ghost" id="closeAssistantBtn">Close</button>
          </div>

          <div class="assistant-mode-compact">
            <div class="mode-row">
              <span class="mode-label">Mode:</span>
              <button class="btn ${state.aiMode === "private" ? "" : "ghost"} small" id="setPrivateModeBtn" type="button">Local</button>
              <button class="btn ${state.aiMode === "online" ? "" : "ghost"} small" id="setOnlineModeBtn" type="button">Online</button>
            </div>
            <div class="mode-hint">${getAiModeLabel()}</div>
          </div>

          <div class="assistant-messages" id="assistantMessages">
            ${(state.assistantMessages.length ? state.assistantMessages : [{ role:"bot", text:"Ask things like: How can I save money? Why are my expenses high? Do I have bills due soon?" }]).map(m => `
              <div class="assistant-bubble ${m.role === "user" ? "user" : "bot"}">
                <div class="chat-row">
                  ${m.role === "user" ? renderAvatar(currentProfile || "User", state, 34) : `<div class="chat-avatar" style="background:#0f172a;width:34px;height:34px"><img src="icons/icon-192.png" alt="Zed Bot avatar" /></div>`}
                  <div class="chat-content"><strong>${m.role === "user" ? escapeHtml(currentProfile || "You") : "Zed Bot"}:</strong> ${escapeHtml(m.text)}</div>
                </div>
              </div>`).join("")}
          </div>
          <div class="assistant-footer" style="display:grid;gap:10px;margin-top:12px">
            <div class="assistant-input-row">
              <input id="assistantInput" placeholder="Ask Zed Bot anything about savings, budgeting, or bills" />
              <button class="btn" id="sendAssistantBtn" type="button">Send</button>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button class="btn ghost small assistant-suggestion" type="button" data-q="How can I save money?">How can I save money?</button>
              <button class="btn ghost small assistant-suggestion" type="button" data-q="Why are my expenses high?">Why are my expenses high?</button>
              <button class="btn ghost small assistant-suggestion" type="button" data-q="Do I have bills due soon?">Do I have bills due soon?</button>
            </div>
          </div>
        </div>
      </div>

      <div id="graphModal" class="modal-backdrop ${state.graphModal ? "show" : ""}">
        <div class="modal">
          <div class="modal-header">
            <div>
              <div style="font-size:30px;font-weight:900">${state.graphModal?.title || "Graph"}</div>
              <div class="muted">${state.graphModal?.subtitle || ""}</div>
            </div>
            <button class="btn ghost" id="closeGraphBtn" type="button">Close</button>
          </div>
          <div class="chart-wrap"><canvas id="graphCanvas" width="860" height="340"></canvas></div>
        </div>
      </div>
    </div>
  `;
  bindEvents();
  initEntryForm();
  if (state.assistantOpen) setTimeout(scrollAssistantToBottom, 0);
  if (state.graphModal) {
    const canvas = document.getElementById("graphCanvas");
    if (canvas) drawLineChart(canvas, state.graphModal.points || []);
  }
}

function initEntryForm() {
  const entryType = document.getElementById("entryType");
  const categorySelect = document.getElementById("entryCategory");
  if (!entryType || !categorySelect) return;
  function fillCats() {
    const cats = entryType.value === "income" ? state.incomeCategories : state.expenseCategories;
    categorySelect.innerHTML = cats.map(c => `<option>${escapeHtml(c)}</option>`).join("");
  }
  fillCats();
  entryType.addEventListener("change", fillCats);
}


function bindProfileLaunchEvents() {
  document.getElementById("launchAddProfileBtn")?.addEventListener("click", () => {
    state.launchMode = "add";
    state.launchDropdownOpen = false;
    state.pendingProfileOpen = null;
    render();
  });

  document.getElementById("launchCancelAddProfileBtn")?.addEventListener("click", () => {
    state.launchMode = "default";
    render();
  });

  document.getElementById("launchSaveProfileBtn")?.addEventListener("click", () => {
    const input = document.getElementById("launchNewProfileInput");
    const name = (input?.value || "").trim();
    if (!name) return alert("Please enter a profile name.");
    if (getProfileNames().length >= 5) return alert("Max 5 profiles only");
    if (!profiles[name]) profiles[name] = createEmptyProfile(name);
    chooseProfile(name);
  });

  document.getElementById("launchProfileToggleBtn")?.addEventListener("click", () => {
    state.launchDropdownOpen = !state.launchDropdownOpen;
    render();
  });

  document.querySelectorAll("[data-launch-profile]").forEach(btn => {
    btn.addEventListener("click", () => {
      state.launchDropdownOpen = false;
      state.pendingProfileOpen = btn.dataset.launchProfile;
      render();
    });
  });

  document.getElementById("cancelProfileOpenBtn")?.addEventListener("click", () => {
    state.pendingProfileOpen = null;
    render();
  });

  document.getElementById("confirmProfileOpenBtn")?.addEventListener("click", () => {
    if (state.pendingProfileOpen) chooseProfile(state.pendingProfileOpen);
  });

  document.getElementById("launchConfirmModal")?.addEventListener("click", e => {
    if (e.target.id === "launchConfirmModal") {
      state.pendingProfileOpen = null;
      render();
    }
  });
}

function bindEvents() {
  document.querySelectorAll("[data-tab]").forEach(btn => btn.addEventListener("click", () => {
    state.activeTab = btn.dataset.tab;
    saveState();
    render();
  }));
  document.querySelectorAll("[data-card]").forEach(btn => btn.addEventListener("click", () => {
    const card = btn.dataset.card;
    if (card === "income") { state.entryFilter = "income"; state.activeTab = "income-expense"; }
    else if (card === "expense") { state.entryFilter = "expense"; state.activeTab = "income-expense"; }
    else if (card === "savings") { state.activeTab = "savings"; }
    else if (card === "paid-bills") { state.billFilter = "paid"; state.activeTab = "bills"; }
    else if (card === "unpaid-bills") { state.billFilter = "unpaid"; state.activeTab = "bills"; }
    else { state.activeTab = "home"; }
    saveState();
    render();
  }));

  document.getElementById("goHomeBtn")?.addEventListener("click", () => { state.activeTab = "home"; saveState(); render(); });
  document.getElementById("prevMonthBtn")?.addEventListener("click", () => { state.selectedMonth = shiftMonthKey(state.selectedMonth, -1); saveState(); render(); });
  document.getElementById("nextMonthBtn")?.addEventListener("click", () => { state.selectedMonth = shiftMonthKey(state.selectedMonth, 1); saveState(); render(); });
  document.getElementById("monthSelect")?.addEventListener("change", e => { state.selectedMonth = e.target.value; saveState(); render(); });

  document.getElementById("profileSelect")?.addEventListener("change", e => chooseProfile(e.target.value));
  document.getElementById("addProfileBtn")?.addEventListener("click", () => {
    const name = prompt("Enter profile name");
    if (!name) return;
    if (getProfileNames().length >= 5) return alert("Max 5 profiles only");
    if (!profiles[name]) profiles[name] = createEmptyProfile(name);
    chooseProfile(name);
  });

  document.getElementById("openSettingsBtn")?.addEventListener("click", () => { state.settingsOpen = true; render(); });
  document.getElementById("closeSettingsBtn")?.addEventListener("click", () => { state.settingsOpen = false; render(); });
  document.getElementById("settingsModal")?.addEventListener("click", e => { if (e.target.id === "settingsModal") { state.settingsOpen = false; render(); } });

  document.querySelectorAll("[data-preset]").forEach(btn => btn.addEventListener("click", () => {
    saveBackground({ type: "preset", value: btn.dataset.preset });
    applyBackground();
  }));
  document.getElementById("bgImageInput")?.addEventListener("change", e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      saveBackground({ type: "image", value: reader.result });
      applyBackground();
    };
    reader.readAsDataURL(file);
  });
  document.getElementById("clearBgBtn")?.addEventListener("click", () => {
    localStorage.removeItem(BG_STORAGE_KEY);
    applyBackground();
  });

  document.getElementById("settingsSwitchProfileBtn")?.addEventListener("click", () => {
    const sel = document.getElementById("settingsProfileSelect");
    if (sel?.value) chooseProfile(sel.value);
  });
  document.getElementById("settingsExitProfileBtn")?.addEventListener("click", () => exitToProfilePicker());

  document.getElementById("openAssistantFab")?.addEventListener("click", () => { state.assistantOpen = true; state.assistantUnread = 0; saveState(); render(); });
  document.getElementById("closeAssistantBtn")?.addEventListener("click", () => { state.assistantOpen = false; saveState(); render(); });
  document.getElementById("setPrivateModeBtn")?.addEventListener("click", () => {
    state.aiMode = "private";
    saveState();
    render();
  });
  document.getElementById("setOnlineModeBtn")?.addEventListener("click", () => {
    state.aiMode = "online";
    saveState();
    render();
  });
  document.querySelectorAll("[data-avatar-color]").forEach(btn => btn.addEventListener("click", () => {
    state.avatarType = "color";
    state.avatarColor = btn.dataset.avatarColor;
    state.avatarImage = "";
    saveState();
    render();
  }));
  document.getElementById("avatarImageInput")?.addEventListener("change", e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      state.avatarType = "image";
      state.avatarImage = String(reader.result || "");
      saveState();
      render();
    };
    reader.readAsDataURL(file);
  });
  document.getElementById("removeAvatarBtn")?.addEventListener("click", () => {
    state.avatarType = "color";
    state.avatarImage = "";
    if (!state.avatarColor) state.avatarColor = pickAvatarColor(currentProfile || "");
    saveState();
    render();
  });

    document.getElementById("sendAssistantBtn")?.addEventListener("click", () => {
    const input = document.getElementById("assistantInput");
    askAssistant(input?.value || "");
  });
  document.getElementById("assistantInput")?.addEventListener("keydown", e => {
    if (e.key === "Enter") askAssistant(e.target.value);
  });
  document.querySelectorAll(".assistant-suggestion").forEach(btn => btn.addEventListener("click", () => askAssistant(btn.dataset.q)));

  document.querySelectorAll("[data-reminder-id]").forEach(card => card.addEventListener("click", () => navigateToItem("bills", card.dataset.reminderId)));
  document.querySelectorAll("[data-nav-section]").forEach(card => card.addEventListener("click", e => {
    if (e.target.closest(".delete-btn") || e.target.closest(".toggle-bill-btn")) return;
    navigateToItem(card.dataset.navSection, card.dataset.navId);
  }));
  document.querySelectorAll("[data-insight]").forEach(card => card.addEventListener("click", () => openInsight(card.dataset.insight)));
  document.getElementById("closeInsightBtn")?.addEventListener("click", () => { state.insightModal = null; render(); });
  document.getElementById("insightModal")?.addEventListener("click", e => { if (e.target.id === "insightModal") { state.insightModal = null; render(); } });

  document.querySelectorAll(".graph-week-btn").forEach(btn => btn.addEventListener("click", () => openWeekGraph(btn.dataset.week)));
  document.querySelector(".graph-month-btn")?.addEventListener("click", openMonthGraph);
  document.getElementById("closeGraphBtn")?.addEventListener("click", closeGraph);
  document.getElementById("graphModal")?.addEventListener("click", e => { if (e.target.id === "graphModal") closeGraph(); });

  document.getElementById("entryFilterSelect")?.addEventListener("change", e => { state.entryFilter = e.target.value; saveState(); render(); });
  document.getElementById("billFilterSelect")?.addEventListener("change", e => { state.billFilter = e.target.value; saveState(); render(); });

  document.getElementById("saveEntryBtn")?.addEventListener("click", () => {
    const type = document.getElementById("entryType").value;
    const date = document.getElementById("entryDate").value;
    const category = document.getElementById("entryCategory").value;
    const label = document.getElementById("entryLabel").value.trim();
    const amount = Number(document.getElementById("entryAmount").value);
    const note = document.getElementById("entryNote").value.trim();
    if (!label || !amount) return alert("Please enter a label and amount.");
    state.entries.unshift({ id: crypto.randomUUID(), type, date, category, label, amount, note });
    saveState(); render();
  });
  document.getElementById("addEntryCategoryBtn")?.addEventListener("click", () => {
    const type = document.getElementById("entryType").value;
    const value = document.getElementById("newEntryCategory").value.trim();
    if (!value) return;
    const key = type === "income" ? "incomeCategories" : "expenseCategories";
    if (!state[key].includes(value)) state[key].push(value);
    saveState(); render();
  });
  document.getElementById("saveBillBtn")?.addEventListener("click", () => {
    const name = document.getElementById("billName").value.trim();
    const amount = Number(document.getElementById("billAmount").value);
    const dueDate = document.getElementById("billDueDate").value;
    const status = document.getElementById("billStatus").value;
    const category = document.getElementById("billCategory").value;
    const note = document.getElementById("billNote").value.trim();
    const recurring = document.getElementById("billRecurring").value === "true";
    if (!name || !amount) return alert("Please enter a bill name and amount.");
    state.bills.unshift({ id: crypto.randomUUID(), name, amount, dueDate, status, category, note, recurring });
    saveState(); render();
  });
  document.getElementById("addBillCategoryBtn")?.addEventListener("click", () => {
    const value = document.getElementById("newBillCategory").value.trim();
    if (!value) return;
    if (!state.billCategories.includes(value)) state.billCategories.push(value);
    saveState(); render();
  });
  document.getElementById("saveSavingBtn")?.addEventListener("click", () => {
    const date = document.getElementById("savingDate").value;
    const amount = Number(document.getElementById("savingAmount").value);
    const label = document.getElementById("savingLabel").value.trim();
    const note = document.getElementById("savingNote").value.trim();
    if (!label || !amount) return alert("Please enter a savings label and amount.");
    state.savings.unshift({ id: crypto.randomUUID(), date, amount, label, note });
    saveState(); render();
  });

  document.getElementById("saveTransferBtn")?.addEventListener("click", () => {
    const fromId = document.getElementById("transferFrom").value;
    const toId = document.getElementById("transferTo").value;
    const amount = Number(document.getElementById("transferAmount").value);
    const date = document.getElementById("transferDate").value;
    const note = document.getElementById("transferNote").value.trim();
    if (!fromId || !toId || !amount) return alert("Please complete the transfer fields.");
    if (fromId === toId) return alert("Choose two different accounts.");
    const fromAccount = state.accounts.find(a => a.id === fromId);
    const toAccount = state.accounts.find(a => a.id === toId);
    if (!fromAccount || !toAccount) return alert("Selected account not found.");
    if (Number(fromAccount.balance) < amount) return alert("Not enough balance in the source account.");
    state.accounts = state.accounts.map(a => {
      if (a.id === fromId) return { ...a, balance: Number(a.balance) - amount };
      if (a.id === toId) return { ...a, balance: Number(a.balance) + amount };
      return a;
    });
    state.transfers.unshift({
      id: crypto.randomUUID(),
      fromId,
      toId,
      fromName: fromAccount.name,
      toName: toAccount.name,
      amount,
      date,
      note
    });
    saveState();
    render();
  });

  document.getElementById("saveAccountBtn")?.addEventListener("click", () => {
    const name = document.getElementById("accountName").value.trim();
    const balance = Number(document.getElementById("accountBalance").value);
    const type = document.getElementById("accountType").value;
    const note = document.getElementById("accountNote").value.trim();
    if (!name) return alert("Please enter an account name.");
    state.accounts.unshift({ id: crypto.randomUUID(), name, balance: Number.isFinite(balance) ? balance : 0, type, note });
    saveState(); render();
  });
  document.getElementById("addAccountTypeBtn")?.addEventListener("click", () => {
    const value = document.getElementById("newAccountType").value.trim();
    if (!value) return;
    if (!state.accountTypes.includes(value)) state.accountTypes.push(value);
    saveState(); render();
  });
  document.getElementById("saveBudgetBtn")?.addEventListener("click", () => {
    const month = document.getElementById("budgetMonth").value;
    const category = document.getElementById("budgetCategory").value;
    const limit = Number(document.getElementById("budgetLimit").value);
    if (!month || !category || !limit) return alert("Please fill in budget fields.");
    const existing = state.budgets.find(b => b.month === month && b.category === category);
    if (existing) existing.limit = limit;
    else state.budgets.unshift({ id: crypto.randomUUID(), month, category, limit });
    saveState(); render();
  });

  document.querySelectorAll(".delete-btn").forEach(btn => btn.addEventListener("click", () => {
    const section = btn.dataset.section;
    const id = btn.dataset.id;
    state[section] = state[section].filter(x => x.id !== id);
    saveState(); render();
  }));
  document.querySelectorAll(".toggle-bill-btn").forEach(btn => btn.addEventListener("click", () => {
    const id = btn.dataset.id;
    state.bills = state.bills.map(x => x.id === id ? { ...x, status: x.status === "Paid" ? "Unpaid" : "Paid" } : x);
    saveState(); render();
  }));
}

window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  deferredPrompt = e;
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(console.error);
  });
}

render();
