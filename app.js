const STORAGE_KEY = "kapian_cards_v1";
const DAY = 86400000;
const categories = { bank: "银行卡", identity: "证件", insurance: "保险", membership: "会员卡", other: "其他" };
const today = new Date();
const isoAfter = (days) => new Date(today.getTime() + days * DAY).toISOString().slice(0, 10);
const sampleCards = [
  { id: crypto.randomUUID(), name: "加州驾照", category: "identity", expiry: isoAfter(19), last4: "", reminder: 30, note: "提前准备续期材料" },
  { id: crypto.randomUUID(), name: "Chase Sapphire", category: "bank", expiry: isoAfter(64), last4: "4821", reminder: 90, note: "留意新卡邮寄地址" },
  { id: crypto.randomUUID(), name: "美国护照", category: "identity", expiry: isoAfter(177), last4: "", reminder: 90, note: "" }
];
let cards = loadCards();
let currentView = "home";

const $ = (id) => document.getElementById(id);
const grid = $("card-grid");
const modal = $("modal-backdrop");
const form = $("card-form");

function loadCards() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved : sampleCards;
  } catch { return sampleCards; }
}
function saveCards() { localStorage.setItem(STORAGE_KEY, JSON.stringify(cards)); }
function daysLeft(expiry) {
  const end = new Date(`${expiry}T23:59:59`);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return Math.ceil((end - start) / DAY);
}
function formatDate(date) {
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric" }).format(new Date(`${date}T12:00:00`));
}
function badge(days) {
  if (days < 0) return { text: `过期 ${Math.abs(days)} 天`, cls: "expired" };
  if (days <= 30) return { text: `${days} 天`, cls: "urgent" };
  if (days <= 90) return { text: `${days} 天`, cls: "soon" };
  return { text: `${days} 天`, cls: "safe" };
}
function filteredCards() {
  const query = $("search-input").value.trim().toLowerCase();
  const category = $("category-filter").value;
  let list = cards.filter(c => (!query || `${c.name} ${c.note || ""}`.toLowerCase().includes(query)) && (category === "all" || c.category === category));
  if (currentView === "home") list = list.filter(c => daysLeft(c.expiry) <= 90);
  if (currentView === "reminders") list = list.filter(c => daysLeft(c.expiry) <= Number(c.reminder));
  return list.sort((a, b) => new Date(a.expiry) - new Date(b.expiry));
}
function render() {
  const total = cards.length;
  const soon = cards.filter(c => daysLeft(c.expiry) >= 0 && daysLeft(c.expiry) <= 90).length;
  const expired = cards.filter(c => daysLeft(c.expiry) < 0).length;
  $("total-count").textContent = total;
  $("soon-count").textContent = soon;
  $("expired-count").textContent = expired;
  const titles = {
    home: ["即将到期", "未来 90 天内需要你留意的卡片与证件"],
    all: ["所有卡片", "按到期时间排序的全部记录"],
    reminders: ["提醒清单", "已经进入自定义提醒周期的项目"]
  };
  [$("section-title").textContent, $("section-description").textContent] = titles[currentView];
  const list = filteredCards();
  grid.innerHTML = list.map(c => {
    const days = daysLeft(c.expiry);
    const status = badge(days);
    const safeName = escapeHtml(c.name);
    return `<article class="expiry-card" data-id="${c.id}" tabindex="0" aria-label="编辑 ${safeName}">
      <div class="card-visual ${c.category}">
        <span class="category-label">${categories[c.category]}</span>
        <strong class="visual-title">${safeName}</strong>
        <span class="visual-number">${c.last4 ? `•••• ${escapeHtml(c.last4)}` : "EXPIRY REMINDER"}</span>
      </div>
      <div class="card-details"><div><h3>${safeName}</h3><p>${formatDate(c.expiry)}到期</p></div><span class="days-badge ${status.cls}">${status.text}</span></div>
    </article>`;
  }).join("");
  $("empty-state").hidden = list.length > 0;
  document.querySelectorAll(".expiry-card").forEach(el => {
    el.addEventListener("click", () => openModal(el.dataset.id));
    el.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") openModal(el.dataset.id); });
  });
}
function escapeHtml(value = "") {
  return value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
}
function openModal(id = "") {
  form.reset();
  $("card-id").value = id;
  $("modal-title").textContent = id ? "编辑卡片" : "添加卡片";
  $("delete-card").hidden = !id;
  if (id) {
    const card = cards.find(c => c.id === id);
    $("card-name").value = card.name;
    $("card-category").value = card.category;
    $("card-expiry").value = card.expiry;
    $("card-last4").value = card.last4 || "";
    $("card-reminder").value = String(card.reminder);
    $("card-note").value = card.note || "";
  } else {
    $("card-expiry").value = isoAfter(30);
    $("card-reminder").value = "30";
  }
  modal.hidden = false;
  document.body.style.overflow = "hidden";
  setTimeout(() => $("card-name").focus(), 40);
}
function closeModal() { modal.hidden = true; document.body.style.overflow = ""; }
function toast(message) {
  $("toast").textContent = message;
  $("toast").classList.add("show");
  setTimeout(() => $("toast").classList.remove("show"), 2200);
}

form.addEventListener("submit", e => {
  e.preventDefault();
  const id = $("card-id").value;
  const card = {
    id: id || crypto.randomUUID(),
    name: $("card-name").value.trim(),
    category: $("card-category").value,
    expiry: $("card-expiry").value,
    last4: $("card-last4").value.trim(),
    reminder: Number($("card-reminder").value),
    note: $("card-note").value.trim()
  };
  if (id) cards = cards.map(c => c.id === id ? card : c); else cards.push(card);
  saveCards(); render(); closeModal(); toast(id ? "卡片已更新" : "卡片已添加");
});
$("delete-card").addEventListener("click", () => {
  const id = $("card-id").value;
  if (!id || !confirm("确定删除这张卡片吗？")) return;
  cards = cards.filter(c => c.id !== id);
  saveCards(); render(); closeModal(); toast("卡片已删除");
});
["add-card-button", "empty-add-button"].forEach(id => $(id).addEventListener("click", () => openModal()));
["close-modal", "cancel-modal"].forEach(id => $(id).addEventListener("click", closeModal));
modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && !modal.hidden) closeModal(); });
$("search-input").addEventListener("input", render);
$("category-filter").addEventListener("change", render);
document.querySelectorAll(".nav-link").forEach(button => button.addEventListener("click", () => {
  currentView = button.dataset.view;
  document.querySelectorAll(".nav-link").forEach(b => b.classList.toggle("active", b === button));
  render();
}));
document.querySelector(".notification-button").addEventListener("click", () => {
  currentView = "reminders";
  document.querySelectorAll(".nav-link").forEach(b => b.classList.toggle("active", b.dataset.view === "reminders"));
  render();
  $("section-title").scrollIntoView({ behavior: "smooth" });
});
const hour = new Date().getHours();
$("greeting").textContent = hour < 6 ? "夜深了" : hour < 12 ? "早上好" : hour < 18 ? "下午好" : "晚上好";
render();

let deferredInstallPrompt = null;
const installBanner = $("install-banner");
window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  deferredInstallPrompt = event;
  if (localStorage.getItem("kapian_install_dismissed") !== "yes") installBanner.hidden = false;
});
$("install-app-button").addEventListener("click", async () => {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    const result = await deferredInstallPrompt.userChoice;
    if (result.outcome === "accepted") toast("卡期管家已安装");
    deferredInstallPrompt = null;
    installBanner.hidden = true;
  } else {
    toast("iPhone：点击分享按钮，再选择“添加到主屏幕”");
  }
});
$("dismiss-install").addEventListener("click", () => {
  installBanner.hidden = true;
  localStorage.setItem("kapian_install_dismissed", "yes");
});
window.addEventListener("appinstalled", () => {
  installBanner.hidden = true;
  toast("安装完成");
});
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js"));
}
