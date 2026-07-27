const ADMIN_PASSWORD = "i HATE MY LIFE218";
const API_BASE = "https://altiraz-backend.onrender.com/api";
const CART_KEY = "altirazCart";
const WHATSAPP_NUMBER = "218925016142";
let adminPasswordEntered = "";

const CATEGORIES = [
  { key: "women", label: "اثواب", tagline: "أثواب تقليدية فاخرة مستوحاة من التراث الليبي" },
  { key: "men", label: "رجال", tagline: "أزياء رجالية أصيلة تجمع بين التراث والفخامة" },
  { key: "kids", label: "أطفال", tagline: "تشكيلة مختارة بعناية لأصغر أفراد العائلة" },
  { key: "shoes", label: "أحذية", tagline: "أحذية مريحة وأنيقة تناسب كل إطلالة" },
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
let lastOrderId = null;
let logoTaps = [];
let categorySearchTerm = "";
let globalSearchTerm = "";

const mainEl = document.getElementById("main");
const navEl = document.getElementById("navButtons");
const bannerEl = document.getElementById("adminBanner");
const brandEl = document.getElementById("brandLogo");
const secretDot = document.getElementById("secretDot");
const headerCartBtn = document.getElementById("headerCartBtn");
const globalSearchInput = document.getElementById("globalSearch");
const globalSearchBtn = document.getElementById("globalSearchBtn");

function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

/* products & orders now live in Postgres via the Java API */
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
  if(adminUnlocked){
    html += `<button data-view="orders">الطلبات</button>`;
  }
  navEl.innerHTML = html;
  navEl.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => {
      if(btn.dataset.view === "home") goHome();
      else if(btn.dataset.view === "category") goCategory(btn.dataset.cat);
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
function goCategory(key){ view="category"; currentCategory=key; editingId=null; pendingImages=[]; categorySearchTerm=""; setActiveNav(); render(); scrollTop(); }
function goCart(){ view="cart"; checkoutOpen=false; orderConfirmed=false; setActiveNav(); render(); scrollTop(); }
function goSearchGlobal(term){
  view = "search";
  currentCategory = null;
  globalSearchTerm = term.trim();
  setActiveNav();
  render();
  scrollTop();
}
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
  else if(view === "search") renderSearchView();
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
  const featuredItems = products.filter(p => p.featured);

  let html = `
    <div class="hero reveal">
      <h1>الطراز</h1>
      <p>الطراز متجر ليبي متخصص في الأزياء التقليدية الأصيلة، نقدّم لكم أجمل وأرقى وأكثر التصاميم تميّزًا وأناقة، بلمسة تراثية خالصة.</p>
    </div>
  `;

  if(featuredItems.length > 0){
    html += `
      <div class="featured-section reveal">
        <h2>مختارات مميزة</h2>
        <div class="featured-scroll" id="featuredScroll"></div>
      </div>
    `;
  }

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

  if(featuredItems.length > 0){
    const scrollEl = document.getElementById("featuredScroll");
    scrollEl.innerHTML = featuredItems.map(buildCustomerCardHtml).join("");
    wireCustomerCards(scrollEl);
  }

  mainEl.querySelectorAll(".preview-btn").forEach(btn => {
    btn.addEventListener("click", () => goCategory(btn.dataset.cat));
  });
  mainEl.querySelectorAll(".preview-grid img").forEach(img => {
    img.addEventListener("click", () => {
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

  let html = `
    <div class="cat-top">
      <h2>${c.label}</h2>
      <p>${c.tagline}</p>
    </div>
    <div class="search-bar">
      <input type="text" id="catSearch" placeholder="ابحث في قسم ${c.label}..." value="${escapeHtml(categorySearchTerm)}">
    </div>
  `;

  if(adminUnlocked){
    html += renderAdminForm(key);
  }

  html += `<div id="categoryGridContainer"></div>`;

  mainEl.innerHTML = html;

  const searchInput = document.getElementById("catSearch");
  searchInput.addEventListener("input", () => {
    categorySearchTerm = searchInput.value;
    renderCategoryGrid(key);
  });

  if(adminUnlocked){
    wireAdminForm(key);
  }

  renderCategoryGrid(key);
}

function discountPercent(p){
  if(p.compareAtPrice && p.compareAtPrice > p.price){
    return Math.round((p.compareAtPrice - p.price) / p.compareAtPrice * 100);
  }
  return null;
}

function buildCustomerCardHtml(p){
  const sizes = p.sizes || [];
  const soldOut = p.inStock === false;
  const discount = discountPercent(p);
  return `
    <div class="tag" data-id="${p.id}">
      <img class="tag-img" src="${p.images[0]}" alt="${escapeHtml(p.name)}">
      ${soldOut ? `<span class="sold-out-badge">نفذت الكمية</span>` : ``}
      ${discount ? `<span class="discount-badge">خصم ${discount}%</span>` : ``}
      <h3 class="tag-name">${escapeHtml(p.name)}</h3>
      <p class="tag-desc">${escapeHtml(p.description)}</p>
      <div class="tag-footer">
        <div class="price-block">
          ${discount ? `<span class="tag-price-old mono">${p.compareAtPrice.toFixed(2)} د.ل</span>` : ``}
          <span class="tag-price mono">${Number(p.price).toFixed(2)} د.ل</span>
        </div>
        ${soldOut
          ? `<button class="add-cart-btn" disabled>نفذت الكمية</button>`
          : sizes.length > 0
            ? ``
            : `<button class="add-cart-btn" data-id="${p.id}">أضف إلى السلة</button>`
        }
      </div>
    </div>
  `;
}

function wireCustomerCards(container){
  container.querySelectorAll(".tag").forEach(tagEl => {
    tagEl.addEventListener("click", (e) => {
      if(e.target.closest("button")) return;
      openProductModal(Number(tagEl.dataset.id));
    });
  });
  container.querySelectorAll(".add-cart-btn:not([disabled])").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.id);
      addToCart(id, null, 1);
      const original = btn.textContent;
      btn.textContent = "أُضيفت ✓";
      btn.disabled = true;
      setTimeout(() => { btn.textContent = original; btn.disabled = false; }, 1200);
    });
  });
}

function renderCategoryGrid(key){
  const container = document.getElementById("categoryGridContainer");
  if(!container) return;

  const term = categorySearchTerm.trim().toLowerCase();
  let items = products.filter(p => p.category === key).reverse();
  if(term){
    items = items.filter(p =>
      p.name.toLowerCase().includes(term) || p.description.toLowerCase().includes(term)
    );
  }

  let html = "";
  if(items.length === 0){
    html = `
      <div class="empty">
        <h3>${term ? "لا توجد نتائج مطابقة." : "لا توجد قطع بعد في هذا القسم."}</h3>
        <p>${term ? "جرّب كلمة بحث أخرى." : "تابعونا، قريبًا قطع جديدة."}</p>
      </div>
    `;
    container.innerHTML = html;
    return;
  }

  if(adminUnlocked){
    html += '<div class="grid">';
    for(const p of items){
      const soldOut = p.inStock === false;
      const isFeatured = p.featured === true;
      html += `
        <div class="tag" data-id="${p.id}">
          <img class="tag-img" src="${p.images[0]}" alt="${escapeHtml(p.name)}">
          ${soldOut ? `<span class="sold-out-badge">نفذت الكمية</span>` : ``}
          <button type="button" class="feature-star ${isFeatured ? "active" : ""}" data-id="${p.id}" title="${isFeatured ? "إزالة من المختارات المميزة" : "إضافة إلى المختارات المميزة"}">
            <svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          </button>
          <h3 class="tag-name">${escapeHtml(p.name)}</h3>
          <p class="tag-desc">${escapeHtml(p.description)}</p>
          <div class="tag-footer">
            <span class="tag-price mono">${Number(p.price).toFixed(2)} د.ل</span>
            <div class="tag-admin-actions">
              <button class="tag-edit" data-id="${p.id}">تعديل</button>
              <button class="tag-del" data-id="${p.id}">حذف</button>
            </div>
          </div>
        </div>
      `;
    }
    html += '</div>';
    container.innerHTML = html;
    container.querySelectorAll(".tag").forEach(tagEl => {
      tagEl.addEventListener("click", (e) => {
        if(e.target.closest("button")) return;
        openProductModal(Number(tagEl.dataset.id));
      });
    });
    container.querySelectorAll(".tag-edit").forEach(btn => btn.addEventListener("click", () => startEdit(Number(btn.dataset.id), key)));
    container.querySelectorAll(".tag-del").forEach(btn => btn.addEventListener("click", () => handleDelete(Number(btn.dataset.id), key)));
    container.querySelectorAll(".feature-star").forEach(btn => btn.addEventListener("click", () => toggleFeatured(Number(btn.dataset.id), key)));
  } else {
    html = '<div class="grid">' + items.map(buildCustomerCardHtml).join("") + '</div>';
    container.innerHTML = html;
    wireCustomerCards(container);
  }
}

function renderSearchView(){
  const term = globalSearchTerm.toLowerCase();
  const items = term
    ? products.filter(p => p.name.toLowerCase().includes(term) || p.description.toLowerCase().includes(term))
    : [];

  let html = `<div class="cat-top"><h2>نتائج البحث${globalSearchTerm ? `: "${escapeHtml(globalSearchTerm)}"` : ""}</h2></div>`;

  if(items.length === 0){
    html += `
      <div class="empty">
        <h3>لا توجد نتائج مطابقة.</h3>
        <p>جرّب كلمة بحث أخرى، أو تصفّح الأقسام مباشرة.</p>
      </div>
    `;
    mainEl.innerHTML = html;
    return;
  }

  html += `<div class="grid" id="searchGrid"></div>`;
  mainEl.innerHTML = html;
  const grid = document.getElementById("searchGrid");
  grid.innerHTML = items.map(buildCustomerCardHtml).join("");
  wireCustomerCards(grid);
}

/* admin add/edit form */
function renderAdminForm(catKey){
  const editing = editingId ? products.find(p => p.id === editingId) : null;
  const sizesValue = editing && editing.sizes ? editing.sizes.join(", ") : "";
  const inStockChecked = editing ? editing.inStock !== false : true;
  const featuredChecked = editing ? editing.featured === true : false;
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
        <label for="fComparePrice">السعر الأصلي قبل الخصم (اختياري، اتركه فارغًا إذا لا يوجد خصم)</label>
        <input type="number" id="fComparePrice" min="0" step="0.01" placeholder="0.00" value="${editing && editing.compareAtPrice ? editing.compareAtPrice : ""}">
      </div>
      <div class="field">
        <label for="fSizes">المقاسات (افصل بينها بفاصلة، اتركها فارغة إذا لا يوجد مقاسات)</label>
        <input type="text" id="fSizes" placeholder="مثال: S, M, L, XL" value="${escapeHtml(sizesValue)}">
      </div>
      <div class="field field-checkbox">
        <label for="fInStock"><input type="checkbox" id="fInStock" ${inStockChecked ? "checked" : ""}> متوفر في المخزون</label>
      </div>
      <div class="field field-checkbox">
        <label for="fFeatured"><input type="checkbox" id="fFeatured" ${featuredChecked ? "checked" : ""}> إظهار في "مختارات مميزة" بالصفحة الرئيسية</label>
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
  const comparePrice = document.getElementById("fComparePrice").value;
  const sizesRaw = document.getElementById("fSizes").value;
  const inStock = document.getElementById("fInStock").checked;
  const featured = document.getElementById("fFeatured").checked;
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
  if(comparePrice && (isNaN(Number(comparePrice)) || Number(comparePrice) < 0)){
    msg.className = "form-error";
    msg.textContent = "أدخل السعر الأصلي بشكل صحيح، أو اتركه فارغًا.";
    return;
  }

  const sizes = sizesRaw.split(",").map(s => s.trim()).filter(s => s.length > 0);
  const compareAtPrice = comparePrice ? Number(comparePrice) : null;
  const payload = { name, description, category, price: Number(price), compareAtPrice, images, sizes, inStock, featured };
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

async function toggleFeatured(id, catKey){
  const p = products.find(p => p.id === id);
  if(!p) return;
  const payload = {
    name: p.name,
    description: p.description,
    category: p.category,
    price: p.price,
    compareAtPrice: p.compareAtPrice || null,
    images: p.images,
    sizes: p.sizes || [],
    inStock: p.inStock !== false,
    featured: !(p.featured === true)
  };
  try{
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-Admin-Password": adminPasswordEntered },
      body: JSON.stringify(payload)
    });
    if(!res.ok) throw new Error("toggle failed");
    await refreshProducts();
    renderCategoryGrid(catKey);
  }catch(e){ /* star just won't flip visually if the request failed */ }
}

/* cart (id + size uniquely identify a cart line) */
function addToCart(id, size, qty){
  const normSize = size || null;
  const addQty = qty && qty > 0 ? qty : 1;
  const entry = cart.find(i => i.id === id && (i.size || null) === normSize);
  if(entry) entry.qty += addQty;
  else cart.push({ id, size: normSize, qty: addQty });
  saveCart();
  refreshCartBadge();
}

function removeFromCart(id, size){
  const normSize = size || null;
  cart = cart.filter(i => !(i.id === id && (i.size || null) === normSize));
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
        ${lastOrderId ? `<p class="order-ref mono">رقم الطلب: #${lastOrderId}</p>` : ``}
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
    return { p, qty: i.qty, size: i.size || null };
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
          <div class="cart-row-meta mono">${r.size ? `المقاس: ${escapeHtml(r.size)} — ` : ``}الكمية: ${r.qty} &times; ${r.p.price.toFixed(2)} د.ل</div>
        </div>
        <button class="tag-del" data-id="${r.p.id}" data-size="${r.size ? escapeHtml(r.size) : ""}">إلغاء</button>
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
    btn.addEventListener("click", () => removeFromCart(Number(btn.dataset.id), btn.dataset.size || null));
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
    items: rows.map(r => ({ productId: r.p.id, name: r.p.name, price: r.p.price, qty: r.qty, size: r.size }))
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
    const created = await res.json();
    lastOrderId = created && created.id ? created.id : null;

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
            <span class="order-name">${escapeHtml(o.name)} <span class="order-id mono">#${o.id}</span></span>
            <button class="tag-del" data-id="${o.id}">حذف</button>
          </div>
          <div class="order-meta mono">${escapeHtml(o.phone)}</div>
          <div class="order-meta">${escapeHtml(o.location)}</div>
          <div class="order-items">
            ${o.items.map(i => `<div>${escapeHtml(i.name)}${i.size ? ` (${escapeHtml(i.size)})` : ``} &times; ${i.qty} — ${i.price.toFixed(2)} د.ل</div>`).join("")}
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
  const sizes = p.sizes || [];
  const soldOut = p.inStock === false;
  const discount = discountPercent(p);
  let selectedSize = sizes.length > 0 ? sizes[0] : null;
  let qty = 1;

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay product-modal-overlay";
  overlay.id = "productModalOverlay";

  function draw(){
    overlay.innerHTML = `
      <div class="product-modal">
        <button class="modal-close" id="closeProductModal">✕</button>
        <div class="pm-grid">
          <div class="pm-gallery">
            <div class="product-modal-imgwrap">
              ${p.images.length > 1 ? `<button class="pm-nav pm-prev" id="pmPrev">‹</button>` : ``}
              <img class="product-modal-img" src="${p.images[galleryIndex]}" alt="${escapeHtml(p.name)}">
              ${p.images.length > 1 ? `<button class="pm-nav pm-next" id="pmNext">›</button>` : ``}
              ${p.images.length > 1 ? `<span class="pm-counter mono">${galleryIndex+1} / ${p.images.length}</span>` : ``}
            </div>
            ${p.images.length > 1 ? `
              <div class="product-modal-thumbs">
                ${p.images.map((img,i) => `<img class="pm-thumb ${i===galleryIndex ? "active" : ""}" data-i="${i}" src="${img}">`).join("")}
              </div>
            ` : ``}
          </div>
          <div class="pm-info">
            <h3 class="product-modal-name">${escapeHtml(p.name)}</h3>
            <p class="product-modal-desc">${escapeHtml(p.description)}</p>
            ${discount ? `<span class="discount-badge pm-discount-badge">خصم ${discount}%</span>` : ``}
            <div class="price-block pm-price-block">
              ${discount ? `<span class="tag-price-old mono">${p.compareAtPrice.toFixed(2)} د.ل</span>` : ``}
              <span class="tag-price mono">${Number(p.price).toFixed(2)} د.ل</span>
            </div>
            ${soldOut ? `<p class="sold-out-text">نفذت الكمية حاليًا</p>` : `
              ${(!adminUnlocked && sizes.length > 0) ? `
                <div class="pm-size-block">
                  <div class="pm-size-label">المقاس</div>
                  <div class="pm-size-group">
                    ${sizes.map(s => `<button type="button" class="pm-size-btn ${s === selectedSize ? "active" : ""}" data-size="${escapeHtml(s)}">${escapeHtml(s)}</button>`).join("")}
                  </div>
                </div>
              ` : ``}
              ${!adminUnlocked ? `
                <div class="pm-qty-block">
                  <div class="pm-size-label">الكمية</div>
                  <div class="pm-qty-stepper">
                    <button type="button" id="pmQtyMinus">−</button>
                    <span class="mono" id="pmQtyValue">${qty}</span>
                    <button type="button" id="pmQtyPlus">+</button>
                  </div>
                </div>
                <button class="primary-btn" id="pmAddCart" style="margin-top:6px;">أضف إلى السلة</button>
              ` : ``}
            `}
          </div>
        </div>
      </div>
    `;
    overlay.querySelector("#closeProductModal").addEventListener("click", closeProductModal);
    overlay.querySelectorAll(".pm-thumb").forEach(t => {
      t.addEventListener("click", () => { galleryIndex = Number(t.dataset.i); draw(); });
    });
    const prevBtn = overlay.querySelector("#pmPrev");
    const nextBtn = overlay.querySelector("#pmNext");
    if(prevBtn) prevBtn.addEventListener("click", () => {
      galleryIndex = (galleryIndex - 1 + p.images.length) % p.images.length;
      draw();
    });
    if(nextBtn) nextBtn.addEventListener("click", () => {
      galleryIndex = (galleryIndex + 1) % p.images.length;
      draw();
    });
    overlay.querySelectorAll(".pm-size-btn").forEach(btn => {
      btn.addEventListener("click", () => { selectedSize = btn.dataset.size; draw(); });
    });
    const qtyMinus = overlay.querySelector("#pmQtyMinus");
    const qtyPlus = overlay.querySelector("#pmQtyPlus");
    if(qtyMinus) qtyMinus.addEventListener("click", () => { if(qty > 1) qty--; draw(); });
    if(qtyPlus) qtyPlus.addEventListener("click", () => { qty++; draw(); });
    const addBtn = overlay.querySelector("#pmAddCart");
    if(addBtn){
      addBtn.addEventListener("click", () => {
        addToCart(p.id, selectedSize, qty);
        const original = addBtn.textContent;
        addBtn.textContent = "أُضيفت ✓";
        addBtn.disabled = true;
        setTimeout(() => { closeProductModal(); }, 500);
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
headerCartBtn.addEventListener("click", goCart);
globalSearchBtn.addEventListener("click", () => goSearchGlobal(globalSearchInput.value));
globalSearchInput.addEventListener("keydown", e => {
  if(e.key === "Enter") goSearchGlobal(globalSearchInput.value);
});

/* init */
(async function init(){
  loadCart();
  buildNav();
  await loadProducts();
  render();
})();
