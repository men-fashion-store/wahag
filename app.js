import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy, addDoc, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = { apiKey: "AIzaSyAnz5eg_i_nvrQr128ms_PlYldEFdIrIUY", authDomain: "wahaj-21a9d.firebaseapp.com", projectId: "wahaj-21a9d", storageBucket: "wahaj-21a9d.firebasestorage.app", messagingSenderId: "820263571886", appId: "1:820263571886:web:2af268a7acbdba7b75f83f", measurementId: "G-CXZZ0N8598" };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

window.cart = JSON.parse(localStorage.getItem('wahaj_cart')) || [];
window.products = [];
window.currentUser = null;

// مراقبة حالة تسجيل الدخول
onAuthStateChanged(auth, async (user) => {
    const modal = document.getElementById('auth-modal');
    if (user) {
        // لو مسجل دخول، نجيب بياناته من الداتابيز
        const docSnap = await getDoc(doc(db, "users", user.uid));
        if (docSnap.exists()) {
            window.currentUser = docSnap.data();
            document.getElementById('header-user-name').innerText = window.currentUser.name.split(' ')[0]; // الاسم الأول بس
            
            // تحديث واجهة المودال للبروفايل
            document.getElementById('form-login').classList.add('hidden');
            document.getElementById('form-signup').classList.add('hidden');
            document.getElementById('tab-login').parentElement.classList.add('hidden');
            document.getElementById('user-profile').classList.remove('hidden');
            document.getElementById('profile-name').innerText = window.currentUser.name;
            document.getElementById('profile-phone').innerText = window.currentUser.phone;
        }
    } else {
        window.currentUser = null;
        document.getElementById('header-user-name').innerText = 'دخول';
        document.getElementById('user-profile').classList.add('hidden');
        document.getElementById('tab-login').parentElement.classList.remove('hidden');
        window.switchAuthTab('login');
    }
});

// دوال الواجهة للحسابات
window.openAuth = () => {
    const m = document.getElementById('auth-modal');
    m.classList.remove('hidden');
    setTimeout(()=> m.classList.remove('opacity-0'), 10);
};
window.closeAuth = () => {
    const m = document.getElementById('auth-modal');
    m.classList.add('opacity-0');
    setTimeout(()=> m.classList.add('hidden'), 300);
};
window.switchAuthTab = (tab) => {
    document.getElementById('form-login').classList.toggle('hidden', tab !== 'login');
    document.getElementById('form-signup').classList.toggle('hidden', tab !== 'signup');
    
    document.getElementById('tab-login').className = tab === 'login' ? 'flex-1 py-4 font-black text-[#8B7355] border-b-2 border-[#8B7355]' : 'flex-1 py-4 font-bold text-gray-400 border-b-2 border-transparent';
    document.getElementById('tab-signup').className = tab === 'signup' ? 'flex-1 py-4 font-black text-[#8B7355] border-b-2 border-[#8B7355]' : 'flex-1 py-4 font-bold text-gray-400 border-b-2 border-transparent';
};

// إنشاء حساب
window.handleSignup = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-signup');
    const name = document.getElementById('signup-name').value;
    const phone = document.getElementById('signup-phone').value;
    const pass = document.getElementById('signup-pass').value;
    const address = document.getElementById('signup-address').value;
    const fakeEmail = `${phone}@wahaj.com`; // فايربيز بيطلب إيميل، فبنعمل إيميل وهمي بالرقم

    btn.disabled = true; btn.innerText = 'جاري الإنشاء...';
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, fakeEmail, pass);
        // حفظ البيانات في قاعدة البيانات
        await setDoc(doc(db, "users", userCredential.user.uid), { name, phone, address, uid: userCredential.user.uid });
        window.toast('تم إنشاء الحساب بنجاح ✨', 'success');
        setTimeout(window.closeAuth, 1000);
    } catch(err) {
        window.toast('الرقم مسجل مسبقاً أو الرقم السري ضعيف', 'error');
    }
    btn.disabled = false; btn.innerText = 'إنشاء الحساب';
};

// تسجيل دخول
window.handleLogin = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-login');
    const phone = document.getElementById('login-phone').value;
    const pass = document.getElementById('login-pass').value;
    const fakeEmail = `${phone}@wahaj.com`;

    btn.disabled = true; btn.innerText = 'جاري الدخول...';
    try {
        await signInWithEmailAndPassword(auth, fakeEmail, pass);
        window.toast('أهلاً بك في وَهَج ✨', 'success');
        setTimeout(window.closeAuth, 1000);
    } catch(err) { window.toast('الرقم أو كلمة المرور خطأ', 'error'); }
    btn.disabled = false; btn.innerText = 'دخول';
};

window.handleLogout = () => { signOut(auth); window.closeAuth(); window.toast('تم تسجيل الخروج'); };

// جلب المنتجات (كما هي)
async function fetchProducts() {
    const q = query(collection(db, "products"), orderBy("timestamp", "desc"));
    const snap = await getDocs(q);
    window.products = snap.docs.map(d => ({id: d.id, ...d.data()}));
    renderProducts();
}

function renderProducts() {
    const grid = document.getElementById('products-grid');
    grid.innerHTML = window.products.map(p => {
        const hasSale = p.oldPrice && Number(p.oldPrice) > Number(p.price);
        return `
        <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm group flex flex-col">
            <div class="relative h-64 bg-gray-50 overflow-hidden">
                ${hasSale ? `<span class="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full z-10">خصم</span>` : ''}
                <img src="${p.images[0]}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700">
                <div class="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button onclick="addToCart('${p.id}')" class="bg-white text-[#8B7355] px-6 py-2 rounded-full font-bold shadow-lg hover:bg-[#8B7355] hover:text-white transition">أضف للسلة 🛒</button>
                </div>
            </div>
            <div class="p-5 flex-1 flex flex-col">
                <h3 class="font-bold text-xl mb-1">${p.name}</h3>
                <div class="mt-auto flex justify-between items-center">
                    <div class="flex flex-col">
                        ${hasSale ? `<span class="text-xs text-gray-400 line-through">${p.oldPrice} ج.م</span>` : ''}
                        <span class="font-black text-2xl text-[#8B7355]">${p.price} <span class="text-sm">ج.م</span></span>
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');
}

// السلة والدفع
window.addToCart = (id) => {
    const prod = window.products.find(x => x.id === id);
    const exists = window.cart.find(i => i.id === id);
    if(exists) exists.qty++; else window.cart.push({ id: prod.id, name: prod.name, price: Number(prod.price), image: prod.images[0], qty: 1 });
    saveCart(); updateBadge(); renderCartDrawer(); window.toast('تمت الإضافة للسلة ✨');
};

window.renderCartDrawer = () => {
    const container = document.getElementById('cart-items');
    let total = 0;
    if(window.cart.length === 0) { container.innerHTML = '<p class="text-center text-gray-400 py-20 font-bold">السلة فارغة</p>'; document.getElementById('cart-total').innerText = '0 ج.م'; return; }
    container.innerHTML = window.cart.map((i, idx) => {
        total += i.price * i.qty;
        return `
        <div class="flex gap-4 bg-white p-3 rounded-xl border border-gray-100 shadow-sm relative">
            <img src="${i.image}" class="w-20 h-20 rounded-lg object-cover bg-gray-50 border">
            <div class="flex-1 flex flex-col justify-between">
                <h4 class="font-bold text-sm pr-5">${i.name}</h4><p class="font-black text-[#8B7355]">${i.price * i.qty} ج.م</p>
                <div class="flex gap-3 bg-gray-50 w-fit rounded-lg border p-1"><button onclick="updateQty(${idx}, -1)" class="w-6 font-bold">-</button><span class="text-sm font-bold w-4 text-center">${i.qty}</span><button onclick="updateQty(${idx}, 1)" class="w-6 font-bold">+</button></div>
            </div>
            <button onclick="removeItem(${idx})" class="absolute top-2 left-2 text-gray-300 hover:text-red-500">✕</button>
        </div>`;
    }).join('');
    document.getElementById('cart-total').innerText = total + ' ج.م';
};

window.updateQty = (idx, val) => { window.cart[idx].qty += val; if(window.cart[idx].qty <= 0) window.cart.splice(idx,1); saveCart(); updateBadge(); renderCartDrawer(); };
window.removeItem = (idx) => { window.cart.splice(idx,1); saveCart(); updateBadge(); renderCartDrawer(); };
window.saveCart = () => localStorage.setItem('wahaj_cart', JSON.stringify(window.cart));
window.updateBadge = () => { const c = window.cart.reduce((s, i) => s + i.qty, 0); const b = document.getElementById('cart-badge'); b.innerText = c; c > 0 ? b.classList.replace('scale-0', 'scale-100') : b.classList.replace('scale-100', 'scale-0'); };
window.toggleCart = () => { const d = document.getElementById('cart-drawer'), o = document.getElementById('cart-overlay'); if(d.classList.contains('cart-closed')) { renderCartDrawer(); d.classList.replace('cart-closed', 'cart-open'); o.classList.remove('hidden'); setTimeout(()=>o.classList.add('opacity-100'),10); } else { d.classList.replace('cart-open', 'cart-closed'); o.classList.remove('opacity-100'); setTimeout(()=>o.classList.add('hidden'),300); } };

// زر تأكيد الطلب المباشر
window.handleCheckout = async () => {
    if(!window.cart.length) return window.toast('السلة فارغة!', 'error');
    if(!window.currentUser) { window.toast('برجاء تسجيل الدخول أولاً لإتمام الطلب', 'error'); window.toggleCart(); window.openAuth(); return; }

    const btn = document.getElementById('checkout-btn');
    btn.disabled = true; btn.innerText = 'جاري الإرسال...';
    const totalAmount = window.cart.reduce((s,i) => s + (i.price * i.qty), 0);
    
    try {
        await addDoc(collection(db, "orders"), {
            items: window.cart, total: totalAmount, 
            customerName: window.currentUser.name, customerPhone: window.currentUser.phone, customerAddress: window.currentUser.address, 
            timestamp: Date.now(), status: 'new', read: false
        });

        let msg = `✨ *طلب جديد من تطبيق وَهَج* ✨\n\n👤 *الاسم:* ${window.currentUser.name}\n📞 *الموبايل:* ${window.currentUser.phone}\n📍 *العنوان:* ${window.currentUser.address}\n\n🛍️ *التفاصيل:*\n`;
        window.cart.forEach(item => { msg += `🔸 ${item.name} (الكمية: ${item.qty})\n`; });
        msg += `\n💰 *الإجمالي المطلوب:* ${totalAmount} ج.م`;

        window.cart = []; saveCart(); updateBadge(); window.toggleCart();
        window.toast('تم تأكيد طلبك بنجاح!', 'success');
        setTimeout(() => { window.open(`https://wa.me/201101151118?text=${encodeURIComponent(msg)}`, '_blank'); btn.disabled = false; btn.innerText = 'تأكيد الطلب ✅'; }, 1500);
    } catch(e) { window.toast('حدث خطأ، حاول مرة أخرى', 'error'); btn.disabled = false; btn.innerText = 'تأكيد الطلب ✅'; }
};

window.toast = (msg, type = 'success') => { const c = document.getElementById('toast-container'), el = document.createElement('div'); el.className = `${type === 'error' ? 'bg-red-500' : 'bg-[#6A563D]'} text-white px-6 py-3 rounded-xl shadow-2xl font-bold flex items-center gap-2 toast-animate border border-white/20`; el.innerHTML = `<span>${type === 'error' ? '⚠️' : '✨'}</span> ${msg}`; c.appendChild(el); setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translate(-50%, -100%)'; el.style.transition = 'all 0.3s ease-in'; setTimeout(()=> el.remove(), 300); }, 3000); };

fetchProducts(); updateBadge();
