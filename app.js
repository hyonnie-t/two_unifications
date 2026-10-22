/* 주제31 「이탈리아·독일의 통일 비교」 웹앱 — 로직(app.js) */
const CONFIG = {
  SHEET_WEBAPP_URL: "https://script.google.com/macros/s/AKfycbyXSjCfWY_HiZFqW_OBR-FQDoIfF1z_STqyKWUI31MacHeY3u7hbirFSFDvW-5yuUHaJQ/exec",
  /* 포털 커리큘럼 관리에 이 id 하나로 활동을 등록한다 */
  GAME_NAME: "31차시_이탈리아_독일_통일",
  MAX_FAILS: 3 // 순서 확인을 이만큼 틀리면 정답 순서를 보여 준다
};

const S = {
  sid: "", name: "", grade: 0, ban: 0, preview: false,
  sending: false, submitted: false, padletUrl: ""
};

/* 찾기 두 화면(이탈리아, 독일). order = 지금 놓인 카드 번호(정답 순서의 0부터 번호) */
const F = {
  ita: { key: "ita", scr: "s1", order: [], fails: 0, passed: false, revealed: false, sortable: null },
  ger: { key: "ger", scr: "s2", order: [], fails: 0, passed: false, revealed: false, sortable: null }
};
const FIND_KEYS = ["ita", "ger"];

/* 화면 목록: stage는 위쪽 4단계 막대 */
const SCREENS = { s0: "", s1: "find", s2: "find", s3: "compare", s4: "write", s5: "wrap" };
const STAGES = ["find", "compare", "write", "wrap"];

const $ = id => document.getElementById(id);

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

function show(key) {
  Object.keys(SCREENS).forEach(k => { $(k).hidden = (k !== key); });
  const stage = SCREENS[key];
  $("steps").hidden = !stage;
  $("findLabel").textContent = key === "s1" ? "찾기 1/2" : key === "s2" ? "찾기 2/2" : "찾기";
  const cur = STAGES.indexOf(stage);
  document.querySelectorAll("#steps li").forEach(li => {
    const i = STAGES.indexOf(li.dataset.k);
    li.className = i === cur ? "on" : (i < cur ? "done" : "");
    if (i === cur) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
  });
  window.scrollTo(0, 0);
}

function parseSid(sid) {
  if (!/^\d{5}$/.test(sid)) return null;
  return { grade: Number(sid[0]), ban: Number(sid.slice(1, 3)), num: Number(sid.slice(3)) };
}

function oneLine(s) { return String(s || "").replace(/\s*\n\s*/g, " ").trim(); }
function hintEl(text) {
  const d = el("details", "hint");
  d.appendChild(el("summary", "", HINT_LABEL));
  d.appendChild(el("p", "", text));
  return d;
}

/* ── 시트 전송 ── */
async function postToSheet(payload) {
  if (S.preview) return { result: "success", preview: true };
  const res = await fetch(CONFIG.SHEET_WEBAPP_URL, { method: "POST", body: JSON.stringify(payload) });
  const json = await res.json();
  if (json.result !== "success") {
    const err = new Error(json.message || "저장 실패");
    err.locked = !!json.locked;
    throw err;
  }
  return json;
}

/* 패들렛 링크는 백엔드 학년정보(포트폴리오)에서 가져온다. 반 정보가 든 링크라 레포에 적지 않는다. */
function ensureUrlScheme(u) {
  u = String(u || "").trim();
  return u && !/^https?:\/\//i.test(u) ? "https://" + u : u;
}

async function loadPadletUrl(grade, ban) {
  try {
    const res = await fetch(CONFIG.SHEET_WEBAPP_URL + "?mode=curriculum");
    const json = await res.json();
    const pf = json && json.grades && json.grades[String(grade)] && json.grades[String(grade)].portfolio;
    if (!pf) return "";
    return ensureUrlScheme(pf.urlByBan ? (pf.urlByBan[ban] || pf.urlByBan[String(ban)] || "") : (pf.url || ""));
  } catch (e) {
    return "";
  }
}

/* ── 시작 ── */
function startApp() {
  const sid = $("sid").value.trim();
  const name = $("sname").value.trim();
  const p = parseSid(sid);
  if (!p) { $("startErr").textContent = "학번은 숫자 5자리로 써 줘. (예: 20512)"; return; }
  if (!name) { $("startErr").textContent = "이름을 써 줘."; return; }
  $("startErr").textContent = "";
  S.sid = sid; S.name = name; S.grade = p.grade; S.ban = p.ban;
  FocusGuard.start({ key: CONFIG.GAME_NAME + ":" + sid }); // 작성 중 화면 이탈·붙여넣기 기록 (history26 snippets/focus_guard.js)
  if (window.DraftGuard) DraftGuard.start({ key: CONFIG.GAME_NAME, sid: sid }); // 글쓰기 칸 임시저장 (history26 v75)
  loadPadletUrl(p.grade, p.ban).then(u => { S.padletUrl = u; renderPadlet(); });
  showFind("ita");
}

/* ── 1·2. 찾기: 카드를 시간순으로 ── */
function cardsOf(key) { return COUNTRIES[key].cards; }

function readOrder(key) {
  return Array.prototype.map.call($(F[key].scr + "List").children, li => Number(li.dataset.n));
}

function buildCard(key, n) {
  const c = COUNTRIES[key];
  const li = el("li", "card-item");
  li.dataset.n = String(n);
  const grip = el("span", "grip", "☰");
  grip.setAttribute("aria-hidden", "true");
  li.appendChild(grip);
  li.appendChild(el("span", "pos"));
  const body = el("div", "card-body");
  const p = el("p", "card-text");
  p.appendChild(document.createTextNode(c.cards[n] + " "));
  p.appendChild(el("span", "pg", "(" + c.page + "쪽)"));
  body.appendChild(p);
  li.appendChild(body);
  const mv = el("div", "mv");
  const up = el("button", "mv-btn", "▲");
  up.type = "button"; up.setAttribute("aria-label", "한 칸 위로");
  up.addEventListener("click", () => moveCard(key, li, -1, up));
  const down = el("button", "mv-btn", "▼");
  down.type = "button"; down.setAttribute("aria-label", "한 칸 아래로");
  down.addEventListener("click", () => moveCard(key, li, 1, down));
  mv.appendChild(up); mv.appendChild(down);
  li.appendChild(mv);
  return li;
}

function renderCards(key) {
  const st = F[key];
  const list = $(st.scr + "List");
  list.innerHTML = "";
  st.order.forEach(n => list.appendChild(buildCard(key, n)));
  list.classList.toggle("locked", st.passed);
  refreshList(key);
}

/* 번호표(위에서부터 1,2,3…)와 ▲▼ 끝 칸 비활성 갱신 */
function refreshList(key) {
  const st = F[key];
  const items = $(st.scr + "List").children;
  for (let i = 0; i < items.length; i++) {
    items[i].querySelector(".pos").textContent = String(i + 1);
    const btns = items[i].querySelectorAll(".mv-btn");
    btns[0].disabled = i === 0;
    btns[1].disabled = i === items.length - 1;
  }
}

function moveCard(key, li, dir, btn) {
  if (F[key].passed) return;
  const list = li.parentNode;
  if (dir < 0 && li.previousElementSibling) list.insertBefore(li, li.previousElementSibling);
  else if (dir > 0 && li.nextElementSibling) list.insertBefore(li.nextElementSibling, li);
  else return;
  refreshList(key);
  clearFindMsg(key);
  if (!btn.disabled) btn.focus({ preventScroll: true });
  else (dir < 0 ? li.querySelectorAll(".mv-btn")[1] : li.querySelectorAll(".mv-btn")[0]).focus({ preventScroll: true });
}

function setFindMsg(key, text, kind) {
  const m = $(F[key].scr + "Msg");
  m.textContent = text;
  m.className = "msg" + (kind ? " " + kind : "");
}
function clearFindMsg(key) { if (!F[key].passed) setFindMsg(key, "", ""); }

function lockFind(key) {
  const st = F[key];
  st.passed = true;
  if (st.sortable) st.sortable.option("disabled", true);
  $(st.scr + "List").classList.add("locked");
  $(st.scr + "Check").hidden = true;
  $(st.scr + "Next").hidden = false;
}

function buildFind(key) {
  const st = F[key];
  const c = COUNTRIES[key];
  st.order = shuffledOrder(c.cards.length);
  $(st.scr + "Tag").textContent = c.name;
  $(st.scr + "Title").textContent = c.name + " 통일 과정 (" + c.page + "쪽)";
  $(st.scr + "Hint").appendChild(hintEl(HINTS.order));
  renderCards(key);
  if (window.Sortable) {
    st.sortable = Sortable.create($(st.scr + "List"), {
      handle: ".grip", animation: 150, ghostClass: "ghost", chosenClass: "chosen",
      onEnd: () => { refreshList(key); clearFindMsg(key); }
    });
  }
  $(st.scr + "Check").addEventListener("click", () => checkOrder(key));
}

function checkOrder(key) {
  const st = F[key];
  if (st.passed) return;
  const c = COUNTRIES[key];
  st.order = readOrder(key);
  if (isCorrectOrder(st.order, c.cards.length)) {
    lockFind(key);
    renderCards(key);
    setFindMsg(key, "순서가 맞아! 다음으로 가자.", "ok");
    $(st.scr + "Next").focus({ preventScroll: true });
    return;
  }
  st.fails++;
  if (st.fails >= CONFIG.MAX_FAILS) {
    st.revealed = true;
    st.order = c.cards.map((_, i) => i);
    lockFind(key);
    renderCards(key);
    setFindMsg(key, "정답 순서를 보여 줄게. 한 번 읽어 보고 다음으로 가자.", "info");
    $(st.scr + "Next").focus({ preventScroll: true });
    return;
  }
  setFindMsg(key, c.page + "쪽을 다시 읽어 봐", "bad");
}

function showFind(key) {
  const st = F[key];
  $(st.scr + "Check").hidden = st.passed;
  $(st.scr + "Next").hidden = !st.passed;
  show(st.scr);
}

/* ── 3. 비교 ── */
function buildCompare() {
  const box = $("cmpBox");
  COMPARE.forEach(cp => {
    const part = el("div", "part");
    const lab = el("label", "part-label", cp.label);
    lab.htmlFor = cp.id;
    part.appendChild(lab);
    part.appendChild(el("p", "part-guide", cp.guide));
    const ta = el("textarea", "plain");
    ta.id = cp.id; ta.rows = 2;
    ta.placeholder = "여기에 써 줘.";
    ta.addEventListener("input", () => { $("s3Err").textContent = ""; });
    part.appendChild(ta);
    box.appendChild(part);
  });
  const hw = el("div", "hint-wrap");
  hw.appendChild(hintEl(HINTS.compare));
  box.appendChild(hw);
}

function renderCompare() {
  [["ita", "colIta", "colItaTag"], ["ger", "colGer", "colGerTag"]].forEach(a => {
    const c = COUNTRIES[a[0]];
    $(a[2]).textContent = c.name + " (" + c.page + "쪽)";
    const ol = $(a[1]);
    ol.innerHTML = "";
    c.cards.forEach(t => ol.appendChild(el("li", "", t)));
  });
}

function val(id) { return $(id).value.trim(); }

function checkCompare() {
  for (const cp of COMPARE) {
    if (val(cp.id).length < cp.min) return cp.label.slice(0, 4) + " 칸을 써 줘.";
  }
  return "";
}

/* ── 4. 쓰기 ── */
function buildWrites() {
  $("frameNote").textContent = FRAME_NOTE;
  $("boxTitle").textContent = BOX.title + " (" + BOX.page + "쪽)";
  $("boxText").textContent = BOX.text;
  $("nationTerm").textContent = NATION.term + " (" + NATION.page + "쪽)";
  $("nationText").textContent = NATION.text;

  const wrap = $("writeBox");
  WRITES.forEach(w => {
    const card = el("div", "card part");
    const h = el("h3", "part-label", w.num + " " + w.question);
    h.id = w.id + "Q";
    card.appendChild(h);

    const store = el("input"); // 고른 선택을 임시저장에 태우는 숨은 칸(draft_guard가 data-draft 칸을 저장·복원한다)
    store.type = "hidden"; store.id = w.id + "Store"; store.setAttribute("data-draft", w.id + "Choice");
    card.appendChild(store);

    const grp = el("div", "choices");
    grp.setAttribute("role", "radiogroup");
    grp.setAttribute("aria-labelledby", h.id);
    w.choices.forEach(label => {
      const lb = el("label", "choice");
      const r = el("input");
      r.type = "radio"; r.name = w.id; r.value = label;
      r.addEventListener("change", () => onChoice(w, r.value, store));
      lb.appendChild(r);
      lb.appendChild(el("span", "", label));
      grp.appendChild(lb);
    });
    card.appendChild(grp);

    const lock = el("p", "lock-note", "먼저 위에서 하나를 골라 줘. 그러면 쓰는 칸이 열려.");
    lock.id = w.id + "Lock";
    card.appendChild(lock);

    const area = el("div", "write-area");
    area.id = w.id + "Area";
    area.hidden = true;
    area.appendChild(el("p", "part-guide", w.guide));
    area.appendChild(hintEl(w.hint));
    const ta = el("textarea", "lined");
    ta.id = w.id + "Text"; ta.rows = 3;
    ta.placeholder = "여기에 1문장으로 써 줘.";
    const cnt = el("div", "count");
    const upd = () => { cnt.textContent = ta.value.trim().length + "자 (" + w.min + "자 이상)"; };
    ta.addEventListener("input", () => { upd(); $("s4Err").textContent = ""; });
    upd();
    area.appendChild(ta);
    area.appendChild(cnt);
    card.appendChild(area);

    store.addEventListener("input", () => restoreChoice(w, store)); // 임시저장 복원 때 선택도 되살린다
    wrap.appendChild(card);
  });
}

function unlockWrite(w) {
  $(w.id + "Lock").hidden = true;
  $(w.id + "Area").hidden = false;
}

function onChoice(w, value, store) {
  store.value = value;
  store.dispatchEvent(new Event("input", { bubbles: true })); // draft_guard가 선택도 저장하게
  unlockWrite(w);
  $("s4Err").textContent = "";
}

function restoreChoice(w, store) {
  const r = document.querySelector('input[name="' + w.id + '"][value="' + store.value + '"]');
  if (!r) return;
  r.checked = true;
  unlockWrite(w);
}

function chosenOf(w) {
  const r = document.querySelector('input[name="' + w.id + '"]:checked');
  return r ? r.value : "";
}
function outLabelOf(w) { return w.outLabel[w.choices.indexOf(chosenOf(w))] || ""; }

function checkWrites() {
  for (const w of WRITES) {
    if (!chosenOf(w)) return w.num + "에서 하나를 골라 줘.";
    if (val(w.id + "Text").length < w.min) return w.num + " 칸을 조금 더 써 줘. (" + w.min + "자 이상)";
  }
  return "";
}

/* ── 5. 마무리 ── */
function writeLine(w) { return "(" + outLabelOf(w) + ") — " + oneLine(val(w.id + "Text")); }

/* 시트 reflection(G열)에 가는 합본 */
function buildReflection() {
  return [
    "[비교]",
    "같은 점: " + oneLine(val("cmpSame")),
    "다른 점: " + oneLine(val("cmpDiff")),
    "[국민 국가였을까] " + writeLine(WRITES[0]),
    "[해결] " + writeLine(WRITES[1])
  ].join("\n");
}

/* 패들렛에 붙이는 글: 쓰기 두 칸만 */
function buildOutText() { return WRITES.map(writeLine).join("\n"); }

function wrapSection(title, lines) {
  const sec = el("div", "wrap-sec");
  sec.appendChild(el("h3", "", title));
  lines.forEach(t => sec.appendChild(el("p", "", t)));
  return sec;
}

function renderWrap() {
  const box = $("wrapBox");
  box.innerHTML = "";
  box.appendChild(wrapSection("[비교]", ["같은 점: " + oneLine(val("cmpSame")), "다른 점: " + oneLine(val("cmpDiff"))]));
  box.appendChild(wrapSection("[국민 국가였을까]", [writeLine(WRITES[0])]));
  box.appendChild(wrapSection("[해결]", [writeLine(WRITES[1])]));
  $("submitBtn").disabled = S.submitted;
  $("submitBtn").textContent = S.submitted ? "제출 완료" : "제출";
  renderPadlet();
}

function renderPadlet() {
  const a = $("padletBtn");
  if (S.padletUrl) {
    a.href = S.padletUrl; a.hidden = false; $("padletMsg").textContent = "";
  } else {
    a.hidden = true; $("padletMsg").textContent = "패들렛 링크는 선생님이 알려 준 곳을 써 줘.";
  }
}

async function submitAll() {
  if (S.sending || S.submitted) return;
  const err = checkCompare() || checkWrites();
  if (err) { $("s5Err").textContent = err; return; }
  $("s5Err").textContent = "";
  S.sending = true; $("submitBtn").disabled = true; $("submitBtn").textContent = "보내는 중…";
  const payload = {
    studentId: S.sid, studentName: S.name, gameName: CONFIG.GAME_NAME,
    choiceSummary: "국민 국가: " + outLabelOf(WRITES[0]) + " / 해결: " + outLabelOf(WRITES[1]), diffSummary: "",
    reflection: buildReflection(), // 시트 G열: 비교 + 쓰기 합본
    choicesJson: JSON.stringify({
      sid: S.sid, name: S.name, ban: S.ban,
      orderFails: { ita: F.ita.fails, ger: F.ger.fails },
      orderRevealed: { ita: F.ita.revealed, ger: F.ger.revealed },
      compare: { same: val("cmpSame"), diff: val("cmpDiff") },
      write: WRITES.reduce((o, w) => { o[w.id] = { choice: chosenOf(w), text: val(w.id + "Text") }; return o; }, {}),
      ts: new Date().toISOString()
    })
  };
  Object.assign(payload, FocusGuard.payload());
  try {
    await postToSheet(payload);
  } catch (e) {
    $("s5Err").textContent = e.locked ? e.message : "저장이 안 됐어. 인터넷을 확인하고 다시 눌러 줘.";
    S.sending = false; $("submitBtn").disabled = false; $("submitBtn").textContent = "제출";
    return;
  }
  S.sending = false; S.submitted = true;
  if (window.DraftGuard) DraftGuard.clear(); // 저장 성공 → 임시저장 삭제
  $("submitBtn").textContent = "제출 완료";
  $("s5Back").hidden = true; // 제출한 글과 화면이 달라지지 않게
  $("outMsg").textContent = S.preview ? "미리보기라 저장하지 않았어." : "제출했어! 이제 글 복사를 눌러 패들렛에 올려 줘.";
}

async function copyOut() {
  const text = buildOutText();
  try {
    await navigator.clipboard.writeText(text);
  } catch (e) {
    const ta = el("textarea");
    ta.value = text; ta.setAttribute("data-no-draft", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove();
  }
  $("outMsg").textContent = S.submitted
    ? "복사했어. 패들렛에 붙여넣기 해."
    : "복사했어. 제출 버튼도 꼭 눌러 줘!";
}

/* ── 화면 이동 ── */
function goCompare() {
  renderCompare(); show("s3");
}

function goWrite() {
  const err = checkCompare();
  if (err) { $("s3Err").textContent = err; return; }
  show("s4");
}

function goWrap() {
  const err = checkWrites();
  if (err) { $("s4Err").textContent = err; return; }
  renderWrap(); show("s5");
}

/* ── 부팅 (모든 함수 선언 뒤, 파일 맨 마지막) ── */
function init() {
  const q = new URLSearchParams(location.search);
  S.preview = q.get("preview") === "1";
  let sid = (q.get("sid") || "").trim(), name = (q.get("name") || "").trim();
  if (S.preview) {
    $("previewBar").hidden = false;
    if (!sid) sid = "20512";
    if (!name) name = "미리보기";
  }
  $("sid").value = sid; $("sname").value = name;

  FIND_KEYS.forEach(buildFind);
  buildCompare();
  buildWrites();

  $("startBtn").addEventListener("click", startApp);
  $("s1Back").hidden = true; // 첫 찾기 화면에서는 돌아갈 곳이 없다
  $("s1Next").addEventListener("click", () => showFind("ger"));
  $("s2Back").addEventListener("click", () => showFind("ita"));
  $("s2Next").addEventListener("click", goCompare);
  $("s3Back").addEventListener("click", () => showFind("ger"));
  $("s3Next").addEventListener("click", goWrite);
  $("s4Back").addEventListener("click", goCompare);
  $("s4Next").addEventListener("click", goWrap);
  $("s5Back").addEventListener("click", () => show("s4"));
  $("submitBtn").addEventListener("click", submitAll);
  $("copyBtn").addEventListener("click", copyOut);
  Glossary.start({ terms: GLOSSARY, skip: ["#steps", ".grip", ".pos"] }); // 어려운 낱말 풀이 (glossary.js)
}

init();
