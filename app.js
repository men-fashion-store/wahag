import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy, addDoc, doc, setDoc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = { apiKey: "AIzaSyAnz5eg_i_nvrQr128ms_PlYldEFdIrIUY", authDomain: "wahaj-21a9d.firebaseapp.com", projectId: "wahaj-21a9d", storageBucket: "wahaj-21a9d.firebasestorage.app", messagingSenderId: "820263571886", appId: "1:820263571886:web:2af268a7acbdba7b75f83f", measurementId: "G-CXZZ0N8598" };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

window.cart = JSON.parse(localStorage.getItem('wahaj_cart')) || [];
window.products = [];
window.banners = [];
window.currentUser = null;
window.currentProduct = null;

// --- المصادقة والمستخدمين ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const docSnap = await getDoc(doc(db, "users", user.uid));
        if (docSnap.exists()) {
            window.currentUser = docSnap.data();
            document.getElementById('header-user-name').innerText = window.currentUser.name.split(' ')[0];
            document.getElementById('profile-view-name').innerText = window.currentUser.name;
            document.getElementById('profile-view-phone').innerText = window.currentUser.phone;
            document.getElementById('profile-view-gov').innerText = window.currentUser.gov || 'غير محدد';
            
            // إخفاء تسجيل الدخول
            document.getElementById('auth-section').classList.add('hidden');
            document.getElementById('profile-details-section').classList.remove('hidden');
            
            loadUserOrders(); // تحميل طلبات العميل
            updateWishlistUI();
        }
    } else {
        window.currentUser = null;
        document.getElementById('header-user-name').innerText = 'دخول';
        document.getElementById('auth-section').classList.remove('hidden');
        document.getElementById('profile-details-section').classList.add('hidden');
    }
});

window.handleSignup = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-signup');
    const name = document.getElementById('signup-name').value;
    const phone = document.getElementById('signup-phone').value;
    const gov = document.getElementById('signup-gov').value;
    const pass = document.getElementById('signup-pass').value;
    const fakeEmail = `${phone}@wahaj.com`;

    btn.disabled = true; btn.innerText = 'جاري الإنشاء...';
    try {
        const cred = await createUserWithEmailAndPassword(auth, fakeEmail, pass);
        await setDoc(doc(db, "users", cred.user.uid), { name, phone, gov, uid: cred.user.uid, wishlist: [], timestamp: Date.now() });
        window.toast('تم إنشاء الحساب بنجاح ✨');
    } catch(err) { window.toast('الرقم مسجل مسبقاً أو كلمة المرور ضعيفة', 'error'); }
    btn.disabled = false; btn.innerText = 'إنشاء الحساب';
};

window.handleLogin = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-login');
    const phone = document.getElementById('login-phone').value;
    const pass = document.getElementById('login-pass').value;
    const fakeEmail = `${phone}@wahaj.com`;

    btn.disabled = true; btn.innerText = 'جاري الدخول...';
    try {
        await signInWithEmailAndPassword(auth, fakeEmail, pass);
        window.toast('أهلاً بك مجدداً ✨');
    } catch(err) { window.toast('بيانات الدخول غير صحيحة', 'error'); }
    btn.disabled = false; btn.innerText = 'دخول';
};

window.handleLogout = () => { signOut(auth); window.toast('تم تسجيل الخروج'); switchNav('home'); };

// --- جلب البيانات (شموع وعروض) ---
async function fetchData() {
    // جلب المنتجات
    const qP = query(collection(db, "products"), orderBy("timestamp", "desc"));
    const snapP = await getDocs(qP);
    window.products = snapP.docs.map(d => ({id: d.id, ...d.data()}));
    
    // جلب العروض (السليدر)
    const qB = query(collection(db, "banners"), orderBy("timestamp", "desc"));
    const snapB = await getDocs(qB);
    window.banners = snapB.docs.map(d => d.data().image);

    renderHome();
}

function renderHome() {
    // 1. السليدر (صور متحركة)
    const slider = document.getElementById('home-slider');
    if(window.banners.length > 0) {
        slider.innerHTML = window.banners.map(img => `<img src="${img}" class="min-w-full h-full object-cover snap-center rounded-2xl">`).join('');
    } else {
        slider.parentElement.classList.add('hidden');
    }

    // 2. تقسيم المنتجات
    const bestSellers = window.products.filter(p => p.isBestSeller);
    const offers = window.products.filter(p => p.oldPrice > p.price);
    
    renderProductGrid('grid-new', window.products.slice(0, 6)); // أحدث 6
    if(offers.length) renderProductGrid('grid-offers', offers); else document.getElementById('sec-offers').classList.add('hidden');
    if(bestSellers.length) renderProductGrid('grid-best', bestSellers); else document.getElementById('sec-best').classList.add('hidden');
}

function renderProductGrid(containerId, items) {
    const container = document.getElementById(containerId);
    if(!container) return;
    container.innerHTML = items.map(p => {
        const hasSale = p.oldPrice > p.price;
        const isWished = window.currentUser?.wishlist?.includes(p.id);
        return `
        <div class="min-w-[160px] md:min-w-[200px] bg-white rounded-2xl shadow-sm border border-[#FAF8F5] overflow-hidden relative group shrink-0">
            ${hasSale ? `<span class="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full z-10">خصم</span>` : ''}
            <button onclick="toggleWishlist('${p.id}', event)" class="absolute top-2 left-2 z-10 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center shadow-sm">
                <svg class="w-5 h-5 transition ${isWished ? 'fill-red-500 stroke-red-500' : 'fill-none stroke-gray-400'}" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
            </button>
            <div class="h-40 bg-gray-50 overflow-hidden cursor-pointer" onclick="openProductDetails('${p.id}')">
                <img src="${p.images[0]}" class="w-full h-full object-cover group-hover:scale-110 transition duration-500">
            </div>
            <div class="p-3">
                <h3 class="font-bold text-sm text-gray-800 truncate mb-1">${p.name}</h3>
                <div class="flex justify-between items-center">
                    <span class="font-black text-[#8B7355] text-sm">${p.price} ج.م</span>
                    <button onclick="addToCart('${p.id}')" class="w-8 h-8 bg-[#FAF8F5] rounded-full flex items-center justify-center text-[#8B7355] hover:bg-[#8B7355] hover:text-white transition">🛒</button>
                </div>
            </div>
        </div>`;
    }).join('');
}

// --- تفاصيل المنتج ---
window.openProductDetails = (id) => {
    const p = window.products.find(x => x.id === id);
    window.currentProduct = p;
    document.getElementById('pd-image').src = p.images[0];
    document.getElementById('pd-name').innerText = p.name;
    document.getElementById('pd-price').innerText = p.price + ' ج.م';
    document.getElementById('pd-desc').innerText = p.desc || 'شمعة يدوية الصنع تضفي لمسة من الفخامة والدفء.';
    
    document.getElementById('view-home').classList.add('hidden');
    document.getElementById('view-product-details').classList.remove('hidden');
    window.scrollTo(0,0);
};

// --- السلة والمقدم (Deposit) ---
window.addToCart = (id) => {
    const p = window.products.find(x => x.id === id);
    const exists = window.cart.find(i => i.id === id);
    if(exists) exists.qty++; else window.cart.push({ id: p.id, name: p.name, price: Number(p.price), image: p.images[0], qty: 1 });
    saveCart(); updateBadge(); window.toast('تمت الإضافة للسلة 🛒');
};

window.renderCartDrawer = () => {
    const container = document.getElementById('cart-items');
    let total = 0;
    if(!window.cart.length) { 
        container.innerHTML = '<p class="text-center text-gray-400 py-20 font-bold">السلة فارغة</p>'; 
        document.getElementById('checkout-area').classList.add('hidden');
        return; 
    }
    
    document.getElementById('checkout-area').classList.remove('hidden');
    container.innerHTML = window.cart.map((i, idx) => {
        total += i.price * i.qty;
        return `
        <div class="flex gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm relative">
            <img src="${i.image}" class="w-20 h-20 rounded-lg object-cover bg-gray-50">
            <div class="flex-1">
                <h4 class="font-bold text-sm pr-4">${i.name}</h4>
                <p class="font-black text-[#8B7355]">${i.price * i.qty} ج.م</p>
                <div class="flex gap-3 bg-[#FAF8F5] w-fit rounded-lg mt-2 p-1"><button onclick="updateQty(${idx}, -1)" class="w-6 font-bold text-[#8B7355]">-</button><span class="text-sm font-bold w-4 text-center">${i.qty}</span><button onclick="updateQty(${idx}, 1)" class="w-6 font-bold text-[#8B7355]">+</button></div>
            </div>
            <button onclick="removeItem(${idx})" class="absolute top-2 left-2 text-gray-300 hover:text-red-500">✕</button>
        </div>`;
    }).join('');

    // حساب الـ 25% مقدم
    const deposit = Math.round(total * 0.25);
    const remainder = total - deposit;
    
    document.getElementById('cart-total-text').innerText = `${total} ج.م`;
    document.getElementById('cart-deposit-text').innerText = `${deposit} ج.م`;
    document.getElementById('cart-remainder-text').innerText = `${remainder} ج.م`;
};

window.handleCheckout = async () => {
    if(!window.currentUser) { window.toast('يجب تسجيل الدخول أولاً', 'error'); window.toggleCart(); switchNav('profile'); return; }
    if(!window.cart.length) return;

    const addressDetails = prompt("برجاء إدخال العنوان بالتفصيل (الشارع، رقم العمارة، الشقة):");
    if(!addressDetails) return;

    const btn = document.getElementById('checkout-btn');
    btn.disabled = true; btn.innerText = 'جاري الإرسال...';
    
    const total = window.cart.reduce((s,i) => s + (i.price * i.qty), 0);
    const deposit = Math.round(total * 0.25);
    
    try {
        await addDoc(collection(db, "orders"), {
            items: window.cart, total, deposit, remainder: total - deposit,
            customer: { uid: window.currentUser.uid, name: window.currentUser.name, phone: window.currentUser.phone, gov: window.currentUser.gov, address: addressDetails },
            timestamp: Date.now(), status: 'pending'
        });

        let msg = `✨ *طلب جديد من متجر وَهَج* ✨\n\n👤 *الاسم:* ${window.currentUser.name}\n📞 *الموبايل:* ${window.currentUser.phone}\n📍 *العنوان:* ${window.currentUser.gov} - ${addressDetails}\n\n🛍️ *المنتجات:*\n`;
        window.cart.forEach(i => { msg += `- ${i.name} (x${i.qty})\n`; });
        msg += `\n💰 *الإجمالي:* ${total} ج.م\n💳 *المقدم المطلوب فودافون كاش (25%):* ${deposit} ج.م\n💵 *الباقي عند الاستلام:* ${total - deposit} ج.م`;

        window.cart = []; saveCart(); updateBadge(); window.toggleCart();
        window.toast('تم الطلب! جاري تحويلك للواتساب لدفع المقدم', 'success');
        setTimeout(() => { window.open(`https://wa.me/201020468021?text=${encodeURIComponent(msg)}`, '_blank'); btn.disabled = false; btn.innerText = 'تأكيد ودفع المقدم'; switchNav('orders'); }, 2000);
    } catch(e) { window.toast('حدث خطأ', 'error'); btn.disabled = false; }
};

// --- أدوات مساعدة وتحديثات واجهة ---
window.updateQty = (idx, val) => { window.cart[idx].qty += val; if(window.cart[idx].qty <= 0) window.cart.splice(idx,1); saveCart(); updateBadge(); renderCartDrawer(); };
window.removeItem = (idx) => { window.cart.splice(idx,1); saveCart(); updateBadge(); renderCartDrawer(); };
window.saveCart = () => localStorage.setItem('wahaj_cart', JSON.stringify(window.cart));
window.updateBadge = () => { const c = window.cart.reduce((s, i) => s + i.qty, 0); const b = document.getElementById('cart-badge'); b.innerText = c; c > 0 ? b.classList.remove('hidden') : b.classList.add('hidden'); };
window.toggleCart = () => { const d = document.getElementById('cart-drawer'), o = document.getElementById('cart-overlay'); if(d.classList.contains('cart-closed')) { renderCartDrawer(); d.classList.replace('cart-closed', 'cart-open'); o.classList.remove('hidden'); setTimeout(()=>o.classList.add('opacity-100'),10); } else { d.classList.replace('cart-open', 'cart-closed'); o.classList.remove('opacity-100'); setTimeout(()=>o.classList.add('hidden'),300); } };
window.toast = (msg, type = 'success') => { const c = document.getElementById('toast-container'), el = document.createElement('div'); el.className = `${type === 'error' ? 'bg-red-500' : 'bg-[#D4AF37] text-gray-900'} px-6 py-3 rounded-xl shadow-xl font-bold flex items-center gap-2 toast-animate border border-white/20`; el.innerHTML = `<span>${type === 'error' ? '⚠️' : '✨'}</span> ${msg}`; c.appendChild(el); setTimeout(() => { el.style.opacity = '0'; setTimeout(()=> el.remove(), 300); }, 3000); };

// --- Navigation السفلي ---
window.switchNav = (viewId) => {
    ['home', 'wishlist', 'orders', 'profile', 'product-details'].forEach(v => {
        document.getElementById('view-'+v).classList.add('hidden');
    });
    document.getElementById('view-'+viewId).classList.remove('hidden');
    
    // تلوين الأيقونات
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('text-[#8B7355]'));
    if(document.getElementById('nav-'+viewId)) document.getElementById('nav-'+viewId).classList.add('text-[#8B7355]');
    window.scrollTo(0,0);

    if(viewId === 'wishlist') renderWishlistPage();
};

// --- المفضلة والطلبات ---
window.toggleWishlist = async (id, event) => {
    if(event) event.stopPropagation();
    if(!window.currentUser) return window.toast('سجل دخول لحفظ المفضلة', 'error');
    
    let w = window.currentUser.wishlist || [];
    if(w.includes(id)) w = w.filter(x => x !== id); else w.push(id);
    
    window.currentUser.wishlist = w;
    await updateDoc(doc(db, "users", window.currentUser.uid), { wishlist: w });
    renderHome(); // تحديث القلوب في الرئيسية
    if(!document.getElementById('view-wishlist').classList.contains('hidden')) renderWishlistPage();
};

function renderWishlistPage() {
    const w = window.currentUser?.wishlist || [];
    const items = window.products.filter(p => w.includes(p.id));
    renderProductGrid('wishlist-grid', items);
}

async function loadUserOrders() {
    if(!window.currentUser) return;
    const q = query(collection(db, "orders"), orderBy("timestamp", "desc"));
    const snap = await getDocs(q); // في الواقع بنفلتر بالـ uid، بس هنصفيها هنا لتبسيط الـ rules
    const myOrders = snap.docs.map(d=>({id:d.id, ...d.data()})).filter(o => o.customer?.uid === window.currentUser.uid);
    
    const container = document.getElementById('user-orders-list');
    if(!myOrders.length) { container.innerHTML = '<p class="text-center text-gray-400 font-bold py-10">لم تقم بأي طلبات بعد</p>'; return; }
    
    const statusLang = { 'pending': '⏳ قيد المراجعة', 'confirmed': '✅ تم التأكيد', 'delivered': '📦 تم التسليم' };
    container.innerHTML = myOrders.map(o => `
        <div class="bg-white p-4 rounded-xl border border-[#FAF8F5] shadow-sm mb-3">
            <div class="flex justify-between border-b pb-2 mb-2"><span class="font-bold">#${o.id.slice(0,6)}</span><span class="text-xs font-bold text-[#8B7355] bg-[#FAF8F5] px-2 py-1 rounded">${statusLang[o.status]||'معلق'}</span></div>
            <div class="text-sm text-gray-600">${o.items.map(i=>`<p>- ${i.name} (x${i.qty})</p>`).join('')}</div>
            <div class="flex justify-between items-center mt-3 pt-2 border-t"><span class="text-xs text-gray-400">${new Date(o.timestamp).toLocaleDateString('ar-EG')}</span><span class="font-black text-[#8B7355]">${o.total} ج.م</span></div>
        </div>
    `).join('');
}

fetchData(); updateBadge();
