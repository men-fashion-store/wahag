import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy, addDoc, doc, setDoc, getDoc, updateDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
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
window.currentFilter = 'all';

onSnapshot(doc(db, "settings", "theme"), (docSnap) => {
    if(docSnap.exists() && docSnap.data().heroImage) {
        const heroImg = document.getElementById('main-hero-img');
        if(heroImg) heroImg.src = docSnap.data().heroImage;
    }
});

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const docSnap = await getDoc(doc(db, "users", user.uid));
        if (docSnap.exists()) {
            window.currentUser = docSnap.data();
            document.getElementById('profile-view-name').innerText = window.currentUser.name;
            document.getElementById('profile-view-phone').innerText = window.currentUser.phone;
            document.getElementById('profile-view-address').innerText = window.currentUser.address || 'غير مسجل';
            
            document.getElementById('auth-section').classList.add('hidden');
            document.getElementById('profile-details-section').classList.remove('hidden');
            
            loadUserOrders();
            if(!document.getElementById('view-wishlist').classList.contains('hidden')) renderWishlistPage();
        }
    } else {
        window.currentUser = null;
        document.getElementById('auth-section').classList.remove('hidden');
        document.getElementById('profile-details-section').classList.add('hidden');
    }
});

window.handleSignup = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-signup');
    const name = document.getElementById('signup-name').value;
    const phone = document.getElementById('signup-phone').value;
    const address = document.getElementById('signup-address').value;
    const altPhone = document.getElementById('signup-alt-phone').value;
    const whatsapp = document.getElementById('signup-whatsapp').value;
    const pass = document.getElementById('signup-pass').value;
    const fakeEmail = `${phone}@wahaj.com`;

    btn.disabled = true; btn.innerText = 'جاري الإنشاء...';
    try {
        const cred = await createUserWithEmailAndPassword(auth, fakeEmail, pass);
        await setDoc(doc(db, "users", cred.user.uid), { 
            name, phone, address, altPhone, whatsapp, uid: cred.user.uid, wishlist: [], timestamp: Date.now() 
        });
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
        window.switchNav('home');
    } catch(err) { window.toast('بيانات الدخول غير صحيحة', 'error'); }
    btn.disabled = false; btn.innerText = 'دخول';
};

window.handleLogout = () => { signOut(auth); window.toast('تم تسجيل الخروج'); window.switchNav('home'); };

async function fetchData() {
    const qP = query(collection(db, "products"), orderBy("timestamp", "desc"));
    const snapP = await getDocs(qP);
    window.products = snapP.docs.map(d => ({id: d.id, ...d.data()}));
    
    const qB = query(collection(db, "banners"), orderBy("timestamp", "desc"));
    const snapB = await getDocs(qB);
    window.banners = snapB.docs.map(d => d.data().image);

    renderHome();
}

function renderHome() {
    const slider = document.getElementById('home-slider');
    if(window.banners && window.banners.length > 0) {
        slider.innerHTML = window.banners.map(img => `<img src="${img}" class="min-w-full h-full object-cover snap-center rounded-2xl border border-gray-100">`).join('');
        slider.parentElement.classList.remove('hidden');
    } else {
        if(slider) slider.parentElement.classList.add('hidden');
    }
    window.filterProducts(window.currentFilter);
}

// --- نظام الفلترة والتصنيفات ---
window.filterProducts = (type) => {
    window.currentFilter = type;
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('bg-brand', 'text-white', 'border-brand', 'shadow-md');
        btn.classList.add('bg-white', 'text-gray-500', 'border-gray-200');
    });
    
    const activeBtn = document.getElementById('filter-' + type);
    if(activeBtn) {
        activeBtn.classList.remove('bg-white', 'text-gray-500', 'border-gray-200');
        activeBtn.classList.add('bg-brand', 'text-white', 'border-brand', 'shadow-md');
    }

    let filtered = window.products;
    
    // منطق الفلترة الذكي
    if(type === 'best') filtered = window.products.filter(p => p.isBestSeller);
    if(type === 'offers') filtered = window.products.filter(p => p.oldPrice > p.price);
    if(type === 'mega_sale') {
        filtered = window.products.filter(p => p.oldPrice && ((p.oldPrice - p.price) / p.oldPrice) >= 0.20); 
        // 20% خصم أو أكثر يعرض في أقوى الخصومات، لو مفيش يعرض العروض العادية
        if(filtered.length === 0) filtered = window.products.filter(p => p.oldPrice > p.price);
    }
    if(type === 'occasions') filtered = window.products.filter(p => p.category === 'occasions');
    if(type === 'others') filtered = window.products.filter(p => p.category === 'others');
    if(type === 'all') filtered = window.products; // لو عايز يخفي الأقسام ويرجع الكل
    
    renderProductGrid('main-products-grid', filtered);
};

function renderProductGrid(containerId, items) {
    const container = document.getElementById(containerId);
    if(!container) return;
    
    if(items.length === 0) {
        container.className = "flex justify-center items-center px-4 w-full";
        container.innerHTML = '<div class="py-10 text-center"><p class="text-gray-400 font-bold text-sm">لا توجد منتجات في هذا القسم حالياً</p></div>';
        return;
    } else {
        container.className = "grid grid-cols-2 gap-4 px-4 pb-8";
    }
    
    container.innerHTML = items.map(p => {
        const hasSale = p.oldPrice > p.price;
        const isWished = window.currentUser?.wishlist?.includes(p.id);
        
        return `
        <div class="bg-white rounded-2xl shadow-sm border border-[#FAF8F5] overflow-hidden relative group flex flex-col h-full">
            ${hasSale ? `<span class="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full z-10 shadow-sm">خصم</span>` : ''}
            
            <button onclick="window.toggleWishlist('${p.id}', event)" class="absolute top-2 left-2 z-10 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm">
                <svg class="w-5 h-5 transition ${isWished ? 'fill-red-500 stroke-red-500' : 'fill-none stroke-gray-400'}" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
            </button>
            
            <div class="h-40 bg-gray-50 overflow-hidden cursor-pointer flex-shrink-0" onclick="window.openProductDetails('${p.id}')">
                <img src="${p.images[0]}" class="w-full h-full object-cover group-hover:scale-110 transition duration-500">
            </div>
            
            <div class="p-3 flex-1 flex flex-col justify-between">
                <h3 class="font-bold text-sm text-gray-800 truncate mb-2">${p.name}</h3>
                <div class="flex justify-between items-center mt-auto">
                    <span class="font-black text-[#8B7355] text-sm">${p.price} ج.م</span>
                    <button onclick="window.addToCart('${p.id}', event)" class="w-8 h-8 bg-[#FAF8F5] rounded-full flex items-center justify-center text-[#8B7355] hover:bg-[#8B7355] hover:text-white transition shadow-sm">🛒</button>
                </div>
            </div>
        </div>`;
    }).join('');
}

window.openProductDetails = (id) => {
    const p = window.products.find(x => x.id === id);
    window.currentProduct = p;
    
    document.getElementById('pd-main-image').src = p.images[0];
    
    const thumbsContainer = document.getElementById('pd-thumbnails');
    if(p.images.length > 1) {
        thumbsContainer.innerHTML = p.images.map(img => 
            `<img src="${img}" onclick="document.getElementById('pd-main-image').src='${img}'" class="w-16 h-16 object-cover rounded-xl border-2 border-transparent hover:border-[#8B7355] cursor-pointer shadow-sm snap-center shrink-0 transition">`
        ).join('');
        thumbsContainer.classList.remove('hidden');
    } else {
        thumbsContainer.classList.add('hidden');
    }

    document.getElementById('pd-name').innerText = p.name;
    const hasSale = p.oldPrice > p.price;
    document.getElementById('pd-price').innerHTML = `${p.price} ج.م ${hasSale ? `<span class="text-sm line-through text-red-400 ml-2">${p.oldPrice} ج.م</span>` : ''}`;
    document.getElementById('pd-desc').innerText = p.desc || 'شمعة يدوية الصنع تضفي لمسة من الفخامة والدفء.';
    
    document.getElementById('view-home').classList.add('hidden');
    document.getElementById('view-product-details').classList.remove('hidden');
    window.scrollTo(0,0);
};

window.addToCart = (id, event) => {
    if(event) event.stopPropagation();
    const p = window.products.find(x => x.id === id);
    const exists = window.cart.find(i => i.id === id);
    if(exists) exists.qty++; else window.cart.push({ id: p.id, name: p.name, price: Number(p.price), image: p.images[0], qty: 1 });
    window.saveCart(); window.updateBadge(); window.toast('تمت الإضافة للسلة 🛒');
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
                <div class="flex gap-3 bg-[#FAF8F5] w-fit rounded-lg mt-2 p-1"><button onclick="window.updateQty(${idx}, -1)" class="w-6 font-bold text-[#8B7355]">-</button><span class="text-sm font-bold w-4 text-center">${i.qty}</span><button onclick="window.updateQty(${idx}, 1)" class="w-6 font-bold text-[#8B7355]">+</button></div>
            </div>
            <button onclick="window.removeItem(${idx})" class="absolute top-2 left-2 text-gray-300 hover:text-red-500 p-1">✕</button>
        </div>`;
    }).join('');

    const deposit = Math.round(total * 0.25);
    const remainder = total - deposit;
    
    document.getElementById('cart-total-text').innerText = `${total} ج.م`;
    document.getElementById('cart-deposit-text').innerText = `${deposit} ج.م`;
    document.getElementById('cart-remainder-text').innerText = `${remainder} ج.م`;
};

window.handleCheckout = async () => {
    if(!window.currentUser) { window.toast('يجب تسجيل الدخول أولاً', 'error'); window.toggleCart(); window.switchNav('profile'); return; }
    if(!window.cart.length) return;

    const btn = document.getElementById('checkout-btn');
    btn.disabled = true; btn.innerText = 'جاري الإرسال...';
    
    const total = window.cart.reduce((s,i) => s + (i.price * i.qty), 0);
    const deposit = Math.round(total * 0.25);
    
    try {
        await addDoc(collection(db, "orders"), {
            items: window.cart, total, deposit, remainder: total - deposit,
            customer: { uid: window.currentUser.uid, name: window.currentUser.name, phone: window.currentUser.phone, address: window.currentUser.address },
            timestamp: Date.now(), status: 'pending'
        });

        let msg = `✨ *طلب جديد من متجر وَهَج* ✨\n\n👤 *الاسم:* ${window.currentUser.name}\n📞 *الموبايل:* ${window.currentUser.phone}\n📍 *العنوان:* ${window.currentUser.address}\n\n🛍️ *المنتجات:*\n`;
        window.cart.forEach(i => { msg += `- ${i.name} (x${i.qty})\n`; });
        msg += `\n💰 *الإجمالي:* ${total} ج.م\n💳 *المقدم المطلوب فودافون كاش (25%):* ${deposit} ج.م\n💵 *الباقي عند الاستلام:* ${total - deposit} ج.م`;

        window.cart = []; window.saveCart(); window.updateBadge(); window.toggleCart();
        window.toast('تم الطلب! جاري تحويلك للواتساب لدفع المقدم', 'success');
        setTimeout(() => { window.open(`https://wa.me/201020468021?text=${encodeURIComponent(msg)}`, '_blank'); btn.disabled = false; btn.innerText = 'تأكيد ودفع المقدم ➔'; window.switchNav('orders'); }, 2000);
    } catch(e) { window.toast('حدث خطأ', 'error'); btn.disabled = false; }
};

window.updateQty = (idx, val) => { window.cart[idx].qty += val; if(window.cart[idx].qty <= 0) window.cart.splice(idx,1); window.saveCart(); window.updateBadge(); window.renderCartDrawer(); };
window.removeItem = (idx) => { window.cart.splice(idx,1); window.saveCart(); window.updateBadge(); window.renderCartDrawer(); };
window.saveCart = () => localStorage.setItem('wahaj_cart', JSON.stringify(window.cart));
window.updateBadge = () => { const c = window.cart.reduce((s, i) => s + i.qty, 0); const b = document.getElementById('cart-badge'); b.innerText = c; c > 0 ? b.classList.remove('hidden') : b.classList.add('hidden'); };
window.toggleCart = () => { const d = document.getElementById('cart-drawer'), o = document.getElementById('cart-overlay'); if(d.classList.contains('cart-closed')) { window.renderCartDrawer(); d.classList.replace('cart-closed', 'cart-open'); o.classList.remove('hidden'); setTimeout(()=>o.classList.add('opacity-100'),10); } else { d.classList.replace('cart-open', 'cart-closed'); o.classList.remove('opacity-100'); setTimeout(()=>o.classList.add('hidden'),300); } };
window.toast = (msg, type = 'success') => { const c = document.getElementById('toast-container'), el = document.createElement('div'); el.className = `${type === 'error' ? 'bg-red-500' : 'bg-[#D4AF37] text-gray-900'} px-6 py-3 rounded-xl shadow-xl font-bold flex items-center gap-2 toast-animate border border-white/20`; el.innerHTML = `<span>${type === 'error' ? '⚠️' : '✨'}</span> ${msg}`; c.appendChild(el); setTimeout(() => { el.style.opacity = '0'; setTimeout(()=> el.remove(), 300); }, 3000); };

window.switchNav = (viewId) => {
    ['home', 'wishlist', 'orders', 'profile', 'product-details'].forEach(v => {
        document.getElementById('view-'+v).classList.add('hidden');
    });
    document.getElementById('view-'+viewId).classList.remove('hidden');
    
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('text-[#8B7355]'));
    if(document.getElementById('nav-'+viewId)) document.getElementById('nav-'+viewId).classList.add('text-[#8B7355]');
    
    window.scrollTo(0,0);
    if(viewId === 'home') renderHome(); 
    if(viewId === 'wishlist') renderWishlistPage();
};

window.switchAuthTab = (tab) => {
    document.getElementById('form-login').classList.toggle('hidden', tab !== 'login');
    document.getElementById('form-signup').classList.toggle('hidden', tab !== 'signup');
    document.getElementById('tab-login').className = tab === 'login' ? 'flex-1 py-3 font-black text-[#8B7355] border-b-2 border-[#8B7355] transition' : 'flex-1 py-3 font-bold text-gray-400 border-b-2 border-transparent transition';
    document.getElementById('tab-signup').className = tab === 'signup' ? 'flex-1 py-3 font-black text-[#8B7355] border-b-2 border-[#8B7355] transition' : 'flex-1 py-3 font-bold text-gray-400 border-b-2 border-transparent transition';
};

window.toggleWishlist = async (id, event) => {
    if(event) event.stopPropagation();
    if(!window.currentUser) return window.toast('سجل دخول لحفظ المفضلة', 'error');
    
    let w = window.currentUser.wishlist || [];
    if(w.includes(id)) w = w.filter(x => x !== id); else w.push(id);
    
    window.currentUser.wishlist = w;
    await updateDoc(doc(db, "users", window.currentUser.uid), { wishlist: w });
    
    renderHome(); 
    if(!document.getElementById('view-wishlist').classList.contains('hidden')) renderWishlistPage();
};

function renderWishlistPage() {
    const w = window.currentUser?.wishlist || [];
    const items = window.products.filter(p => w.includes(p.id));
    renderProductGrid('wishlist-grid', items);
}

function updateWishlistUI() {
    renderHome();
    if(!document.getElementById('view-wishlist').classList.contains('hidden')) renderWishlistPage();
}

window.cancelUserOrder = async (orderId) => {
    if(confirm('هل أنت متأكد من إلغاء هذا الطلب؟ (لا يمكن التراجع)')) {
        try {
            await updateDoc(doc(db, "orders", orderId), { status: 'cancelled' });
            window.toast('تم إلغاء الطلب بنجاح', 'success');
            loadUserOrders();
        } catch(e) { window.toast('حدث خطأ أثناء الإلغاء', 'error'); }
    }
};

async function loadUserOrders() {
    if(!window.currentUser) return;
    const q = query(collection(db, "orders"), orderBy("timestamp", "desc"));
    const snap = await getDocs(q); 
    const myOrders = snap.docs.map(d=>({id:d.id, ...d.data()})).filter(o => o.customer?.uid === window.currentUser.uid);
    
    const container = document.getElementById('user-orders-list');
    if(!myOrders.length) { container.innerHTML = '<p class="text-center text-gray-400 font-bold py-10">لم تقم بأي طلبات بعد</p>'; return; }
    
    const statusLang = { 'pending': '⏳ قيد المراجعة', 'confirmed': '✅ تم التأكيد (تجهيز)', 'delivered': '📦 تم التسليم', 'cancelled': '❌ ملغي' };
    
    container.innerHTML = myOrders.map(o => `
        <div class="bg-white p-4 rounded-xl border border-[#FAF8F5] shadow-sm mb-3">
            <div class="flex justify-between items-center border-b pb-2 mb-2">
                <span class="font-bold">#${o.id.slice(0,6)}</span>
                <span class="text-xs font-bold ${o.status === 'cancelled' ? 'text-red-500' : 'text-[#8B7355]'} bg-[#FAF8F5] px-2 py-1 rounded">${statusLang[o.status]||'معلق'}</span>
            </div>
            <div class="text-sm text-gray-600">${o.items.map(i=>`<p>- ${i.name} (x${i.qty})</p>`).join('')}</div>
            <div class="flex justify-between items-center mt-3 pt-2 border-t">
                <div class="flex flex-col gap-1">
                    <span class="text-xs text-gray-400">${new Date(o.timestamp).toLocaleDateString('ar-EG')}</span>
                    ${o.status === 'pending' ? `<button onclick="window.cancelUserOrder('${o.id}')" class="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded w-fit">إلغاء الطلب</button>` : ''}
                </div>
                <span class="font-black text-[#8B7355]">${o.total} ج.م</span>
            </div>
        </div>
    `).join('');
}

fetchData(); window.updateBadge();
