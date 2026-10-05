/* ============================================================
   ORDERS.JS — Fitur Status Pesanan & Chat Penjual
   Bergantung pada: STORE, products, rupiah, showToast
   dari script.js (dimuat setelah file ini).
   ============================================================ */

/* ============================================================
   KONFIGURASI ORDER
   ============================================================ */
const ORDER_KEY = "avicena_orders_v1";

const STATUS_MAP = {
  pending:  { label: "Menunggu Konfirmasi", cls: "status-pending" },
  process:  { label: "Sedang Diproses",     cls: "status-process" },
  shipped:  { label: "Sedang Dikirim",      cls: "status-shipped" },
  done:     { label: "Selesai",             cls: "status-done" },
  cancel:   { label: "Dibatalkan",          cls: "status-cancel" }
};

/* ============================================================
   LOCALSTORAGE
   ============================================================ */
function loadOrders(){
  try{
    return JSON.parse(localStorage.getItem(ORDER_KEY) || "[]");
  }catch(e){
    return [];
  }
}

function saveOrders(orders){
  try{
    localStorage.setItem(ORDER_KEY, JSON.stringify(orders));
  }catch(e){
    console.warn("Gagal menyimpan pesanan:", e);
  }
}

/* ============================================================
   GENERATE ID & TAMBAH PESANAN
   ============================================================ */
function generateOrderId(){
  const d = new Date();
  const pad = (n,l=2) => String(n).padStart(l,"0");
  return "AVF-" + d.getFullYear() + pad(d.getMonth()+1) + pad(d.getDate()) +
         "-" + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
}

function addOrder(order){
  const orders = loadOrders();
  orders.unshift(order);
  if (orders.length > 50) orders.length = 50;
  saveOrders(orders);
  updateOrderBadge();
}

/* ============================================================
   BADGE PESANAN DI NAVBAR
   ============================================================ */
function updateOrderBadge(){
  const orders = loadOrders();
  const active = orders.filter(o => o.statusKey !== "done" && o.statusKey !== "cancel").length;
  const badge = document.getElementById("orderBadge");
  if (!badge) return;
  badge.textContent = active;
  badge.style.display = active ? "grid" : "none";
}

/* ============================================================
   DRAWER STATUS PESANAN
   ============================================================ */
function openOrders(){
  renderOrders();
  document.getElementById("orderDrawer").classList.add("open");
  document.getElementById("orderOverlay").classList.add("open");
  document.body.classList.add("locked");
}

function closeOrders(){
  document.getElementById("orderDrawer").classList.remove("open");
  document.getElementById("orderOverlay").classList.remove("open");
  if (!document.getElementById("cartDrawer").classList.contains("open") &&
      !document.getElementById("checkoutPage").classList.contains("open")) {
    document.body.classList.remove("locked");
  }
}

/* ============================================================
   FORMAT TANGGAL
   ============================================================ */
function formatTanggal(ts){
  const d = new Date(ts);
  const opts = { day:"2-digit", month:"long", year:"numeric", hour:"2-digit", minute:"2-digit" };
  return d.toLocaleDateString("id-ID", opts).replace(".",":");
}

/* ============================================================
   RENDER DAFTAR PESANAN
   ============================================================ */
function renderOrders(){
  const list = document.getElementById("orderList");
  const orders = loadOrders();
  const countText = document.getElementById("orderCountText");
  if (countText) countText.textContent = orders.length + " pesanan";

  if (!orders.length){
    list.innerHTML = `
      <div class="cart-empty">
        <div class="em">📭</div>
        <h4>Belum ada pesanan</h4>
        <p>Pesanan yang sudah kamu checkout akan muncul di sini.</p>
        <button class="btn btn-primary btn-sm" style="margin-top:16px" onclick="closeOrders()">Mulai Belanja</button>
      </div>`;
    return;
  }

  list.innerHTML = orders.map(o => {
    const st = STATUS_MAP[o.statusKey] || STATUS_MAP.pending;
    const waMsg = encodeURIComponent(
      "Halo Avicena Flower's, saya ingin menanyakan pesanan saya:\n\n" +
      "ID Pesanan: " + o.id + "\n" +
      "Nama: " + o.nama + "\n" +
      "Total: " + rupiah(o.total) + "\n" +
      "Status saat ini: " + st.label + "\n\n" +
      "Mohon dibantu ya, terima kasih 🙏"
    );
    const waLink = "https://wa.me/" + STORE.waNumber + "?text=" + waMsg;

    return `
      <div class="order-card">
        <div class="order-top">
          <div>
            <span class="order-id">${o.id}</span>
            <span class="order-date">${formatTanggal(o.timestamp)}</span>
          </div>
          <span class="order-status ${st.cls}">${st.label}</span>
        </div>

        <div class="order-items">
          ${o.items.map(it => `
            <div class="order-item-line">
              <span>${it.qty}× ${it.name}</span>
              <span>${rupiah(it.price * it.qty)}</span>
            </div>`).join("")}
        </div>

        <div class="order-total-row">
          <span>Total</span>
          <b>${rupiah(o.total)}</b>
        </div>

        <div class="order-actions">
          <a class="order-btn wa" href="${waLink}" target="_blank" rel="noopener">
            💬 Chat Penjual
          </a>
          <button class="order-btn" onclick="toggleOrderDetail('${o.id}', this)">
            📄 Detail
          </button>
        </div>

        <div class="order-detail-extra" id="detail-${o.id}" style="display:none;margin-top:12px;padding-top:12px;border-top:1px dashed var(--pink-200);font-size:12.8px;color:var(--muted);line-height:1.7">
          <div><b style="color:var(--green-900)">Pembayaran:</b> ${o.payment}</div>
          <div><b style="color:var(--green-900)">Penerima:</b> ${o.nama}</div>
          <div><b style="color:var(--green-900)">WA:</b> ${o.wa}</div>
          <div><b style="color:var(--green-900)">Alamat:</b> ${o.alamat}</div>
          ${o.catatan ? `<div><b style="color:var(--green-900)">Ucapan:</b> ${o.catatan}</div>` : ""}
          <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">
            ${o.statusKey !== "done" ? `<button class="copy-btn" onclick="markOrderDone('${o.id}')">✓ Tandai Selesai</button>` : ""}
            <button class="copy-btn" style="background:#f8d7da;color:#721c24" onclick="removeOrder('${o.id}')">🗑 Hapus</button>
          </div>
        </div>
      </div>`;
  }).join("");
}

/* ============================================================
   AKSI PESANAN
   ============================================================ */
function toggleOrderDetail(id, btn){
  const el = document.getElementById("detail-" + id);
  if (!el) return;
  const isHidden = el.style.display === "none" || !el.style.display;
  el.style.display = isHidden ? "block" : "none";
  btn.textContent = isHidden ? "📄 Tutup" : "📄 Detail";
}

function markOrderDone(id){
  const orders = loadOrders();
  const idx = orders.findIndex(o => o.id === id);
  if (idx === -1) return;
  orders[idx].statusKey = "done";
  orders[idx].status = STATUS_MAP.done.label;
  saveOrders(orders);
  updateOrderBadge();
  renderOrders();
  showToast("Pesanan ditandai selesai ✓");
}

function removeOrder(id){
  if (!confirm("Hapus pesanan ini dari riwayat?")) return;
  const orders = loadOrders().filter(o => o.id !== id);
  saveOrders(orders);
  updateOrderBadge();
  renderOrders();
  showToast("Pesanan dihapus dari riwayat");
}

/* ============================================================
   CHAT PENJUAL CEPAT
   ============================================================ */
function chatPenjual(){
  const msg = "Halo Avicena Flower's, saya ingin bertanya tentang produk / pesanan saya.";
  window.open("https://wa.me/" + STORE.waNumber + "?text=" + encodeURIComponent(msg), "_blank");
}

/* ============================================================
   SCRIPT.JS — Logika Utama Toko
   Fitur order ada di: orders.js
   ============================================================ */

/* ============================================================
   KONFIGURASI TOKO
   ============================================================ */
const STORE = {
  waNumber: "6287804085801",
  waDisplay: "0878-0408-5801",
  ongkir: 25000,
  qrisMerchant: "Avicena Flower's",
  qrisNMID: "ID1234567890123",
  rekening: {
    BCA: { no: "1234567890", nama: "Avicena Flower's" },
    BNI: { no: "0987654321", nama: "Avicena Flower's" }
  }
};

/* ============================================================
   DATA PRODUK
   ============================================================ */
const products = [
  {
    id: 1, name: "Mawar Merah", category: "Romantis", price: 250000,
    desc: "12 tangkai mawar merah premium dengan wrapping kertas Korea dan pita satin elegan.",
    img: "https://images.unsplash.com/photo-1548586196-aa5803b77379?auto=format&fit=crop&w=700&q=80"
  },
  {
    id: 2, name: "Mawar Pink", category: "Just Because", price: 220000,
    desc: "Mawar pink lembut yang manis, cocok untuk kejutan kecil tanpa alasan khusus.",
    img: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=700&q=80"
  },
  {
    id: 3, name: "Lily Putih", category: "Ucapan Duka", price: 275000,
    desc: "Lily putih bersih sebagai ungkapan turut berduka cita yang tulus dan khidmat.",
    img: "https://images.unsplash.com/photo-1509719662282-c0c2d13e0e5c?auto=format&fit=crop&w=700&q=80"
  },
  {
    id: 4, name: "Sunflower", category: "Wisuda", price: 195000,
    desc: "Bunga matahari ceria, simbol semangat dan pencapaian kelulusan yang membanggakan.",
    img: "https://images.unsplash.com/photo-1596438459194-f275f413d6ff?auto=format&fit=crop&w=700&q=80"
  },
  {
    id: 5, name: "Tulip Pink", category: "Ulang Tahun", price: 320000,
    desc: "Tulip pink import segar, pilihan manis untuk merayakan hari ulang tahun spesial.",
    img: "https://images.unsplash.com/photo-1520763185298-1b434c919102?auto=format&fit=crop&w=700&q=80"
  },
  {
    id: 6, name: "Pastel Garden", category: "Just Because", price: 285000,
    desc: "Perpaduan bunga warna pastel dalam satu buket taman yang lembut dan menenangkan.",
    img: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=700&q=80"
  },
  {
    id: 7, name: "Luxury Romance", category: "Anniversary", price: 550000,
    desc: "Buket mewah mawar premium berpadu lily dan baby breath untuk anniversary spesial.",
    img: "https://images.unsplash.com/photo-1487070183336-b863922373d4?auto=format&fit=crop&w=700&q=80"
  },
  {
    id: 8, name: "Mawar Baby Breath", category: "Anniversary", price: 240000,
    desc: "Mawar pilihan dengan taburan baby breath putih — klasik dan tak lekang waktu.",
    img: "https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=700&q=80"
  },
  {
    id: 9, name: "Sweet Birthday", category: "Ulang Tahun", price: 310000,
    desc: "Kombinasi mawar pink dan krisan dalam box eksklusif untuk ucapan ulang tahun.",
    img: "https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=700&q=80"
  },
  {
    id: 10, name: "Graduation Bloom", category: "Wisuda", price: 265000,
    desc: "Buket bunga warna cerah untuk momen wisuda yang membahagiakan dan berkesan.",
    img: "https://images.unsplash.com/photo-1494972308805-463bc619d34e?auto=format&fit=crop&w=700&q=80"
  }
];

/* ============================================================
   DATA KATEGORI / KESEMPATAN
   ============================================================ */
const categories = [
  { name: "Ulang Tahun", icon: "🎂", desc: "Rayakan pertambahan usia dengan buket penuh warna ceria." },
  { name: "Anniversary", icon: "💍", desc: "Tandai perjalanan cinta dengan rangkaian bunga mewah." },
  { name: "Wisuda", icon: "🎓", desc: "Apresiasi kelulusan dengan buket yang membanggakan." },
  { name: "Romantis", icon: "❤️", desc: "Ungkapkan cinta lewat mawar merah yang menggoda." },
  { name: "Ucapan Duka", icon: "🕊️", desc: "Sampaikan turut berduka dengan rangkaian khidmat." },
  { name: "Just Because", icon: "✨", desc: "Tak perlu alasan untuk membuatnya tersenyum." }
];

const filterList = ["Semua", ...categories.map(c => c.name)];

/* ============================================================
   STATE
   ============================================================ */
const state = {
  cart: {},
  filter: "Semua",
  search: ""
};

/* ============================================================
   UTILITAS
   ============================================================ */
function rupiah(n) {
  return "Rp " + n.toLocaleString("id-ID");
}

function fallbackImg(label) {
  const safe = String(label).replace(/[<>&'"]/g, "");
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="700" height="700">' +
    '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0" stop-color="#fdeef3"/><stop offset="1" stop-color="#f2bccb"/>' +
    '</linearGradient></defs>' +
    '<rect width="700" height="700" fill="url(#g)"/>' +
    '<circle cx="350" cy="300" r="90" fill="#ffffff" opacity="0.55"/>' +
    '<text x="350" y="322" font-size="80" text-anchor="middle">&#127800;</text>' +
    '<text x="350" y="450" font-family="Georgia,serif" font-size="38" fill="#1b3b2c" text-anchor="middle">Avicena</text>' +
    '<text x="350" y="492" font-family="Georgia,serif" font-size="24" fill="#c25f7c" text-anchor="middle">' + safe + '</text>' +
    '</svg>';
  return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
}

function imgTag(src, alt, cls, lazy) {
  const safeAlt = String(alt).replace(/'/g, "");
  return '<img src="' + src + '" alt="' + alt + '" class="' + (cls || "") + '"' +
    (lazy ? ' loading="lazy"' : "") +
    ' onerror="this.onerror=null;this.src=fallbackImg(\'' + safeAlt + '\')">';
}

function showToast(msg) {
  const t = document.getElementById("toast");
  document.getElementById("toastMsg").textContent = msg;
  t.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => t.classList.remove("show"), 2400);
}

/* ============================================================
   RENDER KATEGORI
   ============================================================ */
function renderCategories() {
  const grid = document.getElementById("katGrid");
  grid.innerHTML = categories.map(c => `
    <div class="kat-card" onclick="setFilter('${c.name}')">
      <div class="kat-ic">${c.icon}</div>
      <h3>${c.name}</h3>
      <p>${c.desc}</p>
      <span class="kat-link">Lihat Koleksi →</span>
    </div>
  `).join("");
}

/* ============================================================
   RENDER FILTER CHIPS
   ============================================================ */
function renderFilters() {
  const bar = document.getElementById("filterBar");
  bar.innerHTML = filterList.map(f => `
    <button class="chip ${state.filter === f ? "active" : ""}" onclick="setFilter('${f}')">${f}</button>
  `).join("");
}

function setFilter(cat) {
  state.filter = cat;
  renderFilters();
  renderProducts();
  const el = document.getElementById("produk");
  if (el) window.scrollTo({ top: el.offsetTop - 80, behavior: "smooth" });
}

/* ============================================================
   RENDER PRODUK
   ============================================================ */
function renderProducts() {
  const grid = document.getElementById("prodGrid");
  const q = state.search.toLowerCase().trim();

  const list = products.filter(p => {
    const okCat = state.filter === "Semua" || p.category === state.filter;
    const okSearch = !q ||
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.desc.toLowerCase().includes(q);
    return okCat && okSearch;
  });

  document.getElementById("resultCount").textContent =
    list.length + " produk ditemukan" + (state.filter !== "Semua" ? " · " + state.filter : "");

  if (!list.length) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="em">🌷</div>
        <h3>Produk tidak ditemukan</h3>
        <p>Coba kata kunci lain atau pilih kategori yang berbeda.</p>
      </div>`;
    return;
  }

  grid.innerHTML = list.map((p, i) => `
    <article class="prod-card" style="animation-delay:${Math.min(i * 45, 400)}ms">
      <div class="prod-media">
        ${imgTag(p.img, p.name, "", true)}
        <span class="prod-tag">${p.category}</span>
      </div>
      <div class="prod-body">
        <h3>${p.name}</h3>
        <p>${p.desc}</p>
        <div class="prod-foot">
          <span class="price">${rupiah(p.price)}</span>
          <button class="add-btn" onclick="addToCart(${p.id}, this)" aria-label="Tambah ${p.name} ke keranjang">+</button>
        </div>
      </div>
    </article>
  `).join("");
}

/* ============================================================
   PENCARIAN
   ============================================================ */
function handleSearch(val) {
  state.search = val;
  document.getElementById("searchClear").classList.toggle("show", val.length > 0);
  renderProducts();
}

function clearSearch() {
  state.search = "";
  document.getElementById("searchInput").value = "";
  document.getElementById("searchClear").classList.remove("show");
  renderProducts();
}

/* ============================================================
   KERANJANG
   ============================================================ */
function addToCart(id, btn) {
  state.cart[id] = (state.cart[id] || 0) + 1;
  renderCart();
  const p = products.find(x => x.id === id);
  showToast(p.name + " ditambahkan ke keranjang");
  if (btn) {
    btn.classList.add("added");
    btn.textContent = "✓";
    setTimeout(() => { btn.classList.remove("added"); btn.textContent = "+"; }, 900);
  }
}

function changeQty(id, delta) {
  if (!state.cart[id]) return;
  state.cart[id] += delta;
  if (state.cart[id] <= 0) delete state.cart[id];
  renderCart();
}

function removeItem(id) {
  delete state.cart[id];
  renderCart();
  showToast("Produk dihapus dari keranjang");
}

function cartCount() {
  return Object.values(state.cart).reduce((a, b) => a + b, 0);
}

function cartSubtotal() {
  return Object.entries(state.cart).reduce((sum, [id, qty]) => {
    const p = products.find(x => x.id == id);
    return sum + (p ? p.price * qty : 0);
  }, 0);
}

function renderCart() {
  const wrap = document.getElementById("cartItems");
  const ids = Object.keys(state.cart);
  const count = cartCount();

  document.getElementById("cartBadge").textContent = count;
  document.getElementById("cartBadge").style.display = count ? "grid" : "none";
  document.getElementById("cartCountText").textContent = count + " item";

  if (!ids.length) {
    wrap.innerHTML = `
      <div class="cart-empty">
        <div class="em">🌷</div>
        <h4>Keranjang masih kosong</h4>
        <p>Yuk pilih buket bunga favoritmu terlebih dahulu.</p>
      </div>`;
    document.getElementById("cartFoot").style.display = "none";
  } else {
    document.getElementById("cartFoot").style.display = "block";
    wrap.innerHTML = ids.map(id => {
      const p = products.find(x => x.id == id);
      const qty = state.cart[id];
      return `
        <div class="cart-item">
          ${imgTag(p.img, p.name, "", true)}
          <div class="ci-info">
            <h4>${p.name}</h4>
            <span class="ci-cat">${p.category}</span>
            <div class="ci-price">${rupiah(p.price)}</div>
            <div class="qty">
              <button onclick="changeQty(${p.id},-1)" aria-label="Kurangi">−</button>
              <span>${qty}</span>
              <button onclick="changeQty(${p.id},1)" aria-label="Tambah">+</button>
            </div>
          </div>
          <button class="ci-del" onclick="removeItem(${p.id})" aria-label="Hapus">✕</button>
        </div>`;
    }).join("");
  }

  const subtotal = cartSubtotal();
  const ongkir = subtotal > 0 ? STORE.ongkir : 0;
  const total = subtotal + ongkir;

  document.getElementById("subtotalText").textContent = rupiah(subtotal);
  document.getElementById("shippingText").textContent = rupiah(ongkir);
  document.getElementById("totalText").textContent = rupiah(total);

  renderSummary();
}

/* ============================================================
   DRAWER KERANJANG
   ============================================================ */
function openCart() {
  document.getElementById("cartDrawer").classList.add("open");
  document.getElementById("overlay").classList.add("open");
  document.body.classList.add("locked");
}

function closeCart() {
  document.getElementById("cartDrawer").classList.remove("open");
  document.getElementById("overlay").classList.remove("open");
  if (!document.getElementById("checkoutPage").classList.contains("open") &&
      !document.getElementById("orderDrawer").classList.contains("open")) {
    document.body.classList.remove("locked");
  }
}

/* ============================================================
   CHECKOUT
   ============================================================ */
function renderSummary() {
  const box = document.getElementById("summaryItems");
  const ids = Object.keys(state.cart);

  if (!ids.length) {
    box.innerHTML = `<p style="color:var(--muted);font-size:14px">Keranjang kosong.</p>`;
  } else {
    box.innerHTML = ids.map(id => {
      const p = products.find(x => x.id == id);
      const qty = state.cart[id];
      return `
        <div class="sum-item">
          ${imgTag(p.img, p.name, "", true)}
          <div class="si-n">
            <b>${p.name}</b>
            <span>${qty} × ${rupiah(p.price)}</span>
          </div>
          <div class="si-p">${rupiah(p.price * qty)}</div>
        </div>`;
    }).join("");
  }

  const subtotal = cartSubtotal();
  const ongkir = subtotal > 0 ? STORE.ongkir : 0;
  document.getElementById("sumSubtotal").textContent = rupiah(subtotal);
  document.getElementById("sumShipping").textContent = rupiah(ongkir);
  document.getElementById("sumTotal").textContent = rupiah(subtotal + ongkir);
}

function openCheckout() {
  if (!Object.keys(state.cart).length) {
    showToast("Keranjang masih kosong");
    return;
  }
  closeCart();
  renderSummary();
  document.getElementById("checkoutPage").classList.add("open");
  document.body.classList.add("locked");
  window.scrollTo({ top: 0 });
}

function closeCheckout() {
  document.getElementById("checkoutPage").classList.remove("open");
  document.body.classList.remove("locked");
}

/* Pilihan metode pembayaran */
document.querySelectorAll(".pay-opt").forEach(opt => {
  opt.addEventListener("click", () => {
    document.querySelectorAll(".pay-opt").forEach(o => o.classList.remove("active"));
    opt.classList.add("active");
    opt.querySelector("input").checked = true;

    const pay = opt.dataset.pay;
    document.querySelectorAll(".pay-detail").forEach(d => d.classList.remove("show"));
    const target = document.getElementById("detail-" + pay);
    if (target) target.classList.add("show");
  });
});

/* Salin nomor rekening */
function copyText(text, btn) {
  const done = () => {
    const old = btn.textContent;
    btn.textContent = "Tersalin ✓";
    setTimeout(() => btn.textContent = old, 1500);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(() => {
      legacyCopy(text); done();
    });
  } else {
    legacyCopy(text); done();
  }
}

function legacyCopy(text) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand("copy"); } catch (e) {}
  document.body.removeChild(ta);
}

/* ============================================================
   KIRIM PESANAN KE WHATSAPP
   (Menggunakan addOrder() & STATUS_MAP dari orders.js)
   ============================================================ */
function kirimPesanan(e) {
  e.preventDefault();

  const ids = Object.keys(state.cart);
  if (!ids.length) {
    showToast("Keranjang masih kosong");
    return;
  }

  const nama = document.getElementById("nama").value.trim();
  const wa = document.getElementById("wa").value.trim();
  const alamat = document.getElementById("alamat").value.trim();
  const catatan = document.getElementById("catatan").value.trim();
  const payment = document.querySelector('input[name="payment"]:checked').value;

  if (!nama || !wa || !alamat) {
    showToast("Mohon lengkapi data pengiriman");
    return;
  }

  const subtotal = cartSubtotal();
  const ongkir = STORE.ongkir;
  const total = subtotal + ongkir;

  /* --- Susun data item --- */
  const itemsArr = ids.map(id => {
    const p = products.find(x => x.id == id);
    return {
      id: p.id,
      name: p.name,
      category: p.category,
      price: p.price,
      qty: state.cart[id]
    };
  });

  /* --- Buat ID & simpan pesanan (fungsi dari orders.js) --- */
  const orderId = generateOrderId();
  const orderObj = {
    id: orderId,
    timestamp: Date.now(),
    items: itemsArr,
    subtotal: subtotal,
    ongkir: ongkir,
    total: total,
    payment: payment,
    nama: nama,
    wa: wa,
    alamat: alamat,
    catatan: catatan,
    status: STATUS_MAP.pending.label,
    statusKey: "pending"
  };
  addOrder(orderObj);

  /* --- Susun pesan WhatsApp --- */
  let msg = "*🌸 PESANAN BARU — AVICENA FLOWER'S 🌸*\n\n";
  msg += "*ID Pesanan:* `" + orderId + "`\n\n";
  msg += "*— DATA PEMESAN —*\n";
  msg += "Nama: " + nama + "\n";
  msg += "No. WhatsApp: " + wa + "\n";
  msg += "Alamat: " + alamat + "\n";
  if (catatan) msg += "Ucapan Kartu: " + catatan + "\n";

  msg += "\n*— DETAIL PESANAN —*\n";
  itemsArr.forEach((it, i) => {
    msg += (i + 1) + ". " + it.name + " (" + it.category + ")\n";
    msg += "    " + it.qty + " × " + rupiah(it.price) + " = " + rupiah(it.price * it.qty) + "\n";
  });

  msg += "\nSubtotal: " + rupiah(subtotal) + "\n";
  msg += "Ongkos Kirim: " + rupiah(ongkir) + "\n";
  msg += "*TOTAL: " + rupiah(total) + "*\n";

  msg += "\n*— PEMBAYARAN —*\n";
  msg += "Metode: " + payment + "\n";
  if (payment === "QRIS") {
    msg += "Merchant: " + STORE.qrisMerchant + "\n";
    msg += "NMID: " + STORE.qrisNMID + "\n";
  } else if (payment === "Transfer BCA") {
    msg += "BCA: " + STORE.rekening.BCA.no + " a/n " + STORE.rekening.BCA.nama + "\n";
  } else if (payment === "Transfer BNI") {
    msg += "BNI: " + STORE.rekening.BNI.no + " a/n " + STORE.rekening.BNI.nama + "\n";
  }

  msg += "\nMohon konfirmasi pesanan saya. Terima kasih 🙏";

  const url = "https://wa.me/" + STORE.waNumber + "?text=" + encodeURIComponent(msg);
  window.open(url, "_blank");

  /* --- Kosongkan keranjang & tutup checkout --- */
  state.cart = {};
  renderCart();
  closeCheckout();
  showToast("Pesanan tersimpan! Cek menu 📋 Status Pesanan");

  /* Buka drawer pesanan (fungsi dari orders.js) */
  setTimeout(() => {
    openOrders();
    document.getElementById("checkoutForm").reset();
  }, 600);
}

/* ============================================================
   NAVBAR & MOBILE MENU
   ============================================================ */
function toggleMobileMenu() {
  document.getElementById("mobileMenu").classList.toggle("open");
}
function closeMobileMenu() {
  document.getElementById("mobileMenu").classList.remove("open");
}

window.addEventListener("scroll", () => {
  document.getElementById("navbar").classList.toggle("scrolled", window.scrollY > 12);
});

document.addEventListener("click", (e) => {
  const menu = document.getElementById("mobileMenu");
  const burger = document.querySelector(".burger");
  if (menu.classList.contains("open") && !menu.contains(e.target) && !burger.contains(e.target)) {
    menu.classList.remove("open");
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeCart();
    closeCheckout();
    closeOrders();       // dari orders.js
    closeMobileMenu();
  }
});

/* ============================================================
   INISIALISASI
   ============================================================ */
renderCategories();
renderFilters();
renderProducts();
renderCart();
updateOrderBadge();      // dari orders.js

/* Terapkan nomor rekening & QRIS dari konfigurasi */
document.getElementById("bcaNo").textContent = STORE.rekening.BCA.no;
document.getElementById("bniNo").textContent = STORE.rekening.BNI.no;
