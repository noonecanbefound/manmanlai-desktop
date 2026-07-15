const KEYS = {
  preferences: 'quiet-time:preferences-v2',
  history: 'quiet-time:history-v2',
  note: 'quiet-time:session-note-v2'
};

const BASE_ACTIVITIES = ['学习', 'AI', 'B站'];
const state = {
  preferences: loadJson(KEYS.preferences, { minutes: 20, theme: 'apple', appearance: 'soft', customActivities: [] }),
  history: loadJson(KEYS.history, {}),
  cycleStartedAt: Date.now(),
  currentActivity: null,
  pausedActivity: null,
  lastAccountedAt: Date.now(),
  sessionStartedAt: Date.now(),
  hovered: false,
  noteVisible: false,
  bootTime: 0,
  collapseTimer: null,
  modeTimer: null,
  hoverOpenedAt: 0
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const el = {
  app: $('#app'), activityRows: $('#activityRows'), elapsedMinutes: $('#elapsedMinutes'),
  resetButton: $('#resetButton'), appleVisual: $('#appleVisual'), aquariumVisual: $('#aquariumVisual'),
  visualStage: $('#visualStage'), hoverCard: $('#hoverCard'), hoverBridge: $('#hoverBridge'),
  appleBody: $('#appleBody'), appleFullImage: $('#appleFullImage'), appleCoreImage: $('#appleCoreImage'),
  aquariumArtwork: $('#aquariumArtwork'), appleLeaf: $('#appleLeaf'),
  noteCard: $('#noteCard'), noteInput: $('#noteInput'), newActivityInput: $('#newActivityInput'),
  customActivityList: $('#customActivityList'), weekBars: $('#weekBars'), weekTotals: $('#weekTotals'),
  launchAtLogin: $('#launchAtLogin')
};

function loadJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? structuredClone(fallback); }
  catch { return structuredClone(fallback); }
}
function saveJson(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function recentDates() {
  const dates = [];
  const today = new Date(); today.setHours(12, 0, 0, 0);
  for (let i = 6; i >= 0; i -= 1) { const date = new Date(today); date.setDate(today.getDate() - i); dates.push(date); }
  return dates;
}
function ensureDay(key = dateKey()) {
  state.history[key] ??= { appSeconds: 0, activities: {} };
  state.history[key].activities ??= {};
  return state.history[key];
}
function pruneHistory() {
  const keep = new Set(recentDates().map(dateKey));
  Object.keys(state.history).forEach((key) => { if (!keep.has(key)) delete state.history[key]; });
}
function allActivities() { return [...new Set([...(state.preferences.customActivities || []), ...BASE_ACTIVITIES])]; }

function accountTime() {
  const now = Date.now();
  const seconds = Math.max(0, Math.min(5, (now - state.lastAccountedAt) / 1000));
  state.lastAccountedAt = now;
  const day = ensureDay();
  day.appSeconds += seconds;
  if (state.currentActivity) {
    day.activities[state.currentActivity] = (day.activities[state.currentActivity] || 0) + seconds;
  }
}
function persist() { accountTime(); pruneHistory(); saveJson(KEYS.history, state.history); saveJson(KEYS.preferences, state.preferences); }

function formatMinutes(seconds) {
  if (seconds < 30) return '';
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60), rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

function selectActivity(name) {
  accountTime();
  state.currentActivity = name;
  state.pausedActivity = null;
  renderActivities();
}
function toggleActivityPause() {
  accountTime();
  if (state.currentActivity) {
    state.pausedActivity = state.currentActivity;
    state.currentActivity = null;
  } else if (state.pausedActivity) {
    state.currentActivity = state.pausedActivity;
    state.pausedActivity = null;
  }
  renderActivities();
}

function renderActivities() {
  const day = ensureDay();
  const activities = [...new Set([
    state.currentActivity,
    state.pausedActivity,
    ...allActivities()
  ].filter(Boolean))];
  const maxSeconds = Math.max(60, ...activities.map((name) => day.activities[name] || 0));
  el.activityRows.replaceChildren();

  activities.forEach((name) => {
    const seconds = day.activities[name] || 0;
    const row = document.createElement('div');
    const active = state.currentActivity === name;
    const paused = state.pausedActivity === name;
    row.className = `activity-row${active ? ' is-active' : ''}${paused ? ' is-paused' : ''}`;
    row.dataset.activity = name;
    row.title = active ? `${name}正在计时，点击暂停` : paused ? `${name}已暂停，点击继续` : `切换到${name}`;

    const dot = document.createElement('span'); dot.className = 'status-dot';
    const label = document.createElement('span'); label.className = 'activity-name';
    label.textContent = name;
    const time = document.createElement('span'); time.className = 'activity-time'; time.textContent = formatMinutes(seconds);
    const pause = document.createElement('button'); pause.className = 'pause-toggle'; pause.type = 'button';
    pause.textContent = active ? 'Ⅱ' : paused ? '▶' : '';
    pause.title = active ? '暂停活动计时' : paused ? '继续活动计时' : '';
    pause.tabIndex = -1;
    pause.setAttribute('aria-hidden', 'true');
    const track = document.createElement('span'); track.className = 'bar-track';
    const fill = document.createElement('span'); fill.className = 'bar-fill'; fill.style.width = `${(seconds / maxSeconds) * 100}%`;
    track.append(fill);
    row.append(dot, label, time, pause, track);
    row.addEventListener('click', () => {
      if (active || paused) toggleActivityPause();
      else selectActivity(name);
    });
    el.activityRows.append(row);
  });
}

function updateActivityMetrics() {
  const day = ensureDay();
  const rows = [...el.activityRows.children];
  const maxSeconds = Math.max(60, ...rows.map((row) => day.activities[row.dataset.activity] || 0));
  rows.forEach((row) => {
    const seconds = day.activities[row.dataset.activity] || 0;
    row.querySelector('.activity-time').textContent = formatMinutes(seconds);
    row.querySelector('.bar-fill').style.width = `${(seconds / maxSeconds) * 100}%`;
  });
}

function setPanel(name) {
  el.app.dataset.panel = name;
  if (name === 'week') renderWeek();
  if (name === 'add') { renderCustomActivities(); setTimeout(() => el.newActivityInput.focus(), 80); }
}

function addActivity() {
  const name = el.newActivityInput.value.trim().slice(0, 10);
  if (!name) return;
  if (!BASE_ACTIVITIES.includes(name)) {
    state.preferences.customActivities = [
      name,
      ...(state.preferences.customActivities || []).filter((activity) => activity !== name)
    ];
  }
  el.newActivityInput.value = '';
  saveJson(KEYS.preferences, state.preferences);
  selectActivity(name);
  setPanel('stats');
}
function renderCustomActivities() {
  el.customActivityList.replaceChildren();
  (state.preferences.customActivities || []).forEach((name) => {
    const pill = document.createElement('button'); pill.className = 'custom-pill'; pill.type = 'button'; pill.textContent = name;
    pill.addEventListener('click', () => { selectActivity(name); setPanel('stats'); });
    el.customActivityList.append(pill);
  });
}

function renderWeek() {
  const dates = recentDates();
  const totals = dates.map((date) => state.history[dateKey(date)]?.appSeconds || 0);
  const max = Math.max(60, ...totals);
  const labels = ['日','一','二','三','四','五','六'];
  el.weekBars.replaceChildren();
  dates.forEach((date, index) => {
    const day = document.createElement('div'); day.className = 'week-day';
    const track = document.createElement('div'); track.className = 'week-track';
    const fill = document.createElement('div'); fill.className = 'week-fill'; fill.style.height = `${Math.max(4, totals[index] / max * 100)}%`;
    const label = document.createElement('span'); label.className = 'week-label'; label.textContent = labels[date.getDay()];
    track.append(fill); day.append(track, label); el.weekBars.append(day);
  });
  const sums = {};
  dates.forEach((date) => Object.entries(state.history[dateKey(date)]?.activities || {}).forEach(([name, seconds]) => { sums[name] = (sums[name] || 0) + seconds; }));
  el.weekTotals.textContent = Object.entries(sums).sort((a,b) => b[1]-a[1]).slice(0,3).map(([name, seconds]) => `${name} ${formatMinutes(seconds) || '—'}`).join(' · ') || '最近 7 天还没有记录';
}

function setHovered(value) {
  clearTimeout(state.collapseTimer);
  if (state.hovered === value) return;
  clearTimeout(state.modeTimer);
  state.hovered = value;
  if (value) {
    state.hoverOpenedAt = Date.now();
    renderActivities();
    window.desktop.setMode({ hovered: true, noteVisible: state.noteVisible });
    state.modeTimer = setTimeout(() => {
      if (state.hovered) el.app.classList.add('is-hovered');
    }, 32);
  } else {
    el.app.classList.remove('is-hovered');
    setPanel('stats');
    state.modeTimer = setTimeout(() => {
      if (!state.hovered) window.desktop.setMode({ hovered: false, noteVisible: state.noteVisible });
    }, 190);
  }
}
function scheduleCollapse(delay = 260) {
  clearTimeout(state.collapseTimer);
  const minimumOpenTime = Math.max(0, state.hoverOpenedAt + 350 - Date.now());
  const wait = Math.max(delay, minimumOpenTime);
  state.collapseTimer = setTimeout(async () => {
    const editing = ['INPUT','TEXTAREA'].includes(document.activeElement?.tagName);
    if (editing) return;
    const pointerInside = await window.desktop.isPointerInside();
    if (!pointerInside) setHovered(false);
  }, wait);
}
function setNoteVisible(value, focus = false) {
  state.noteVisible = value;
  el.app.classList.toggle('note-visible', value);
  window.desktop.setMode({ hovered: state.hovered, noteVisible: value });
  if (focus) setTimeout(() => el.noteInput.focus(), 230);
}

function saveNote() { saveJson(KEYS.note, { bootTime: state.bootTime, text: el.noteInput.value }); }
async function loadNote() {
  const session = await window.desktop.getSession();
  state.bootTime = session.approximateBootTime;
  const saved = loadJson(KEYS.note, null);
  if (saved && Math.abs(saved.bootTime - state.bootTime) < 120000) el.noteInput.value = saved.text || '';
  setNoteVisible(Boolean(el.noteInput.value.trim()));
  saveNote();
}

function smooth(value) { const x = Math.max(0, Math.min(1, value)); return x*x*(3-2*x); }
function resetCycle() { state.cycleStartedAt = Date.now(); renderCycle(Date.now()); }
function renderCycle(now) {
  const elapsedMs = Math.max(0, now - state.cycleStartedAt);
  const totalMs = state.preferences.minutes * 60000;
  const progress = Math.min(1, elapsedMs / totalMs);
  const elapsedWholeMinutes = Math.min(state.preferences.minutes, Math.floor(elapsedMs / 60000));
  el.elapsedMinutes.textContent = String(elapsedWholeMinutes);

  const apple = state.preferences.theme === 'apple';
  el.appleVisual.classList.toggle('is-hidden', !apple);
  el.aquariumVisual.classList.toggle('is-hidden', apple);
  if (apple) {
    $$('.apple-bite').forEach((bite) => {
      const local = smooth((progress - Number(bite.dataset.threshold)) / .22);
      bite.setAttribute('r', String(local * Number(bite.dataset.max)));
    });
    const appleScale = 1 - .24 * smooth(progress / .86);
    const coreReveal = smooth((progress - .86) / .12);
    el.appleBody.style.transform = `scale(${appleScale})`;
    el.appleBody.style.opacity = String(1 - coreReveal);
    el.appleCoreImage.style.opacity = String(coreReveal);
    el.appleCoreImage.style.transform = `scale(${.88 + .12 * coreReveal})`;
  } else {
    const fishSlots = Math.min(9, Math.max(1, Math.round(state.preferences.minutes / 5)));
    const arrivalProgress = progress * fishSlots;
    $$('.fish').forEach((fish) => {
      const index = Number(fish.dataset.fish) - 1;
      if (index >= fishSlots) {
        fish.style.opacity = '0';
        return;
      }
      let arrival = smooth(arrivalProgress - index);
      if (index === 0) arrival = .24 + .76 * arrival;
      fish.style.opacity = String(arrival);
    });
  }
}

function syncSettings() {
  el.app.classList.toggle('theme-apple', state.preferences.theme === 'apple');
  el.app.classList.toggle('theme-aquarium', state.preferences.theme === 'aquarium');
  $$('.theme-choice').forEach((button) => button.classList.toggle('is-active', button.dataset.theme === state.preferences.theme));
  $$('.appearance-choice').forEach((button) => button.classList.toggle('is-active', button.dataset.appearance === state.preferences.appearance));
  $$('.minute-choice').forEach((button) => button.classList.toggle('is-active', Number(button.dataset.minutes) === state.preferences.minutes));
}

function applyAppearance() {
  const hour = new Date().getHours();
  const automaticNight = hour >= 19 || hour < 7;
  const effective = state.preferences.appearance === 'auto'
    ? (automaticNight ? 'cyber' : 'soft')
    : state.preferences.appearance;
  el.app.classList.toggle('appearance-cyber', effective === 'cyber');
  el.app.classList.toggle('appearance-soft', effective !== 'cyber');
  el.appleFullImage.setAttribute('href', effective === 'cyber' ? 'assets/apple-cyber-v2.png' : 'assets/apple.png');
  el.aquariumArtwork.src = effective === 'cyber' ? 'assets/aquarium-cyber.png' : 'assets/aquarium-soft.png';
}

const hoverTargets = [el.visualStage, el.hoverCard, el.hoverBridge];
hoverTargets.forEach((target) => {
  target.addEventListener('mouseenter', () => setHovered(true));
  target.addEventListener('mouseleave', () => scheduleCollapse());
});
document.documentElement.addEventListener('mouseleave', () => scheduleCollapse(180));
el.resetButton.addEventListener('click', resetCycle);
$('#addButton').addEventListener('click', () => setPanel('add'));
$('#weekButton').addEventListener('click', () => setPanel('week'));
$('#settingsButton').addEventListener('click', () => { syncSettings(); setPanel('settings'); });
$('#noteButton').addEventListener('click', () => setNoteVisible(!state.noteVisible, !state.noteVisible));
$('#saveActivityButton').addEventListener('click', addActivity);
el.newActivityInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') addActivity(); });
$$('[data-back]').forEach((button) => button.addEventListener('click', () => setPanel('stats')));
$$('.theme-choice').forEach((button) => button.addEventListener('click', () => {
  state.preferences.theme = button.dataset.theme; saveJson(KEYS.preferences, state.preferences); syncSettings(); renderCycle(Date.now());
}));
$$('.appearance-choice').forEach((button) => button.addEventListener('click', () => {
  state.preferences.appearance = button.dataset.appearance;
  saveJson(KEYS.preferences, state.preferences);
  syncSettings();
  applyAppearance();
}));
$$('.minute-choice').forEach((button) => button.addEventListener('click', () => {
  state.preferences.minutes = Number(button.dataset.minutes); saveJson(KEYS.preferences, state.preferences); syncSettings(); resetCycle();
}));
el.noteInput.addEventListener('input', saveNote);
el.noteInput.addEventListener('blur', () => { saveNote(); if (!el.noteInput.value.trim()) setNoteVisible(false); });
el.launchAtLogin.addEventListener('change', async () => { el.launchAtLogin.checked = await window.desktop.setLaunchAtLogin(el.launchAtLogin.checked); });
$('#minimizeButton').addEventListener('click', () => setHovered(false));
$('#closeButton').addEventListener('click', () => { persist(); saveNote(); window.desktop.close(); });
window.addEventListener('beforeunload', () => { persist(); saveNote(); });

async function initialize() {
  state.preferences.appearance ||= 'soft';
  pruneHistory(); ensureDay(); renderActivities(); syncSettings(); await loadNote();
  applyAppearance();
  el.launchAtLogin.checked = await window.desktop.getLaunchAtLogin();
  setInterval(() => { accountTime(); if (state.hovered) updateActivityMetrics(); }, 1000);
  setInterval(persist, 15000);
  setInterval(applyAppearance, 60000);
  function frame() { renderCycle(Date.now()); requestAnimationFrame(frame); }
  requestAnimationFrame(frame);
}
initialize();
