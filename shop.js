const ADMIN_PASSWORD = "i HATE MY LIFE218";
const API_BASE = "https://altiraz-backend.onrender.com/api";
const CART_KEY = "altirazCart";
let adminPasswordEntered = "";

const CATEGORIES = [
  { key: "women", label: "اثواب", tagline: "أثواب تقليدية فاخرة مستوحاة من التراث الليبي" },
  { key: "men", label: "رجال", tagline: "أزياء رجالية أصيلة تجمع بين التراث والفخامة" },
  { key: "kids", label: "أطفال", tagline: "تشكيلة مختارة بعناية لأصغر أفراد العائلة" },
  { key: "underwear", label: "ملابس داخلية", tagline: "راحة وجودة عالية لكل أفراد العائلة" },
  { key: "accessories", label: "اكسسوارات", tagline: "لمسات تكمّل إطلالتك التقليدية" },
  { key: "perfumes", label: "عطور", tagline: "عطور أصيلة تدوم طويلًا" }
];

let products = [];
let cart = [];
let orders = [];
let view = "home"; // home | category | cart | orders
let currentCategory = null;
let adminUnlocked = false;
let loaded = false;
let pendingImages = [];
let editingId = null;
let gateOpen = false;
let checkoutOpen = false;
let orderConfirmed = false;
let logoTaps = [];

const mainEl = document.getElementById("main");
const navEl = document.getElementById("navButtons");
const bannerEl = document.getElementById("adminBanner");
const brandEl = document.getElementById("brandLogo");
const secretDot = document.getElementById("secretDot");

function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

/* products & orders now live in SQL Server via the Java API */
async function loadProducts(){
  try{
    const res = await fetch(`${API_BASE}/products`);
    const data = await res.json();
    products = (res.ok && Array.isArray(data)) ? data : [];
  }catch(e){
    products = [];
  }
  loaded = true;
}
async function refreshProducts(){
  try{
    const res = await fetch(`${API_BASE}/products`);
    const data = await res.json();
    if(res.ok && Array.isArray(data)) products = data;
  }catch(e){ /* keep old list if the request fails */ }
}
function loadCart(){
  try{
    const raw = localStorage.getItem(CART_KEY);
    cart = raw ? JSON.parse(raw) : [];
  }catch(e){ cart = []; }
}
function saveCart(){
  try{ localStorage.setItem(CART_KEY, JSON.stringify(cart)); return true; }
  catch(e){ return false; }
}
async function loadOrders(){
  try{
    const res = await fetch(`${API_BASE}/orders`, { headers: { "X-Admin-Password": adminPasswordEntered } });
    const data = await res.json();
    orders = (res.ok && Array.isArray(data)) ? data : [];
  }catch(e){
    orders = [];
  }
}

/* nav build */
function buildNav(){
  let html = `<button data-view="home">الرئيسية</button>`;
  for(const c of CATEGORIES){
    html += `<button data-view="category" data-cat="${c.key}">${c.label}</button>`;
  }
  html += `<button data-view="cart">السلة<span class="cart-badge" id="cartBadge">0</span></button>`;
  if(adminUnlocked){
    html += `<button data-view="orders">الطلبات</button>`;
  }
  navEl.innerHTML = html;
  navEl.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => {
      if(btn.dataset.view === "home") goHome();
      else if(btn.dataset.view === "category") goCategory(btn.dataset.cat);
      else if(btn.dataset.view === "cart") goCart();
      else if(btn.dataset.view === "orders") goOrders();
    });
  });
  refreshCartBadge();
}

function setActiveNav(){
  navEl.querySelectorAll("button").forEach(btn => {
    let active = false;
    if(view === "home" && btn.dataset.view === "home") active = true;
    if(view === "category" && btn.dataset.cat === currentCategory) active = true;
    if(view === "cart" && btn.dataset.view === "cart") active = true;
    if(view === "orders" && btn.dataset.view === "orders") active = true;
    btn.classList.toggle("active", active);
  });
}

function refreshCartBadge(){
  const badge = document.getElementById("cartBadge");
  if(!badge) return;
  const count = cart.reduce((sum, i) => sum + i.qty, 0);
  badge.textContent = count;
  badge.style.display = count > 0 ? "inline-block" : "none";
}

function goHome(){ view="home"; currentCategory=null; editingId=null; pendingImages=[]; setActiveNav(); render(); scrollTop(); }
function goCategory(key){ view="category"; currentCategory=key; editingId=null; pendingImages=[]; setActiveNav(); render(); scrollTop(); }
function goCart(){ view="cart"; checkoutOpen=false; orderConfirmed=false; setActiveNav(); render(); scrollTop(); }
async function goOrders(){
  view="orders";
  setActiveNav();
  mainEl.innerHTML = '<div class="loading">جاري التحميل…</div>';
  await loadOrders();
  render();
  scrollTop();
}
function scrollTop(){ window.scrollTo({top:0, behavior:"smooth"}); }

/* render dispatch */
function render(){
  if(!loaded){
    mainEl.innerHTML = '<div class="loading">جاري التحميل…</div>';
    return;
  }
  renderBanner();
  if(view === "home") renderHome();
  else if(view === "category") renderCategory(currentCategory);
  else if(view === "cart") renderCart();
  else if(view === "orders") renderOrders();
}

function renderBanner(){
  if(adminUnlocked){
    bannerEl.style.display = "flex";
    bannerEl.innerHTML = `وضع الإدارة مفعّل <button id="logoutBtn">تسجيل الخروج</button>`;
    document.getElementById("logoutBtn").addEventListener("click", () => {
      adminUnlocked = false;
      adminPasswordEntered = "";
      if(view === "orders") view = "home";
      buildNav();
      setActiveNav();
      renderBanner();
      render();
    });
  } else {
    bannerEl.style.display = "none";
    bannerEl.innerHTML = "";
  }
}

/* home view */
function renderHome(){
  let html = `
    <div class="hero reveal">
      <h1>الطراز</h1>
      <p>الطراز متجر ليبي متخصص في الأزياء التقليدية الأصيلة، نقدّم لكم أجمل وأرقى وأكثر التصاميم تميّزًا وأناقة، بلمسة تراثية خالصة.</p>
    </div>

    <div class="contact reveal">
      <h2>تواصل معنا</h2>
      <p>للطلب أو الاستفسار، اتصل بنا مباشرة</p>
      <a class="mono" href="tel:0925016142">0925016142</a>
    </div>
  `;

  for(const c of CATEGORIES){
    const items = products.filter(p => p.category === c.key).slice(-3).reverse();
    html += `
      <div class="preview reveal">
        <h2>${c.label}</h2>
        <p>${c.tagline}</p>
        ${items.length ? `
          <div class="preview-grid">
            ${items.map(p => `<img src="${p.images[0]}" alt="${escapeHtml(p.name)}" data-cat="${c.key}" data-id="${p.id}">`).join("")}
          </div>
        ` : `<div class="preview-empty">قريبًا قطع جديدة في هذا القسم.</div>`}
        <button class="preview-btn" data-cat="${c.key}">تسوق قسم ${c.label}</button>
      </div>
    `;
  }

  mainEl.innerHTML = html;
  mainEl.querySelectorAll(".preview-btn").forEach(btn => {
    btn.addEventListener("click", () => goCategory(btn.dataset.cat));
  });
  mainEl.querySelectorAll(".preview-grid img").forEach(img => {
    img.addEventListener("click", () => {
      goCategory(img.dataset.cat);
      openProductModal(Number(img.dataset.id));
    });
  });
  setupReveal();
}

function setupReveal(){
  const els = mainEl.querySelectorAll(".reveal");
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        entry.target.classList.add("in");
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  els.forEach(el => io.observe(el));
}

/* category view */
function renderCategory(key){
  const c = CATEGORIES.find(c => c.key === key);
  const items = products.filter(p => p.category === key).reverse();

  let html = `
    <div class="cat-top">
      <h2>${c.label}</h2>
      <p>${c.tagline}</p>
    </div>
  `;

  if(adminUnlocked){
    html += renderAdminForm(key);
  }

  if(items.length === 0){
    html += `
      <div class="empty">
        <h3>لا توجد قطع بعد في هذا القسم.</h3>
        <p>تابعونا، قريبًا قطع جديدة.</p>
      </div>
    `;
  } else {
    html += '<div class="grid">';
    for(const p of items){
      html += `
        <div class="tag" data-id="${p.id}">
          <img class="tag-img" src="${p.images[0]}" alt="${escapeHtml(p.name)}">
          <h3 class="tag-name">${escapeHtml(p.name)}</h3>
          <p class="tag-desc">${escapeHtml(p.description)}</p>
          <div class="tag-footer">
            <span class="tag-price mono">${Number(p.price).toFixed(2)} د.ل</span>
            ${adminUnlocked ? `
              <div class="tag-admin-actions">
                <button class="tag-edit" data-id="${p.id}">تعديل</button>
                <button class="tag-del" data-id="${p.id}">حذف</button>
              </div>
            ` : `
              <button class="add-cart-btn" data-id="${p.id}">أضف إلى السلة</button>
            `}
          </div>
        </div>
      `;
    }
    html += '</div>';
  }

  mainEl.innerHTML = html;

  mainEl.querySelectorAll(".tag").forEach(tagEl => {
    tagEl.addEventListener("click", (e) => {
      if(e.target.closest("button")) return;
      openProductModal(Number(tagEl.dataset.id));
    });
  });

  if(adminUnlocked){
    wireAdminForm(key);
    mainEl.querySelectorAll(".tag-edit").forEach(btn => btn.addEventListener("click", () => startEdit(Number(btn.dataset.id), key)));
    mainEl.querySelectorAll(".tag-del").forEach(btn => btn.addEventListener("click", () => handleDelete(Number(btn.dataset.id), key)));
  } else {
    mainEl.querySelectorAll(".add-cart-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        addToCart(Number(btn.dataset.id));
        const original = btn.textContent;
        btn.textContent = "أُضيفت ✓";
        btn.disabled = true;
        setTimeout(() => { btn.textContent = original; btn.disabled = false; }, 1200);
      });
    });
  }
}

/* admin add/edit form */
function renderAdminForm(catKey){
  const editing = editingId ? products.find(p => p.id === editingId) : null;
  return `
    <div class="panel">
      <h3>${editing ? "تعديل القطعة" : "إضافة قطعة جديدة"}</h3>
      <div class="field">
        <label for="fName">الاسم</label>
        <input type="text" id="fName" placeholder="جلابة تقليدية مطرزة" value="${editing ? escapeHtml(editing.name) : ""}">
      </div>
      <div class="field">
        <label for="fDesc">الوصف</label>
        <textarea id="fDesc" placeholder="تصميم أصيل بخيوط مطرزة يدويًا، قماش فاخر ومريح.">${editing ? escapeHtml(editing.description) : ""}</textarea>
      </div>
      <div class="field">
        <label for="fCat">القسم</label>
        <select id="fCat">
          ${CATEGORIES.map(c => `<option value="${c.key}" ${((editing ? editing.category : catKey) === c.key) ? "selected" : ""}>${c.label}</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label for="fPrice">السعر (د.ل)</label>
        <input type="number" id="fPrice" min="0" step="0.01" placeholder="0.00" value="${editing ? editing.price : ""}">
      </div>
      <div class="field">
        <label for="fImage">الصور (يمكن اختيار أكثر من صورة، الصورة الأولى هي التي تظهر في المتجر)</label>
        <div class="upload-box">
          <input type="file" id="fImage" accept="image/*" multiple>
        </div>
        <div class="preview-strip" id="fPreviewStrip"></div>
      </div>
      <button class="primary-btn" id="saveBtn">${editing ? "حفظ التعديلات" : "إضافة إلى المتجر"}</button>
      ${editing ? `<button class="ghost-btn" id="cancelEditBtn">إلغاء</button>` : ``}
      <p class="form-error" id="formMsg"></p>
    </div>
  `;
}

function wireAdminForm(catKey){
  const fileInput = document.getElementById("fImage");
  fileInput.addEventListener("change", async () => {
    const files = Array.from(fileInput.files);
    for(const file of files){
      const dataUrl = await resizeImage(file);
      pendingImages.push(dataUrl);
    }
    fileInput.value = "";
    renderPreviewStrip();
  });
  renderPreviewStrip();
  document.getElementById("saveBtn").addEventListener("click", () => handleSave(catKey));
  const cancelBtn = document.getElementById("cancelEditBtn");
  if(cancelBtn){
    cancelBtn.addEventListener("click", () => {
      editingId = null;
      pendingImages = [];
      renderCategory(catKey);
    });
  }
}

function renderPreviewStrip(){
  const box = document.getElementById("fPreviewStrip");
  if(!box) return;
  box.innerHTML = pendingImages.map((img, i) => `
    <div class="preview-thumb">
      <img src="${img}">
      <button type="button" class="preview-thumb-remove" data-i="${i}">×</button>
    </div>
  `).join("");
  box.querySelectorAll(".preview-thumb-remove").forEach(btn => {
    btn.addEventListener("click", () => {
      pendingImages.splice(Number(btn.dataset.i), 1);
      renderPreviewStrip();
    });
  });
}

function resizeImage(file){
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 900;
        let w = img.width, h = img.height;
        if(w > h && w > maxDim){ h = h * (maxDim / w); w = maxDim; }
        else if(h > maxDim){ w = w * (maxDim / h); h = maxDim; }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function startEdit(id, catKey){
  editingId = id;
  const p = products.find(p => p.id === id);
  pendingImages = p ? [...p.images] : [];
  renderCategory(catKey);
  scrollTop();
}

async function handleSave(catKey){
  const name = document.getElementById("fName").value.trim();
  const description = document.getElementById("fDesc").value.trim();
  const category = document.getElementById("fCat").value;
  const price = document.getElementById("fPrice").value;
  const msg = document.getElementById("formMsg");
  const editing = editingId ? products.find(p => p.id === editingId) : null;
  const images = pendingImages;

  if(!name || !description || !price || images.length === 0){
    msg.className = "form-error";
    msg.textContent = "املأ الاسم والوصف والسعر واختر صورة واحدة على الأقل قبل الحفظ.";
    return;
  }
  if(isNaN(Number(price)) || Number(price) < 0){
    msg.className = "form-error";
    msg.textContent = "أدخل سعرًا صحيحًا.";
    return;
  }

  const payload = { name, description, category, price: Number(price), images };
  const saveBtn = document.getElementById("saveBtn");
  saveBtn.disabled = true;

  try{
    const res = editing
      ? await fetch(`${API_BASE}/products/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", "X-Admin-Password": adminPasswordEntered },
          body: JSON.stringify(payload)
        })
      : await fetch(`${API_BASE}/products`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Admin-Password": adminPasswordEntered },
          body: JSON.stringify(payload)
        });

    if(!res.ok) throw new Error("save failed");

    await refreshProducts();
    editingId = null;
    pendingImages = [];
    renderCategory(catKey);
  }catch(e){
    saveBtn.disabled = false;
    msg.className = "form-error";
    msg.textContent = "تعذر الحفظ. تحقق من اتصال الخادم بقاعدة البيانات.";
  }
}

async function handleDelete(id, catKey){
  try{
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: "DELETE",
      headers: { "X-Admin-Password": adminPasswordEntered }
    });
    if(!res.ok) throw new Error("delete failed");
    await refreshProducts();
    cart = cart.filter(i => i.id !== id);
    saveCart();
    renderCategory(catKey);
  }catch(e){ /* leave the item in place if the server call failed */ }
}

/* cart */
function addToCart(id){
  const entry = cart.find(i => i.id === id);
  if(entry) entry.qty += 1;
  else cart.push({ id, qty: 1 });
  saveCart();
  refreshCartBadge();
}

function removeFromCart(id){
  cart = cart.filter(i => i.id !== id);
  saveCart();
  refreshCartBadge();
  renderCart();
}

function renderCart(){
  cart = cart.filter(i => products.some(p => p.id === i.id));
  saveCart();

  if(orderConfirmed){
    mainEl.innerHTML = `
      <div class="empty" style="padding-top:60px;">
        <h3>تم استلام طلبك بنجاح</h3>
        <p>سنتواصل معك قريبًا على الرقم الذي أدخلته لتأكيد التفاصيل والتوصيل.</p>
        <button class="preview-btn" id="backHomeBtn" style="margin-top:16px;">العودة للتسوق</button>
      </div>
    `;
    document.getElementById("backHomeBtn").addEventListener("click", goHome);
    refreshCartBadge();
    return;
  }

  const rows = cart.map(i => {
    const p = products.find(p => p.id === i.id);
    return { p, qty: i.qty };
  });
  const total = rows.reduce((sum, r) => sum + r.p.price * r.qty, 0);

  let html = `<div class="cat-top"><h2>السلة</h2></div>`;

  if(rows.length === 0){
    html += `
      <div class="empty">
        <h3>سلتك فارغة.</h3>
        <p>تصفّح المتجر وأضف القطع التي تعجبك.</p>
        <button class="preview-btn" id="goShopBtn" style="margin-top:12px;">تسوّق الآن</button>
      </div>
    `;
    mainEl.innerHTML = html;
    document.getElementById("goShopBtn").addEventListener("click", goHome);
    return;
  }

  html += '<div class="cart-list">';
  for(const r of rows){
    html += `
      <div class="cart-row">
        <img class="cart-row-img" src="${r.p.images[0]}" alt="${escapeHtml(r.p.name)}">
        <div class="cart-row-info">
          <div class="cart-row-name">${escapeHtml(r.p.name)}</div>
          <div class="cart-row-meta mono">الكمية: ${r.qty} &times; ${r.p.price.toFixed(2)} د.ل</div>
        </div>
        <button class="tag-del" data-id="${r.p.id}">إلغاء</button>
      </div>
    `;
  }
  html += '</div>';

  html += `<div class="cart-total mono">الإجمالي: ${total.toFixed(2)} د.ل</div>`;

  if(!checkoutOpen){
    html += `<button class="primary-btn" id="checkoutBtn">إتمام الطلب</button>`;
  } else {
    html += `
      <div class="panel">
        <h3>بيانات التوصيل</h3>
        <div class="field">
          <label for="oName">الاسم</label>
          <input type="text" id="oName" placeholder="اسمك الكامل">
        </div>
        <div class="field">
          <label for="oPhone">رقم الهاتف</label>
          <input type="tel" id="oPhone" inputmode="numeric" maxlength="10" placeholder="09xxxxxxxx">
        </div>
        <div class="field">
          <label for="oLocation">الموقع</label>
          <input type="text" id="oLocation" placeholder="المدينة، الحي، أقرب نقطة دالة">
        </div>
        <button class="primary-btn" id="confirmOrderBtn">تأكيد الطلب</button>
        <button class="ghost-btn" id="cancelCheckoutBtn">رجوع</button>
        <p class="form-error" id="orderMsg"></p>
      </div>
    `;
  }

  mainEl.innerHTML = html;

  mainEl.querySelectorAll(".cart-row .tag-del").forEach(btn => {
    btn.addEventListener("click", () => removeFromCart(Number(btn.dataset.id)));
  });

  if(!checkoutOpen){
    document.getElementById("checkoutBtn").addEventListener("click", () => { checkoutOpen = true; renderCart(); });
  } else {
    document.getElementById("cancelCheckoutBtn").addEventListener("click", () => { checkoutOpen = false; renderCart(); });
    document.getElementById("confirmOrderBtn").addEventListener("click", () => handleConfirmOrder(rows, total));
    const phoneInput = document.getElementById("oPhone");
    phoneInput.addEventListener("input", () => {
      phoneInput.value = phoneInput.value.replace(/[^0-9]/g, "").slice(0, 10);
    });
  }
}

async function handleConfirmOrder(rows, total){
  const name = document.getElementById("oName").value.trim();
  const phone = document.getElementById("oPhone").value.trim();
  const location = document.getElementById("oLocation").value.trim();
  const msg = document.getElementById("orderMsg");

  if(!name || !phone || !location){
    msg.className = "form-error";
    msg.textContent = "املأ الاسم ورقم الهاتف والموقع لإتمام الطلب.";
    return;
  }
  if(!/^[0-9]{10}$/.test(phone)){
    msg.className = "form-error";
    msg.textContent = "رقم الهاتف يجب أن يتكون من 10 أرقام بالضبط.";
    return;
  }

  const payload = {
    name, phone, location,
    total,
    items: rows.map(r => ({ productId: r.p.id, name: r.p.name, price: r.p.price, qty: r.qty }))
  };
  const confirmBtn = document.getElementById("confirmOrderBtn");
  confirmBtn.disabled = true;

  try{
    const res = await fetch(`${API_BASE}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if(!res.ok) throw new Error("order failed");

    cart = [];
    saveCart();
    checkoutOpen = false;
    orderConfirmed = true;
    renderCart();
  }catch(e){
    confirmBtn.disabled = false;
    msg.className = "form-error";
    msg.textContent = "تعذر إرسال الطلب. تحقق من الاتصال وحاول مرة أخرى.";
  }
}

/* orders (admin) */
function renderOrders(){
  let html = `<div class="cat-top"><h2>الطلبات</h2></div>`;
  if(orders.length === 0){
    html += `<div class="empty"><h3>لا توجد طلبات بعد.</h3></div>`;
  } else {
    html += '<div class="order-list">';
    for(const o of [...orders].reverse()){
      const d = new Date(o.date);
      html += `
        <div class="order-card">
          <div class="order-head">
            <span class="order-name">${escapeHtml(o.name)}</span>
            <button class="tag-del" data-id="${o.id}">حذف</button>
          </div>
          <div class="order-meta mono">${escapeHtml(o.phone)}</div>
          <div class="order-meta">${escapeHtml(o.location)}</div>
          <div class="order-items">
            ${o.items.map(i => `<div>${escapeHtml(i.name)} &times; ${i.qty} — ${i.price.toFixed(2)} د.ل</div>`).join("")}
          </div>
          <div class="order-total mono">الإجمالي: ${o.total.toFixed(2)} د.ل</div>
          <div class="order-date">${d.toLocaleString("ar")}</div>
        </div>
      `;
    }
    html += '</div>';
  }
  mainEl.innerHTML = html;
  mainEl.querySelectorAll(".order-card .tag-del").forEach(btn => {
    btn.addEventListener("click", async () => {
      try{
        await fetch(`${API_BASE}/orders/${btn.dataset.id}`, {
          method: "DELETE",
          headers: { "X-Admin-Password": adminPasswordEntered }
        });
      }catch(e){ /* ignore, list will just show it again on next load if delete failed */ }
      await loadOrders();
      renderOrders();
    });
  });
}

/* product detail modal (fullscreen) */
function openProductModal(id){
  const p = products.find(p => p.id === id);
  if(!p) return;
  let galleryIndex = 0;

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay product-modal-overlay";
  overlay.id = "productModalOverlay";

  function draw(){
    overlay.innerHTML = `
      <div class="product-modal">
        <button class="modal-close" id="closeProductModal">✕</button>
        <div class="product-modal-imgwrap">
          ${p.images.length > 1 ? `<button class="pm-nav pm-prev" id="pmPrev">‹</button>` : ``}
          <img class="product-modal-img" src="${p.images[galleryIndex]}" alt="${escapeHtml(p.name)}">
          ${p.images.length > 1 ? `<button class="pm-nav pm-next" id="pmNext">›</button>` : ``}
        </div>
        ${p.images.length > 1 ? `
          <div class="product-modal-thumbs">
            ${p.images.map((img,i) => `<img class="pm-thumb ${i===galleryIndex ? "active" : ""}" data-i="${i}" src="${img}">`).join("")}
          </div>
        ` : ``}
        <h3 class="product-modal-name">${escapeHtml(p.name)}</h3>
        <p class="product-modal-desc">${escapeHtml(p.description)}</p>
        <span class="tag-price mono">${Number(p.price).toFixed(2)} د.ل</span>
        ${!adminUnlocked ? `<button class="primary-btn" id="pmAddCart" style="margin-top:16px;">أضف إلى السلة</button>` : ``}
      </div>
    `;
    document.getElementById("closeProductModal").addEventListener("click", closeProductModal);
    overlay.querySelectorAll(".pm-thumb").forEach(t => {
      t.addEventListener("click", () => { galleryIndex = Number(t.dataset.i); draw(); });
    });
    const prevBtn = document.getElementById("pmPrev");
    const nextBtn = document.getElementById("pmNext");
    if(prevBtn) prevBtn.addEventListener("click", () => {
      galleryIndex = (galleryIndex - 1 + p.images.length) % p.images.length;
      draw();
    });
    if(nextBtn) nextBtn.addEventListener("click", () => {
      galleryIndex = (galleryIndex + 1) % p.images.length;
      draw();
    });
    if(!adminUnlocked){
      document.getElementById("pmAddCart").addEventListener("click", () => {
        addToCart(p.id);
        closeProductModal();
      });
    }
  }
  draw();

  function keyHandler(e){
    if(e.key === "Escape") closeProductModal();
    if(e.key === "ArrowLeft"){ galleryIndex = (galleryIndex + 1) % p.images.length; draw(); }
    if(e.key === "ArrowRight"){ galleryIndex = (galleryIndex - 1 + p.images.length) % p.images.length; draw(); }
  }
  document.addEventListener("keydown", keyHandler);
  overlay.addEventListener("click", e => { if(e.target === overlay) closeProductModal(); });
  document.body.appendChild(overlay);
  overlay._keyHandler = keyHandler;
}
function closeProductModal(){
  const el = document.getElementById("productModalOverlay");
  if(el){
    if(el._keyHandler) document.removeEventListener("keydown", el._keyHandler);
    el.remove();
  }
}

/* hidden admin access */
function openGate(){
  gateOpen = true;
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.id = "gateOverlay";
  overlay.innerHTML = `
    <div class="modal-box">
      <h2>دخول الإدارة</h2>
      <p>أدخل كلمة المرور لإدارة المتجر</p>
      <div class="gate-error" id="gateError"></div>
      <input type="password" id="gatePass" placeholder="كلمة المرور">
      <button class="primary-btn" id="gateSubmit">دخول</button>
      <button class="ghost-btn" id="gateCancel">إلغاء</button>
    </div>
  `;
  document.body.appendChild(overlay);
  const input = document.getElementById("gatePass");
  const err = document.getElementById("gateError");
  function tryUnlock(){
    if(input.value === ADMIN_PASSWORD){
      adminUnlocked = true;
      adminPasswordEntered = input.value;
      closeGate();
      buildNav();
      setActiveNav();
      render();
    } else {
      err.textContent = "كلمة المرور غير صحيحة.";
    }
  }
  document.getElementById("gateSubmit").addEventListener("click", tryUnlock);
  document.getElementById("gateCancel").addEventListener("click", closeGate);
  overlay.addEventListener("click", e => { if(e.target === overlay) closeGate(); });
  input.addEventListener("keydown", e => { if(e.key === "Enter") tryUnlock(); });
  input.focus();
}
function closeGate(){
  gateOpen = false;
  const overlay = document.getElementById("gateOverlay");
  if(overlay) overlay.remove();
}

function registerLogoTap(){
  const now = Date.now();
  logoTaps = logoTaps.filter(t => now - t < 2500);
  logoTaps.push(now);
  if(logoTaps.length >= 5){
    logoTaps = [];
    if(!adminUnlocked && !gateOpen) openGate();
  }
}
brandEl.addEventListener("click", registerLogoTap);
secretDot.addEventListener("click", () => { if(!adminUnlocked && !gateOpen) openGate(); });

/* init */
(async function init(){
  loadCart();
  buildNav();
  await loadProducts();
  render();
})();
