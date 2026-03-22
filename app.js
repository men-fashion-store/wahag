// ملف app.js - المحرك الرئيسي للمتجر والسلة
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// بيانات قاعدة بيانات وَهَج الجديدة
const firebaseConfig = {
  apiKey: "AIzaSyAnz5eg_i_nvrQr128ms_PlYldEFdIrIUY",
  authDomain: "wahaj-21a9d.firebaseapp.com",
  projectId: "wahaj-21a9d",
  storageBucket: "wahaj-21a9d.firebasestorage.app",
  messagingSenderId: "820263571886",
  appId: "1:820263571886:web:2af268a7acbdba7b75f83f",
  measurementId: "G-CXZZ0N8598"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// حالة التطبيق
window.cart = JSON.parse(localStorage.getItem('wahaj_cart')) || [];
window.products = [];
window.checkoutStep = 1;

// جلب المنتجات من قاعدة البيانات
async function fetchProducts() {
    try {
        const q = query(collection(db, "products"), orderBy("timestamp", "desc"));
        const snap = await getDocs(q);
        window.products = snap.docs.map(d => ({id: d.id, ...d.data()}));
        renderProducts();
    } catch(e) { window.toast('حدث خطأ في جلب الشموع', 'error'); }
}

// رسم المنتجات في الصفحة
function renderProducts() {
    const grid = document.getElementById('products-grid');
    if(!window.products.length) { grid.innerHTML = '<div class="col-span-full text-center text-gray-400 py-10 font-bold">لا توجد منتجات حالياً</div>'; return; }
    
    grid.innerHTML = window.products.map(p => {
        const hasSale = p.oldPrice && Number(p.oldPrice) > Number(p.price);
        return `
        <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-300 group flex flex-col">
            <div class="relative h-64 bg-gray-50 overflow-hidden">
                ${hasSale ? `<span class="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full z-10">خصم</span>` : ''}
                <img src="${p.images[0]}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700">
                <div class="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <button onclick="addToCart('${p.id}')" class="bg-white text-[#8B7355] px-6 py-2 rounded-full font-bold shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 hover:bg-[#8B7355] hover:text-white">أضف للسلة 🛒</button>
                </div>
            </div>
            <div class="p-5 flex-1 flex flex-col">
                <h3 class="font-bold text-xl text-gray-800 mb-1">${p.name}</h3>
                ${p.desc ? `<p class="text-xs text-gray-500 mb-3 line-clamp-2">${p.desc}</p>` : ''}
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

// === منطق السلة (Cart Logic) ===

window.addToCart = (id) => {
    const prod = window.products.find(x => x.id === id);
    const exists = window.cart.find(i => i.id === id);
    
    if(exists) exists.qty++;
    else window.cart.push({ id: prod.id, name: prod.name, price: Number(prod.price), image: prod.images[0], qty: 1 });
    
    saveCart(); updateBadge(); renderCartDrawer(); 
    window.toast(`تم إضافة "${prod.name}" للسلة ✨`);
    
    if(document.getElementById('cart-drawer').classList.contains('cart-closed')) toggleCart();
};

window.renderCartDrawer = () => {
    const container = document.getElementById('cart-items');
    let total = 0;
    
    if(window.cart.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-gray-400 opacity-60 mt-20">
                <svg class="w-24 h-24 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
                <p class="font-bold text-lg">سلتك فارغة</p>
                <p class="text-sm">لم تقم بإضافة أي شموع بعد.</p>
            </div>`;
        document.getElementById('cart-total').innerText = '0 ج.م';
        resetCheckout();
        return;
    }

    container.innerHTML = window.cart.map((item, idx) => {
        total += item.price * item.qty;
        return `
        <div class="flex gap-4 bg-white p-3 rounded-xl border border-gray-100 shadow-sm relative">
            <img src="${item.image}" class="w-20 h-20 rounded-lg object-cover bg-gray-50 border">
            <div class="flex-1 flex flex-col justify-between">
                <h4 class="font-bold text-sm text-gray-800 pr-5">${item.name}</h4>
                <p class="font-black text-[#8B7355]">${item.price * item.qty} ج.م</p>
                
                <div class="flex items-center gap-3 bg-gray-50 w-fit rounded-lg border border-gray-200 p-1">
                    <button onclick="updateQty(${idx}, -1)" class="w-6 h-6 flex items-center justify-center text-[#8B7355] font-bold hover:bg-gray-200 rounded">-</button>
                    <span class="text-sm font-bold w-4 text-center">${item.qty}</span>
                    <button onclick="updateQty(${idx}, 1)" class="w-6 h-6 flex items-center justify-center text-[#8B7355] font-bold hover:bg-gray-200 rounded">+</button>
                </div>
            </div>
            <button onclick="removeItem(${idx})" class="absolute top-2 left-2 text-gray-300 hover:text-red-500 transition p-1">✕</button>
        </div>`;
    }).join('');
    
    document.getElementById('cart-total').innerText = total + ' ج.م';
};

window.updateQty = (idx, val) => { window.cart[idx].qty += val; if(window.cart[idx].qty <= 0) window.cart.splice(idx,1); saveCart(); updateBadge(); renderCartDrawer(); };
window.removeItem = (idx) => { window.cart.splice(idx,1); saveCart(); updateBadge(); renderCartDrawer(); };
window.saveCart = () => localStorage.setItem('wahaj_cart', JSON.stringify(window.cart));

window.updateBadge = () => { 
    const count = window.cart.reduce((s, i) => s + i.qty, 0); 
    const badge = document.getElementById('cart-badge');
    badge.innerText = count; 
    if(count > 0) { badge.classList.remove('scale-0'); badge.classList.add('scale-100'); } 
    else { badge.classList.remove('scale-100'); badge.classList.add('scale-0'); }
};

window.toggleCart = () => {
    const drawer = document.getElementById('cart-drawer');
    const overlay = document.getElementById('cart-overlay');
    
    if(drawer.classList.contains('cart-closed')) {
        renderCartDrawer();
        drawer.classList.remove('cart-closed');
        drawer.classList.add('cart-open');
        overlay.classList.remove('hidden');
        setTimeout(()=> overlay.classList.add('opacity-100'), 10);
        document.body.style.overflow = 'hidden';
    } else {
        drawer.classList.remove('cart-open');
        drawer.classList.add('cart-closed');
        overlay.classList.remove('opacity-100');
        setTimeout(()=> overlay.classList.add('hidden'), 300);
        document.body.style.overflow = '';
        resetCheckout();
    }
};

function resetCheckout() {
    window.checkoutStep = 1;
    document.getElementById('checkout-form').classList.add('hidden');
    document.getElementById('cart-items').style.display = 'block';
    document.getElementById('checkout-btn').innerHTML = 'متابعة الطلب ➔';
}

window.handleCheckoutStep = async () => {
    if(!window.cart.length) return window.toast('السلة فارغة!', 'error');

    if(window.checkoutStep === 1) {
        window.checkoutStep = 2;
        document.getElementById('cart-items').style.display = 'none';
        document.getElementById('checkout-form').classList.remove('hidden');
        document.getElementById('checkout-btn').innerHTML = 'تأكيد وإرسال الطلب ✅';
    } else {
        const name = document.getElementById('cart-name').value.trim();
        const phone = document.getElementById('cart-phone').value.trim();
        const address = document.getElementById('cart-address').value.trim();
        const btn = document.getElementById('checkout-btn');

        if(!name || !phone || !address) return window.toast('يرجى ملء جميع بيانات التوصيل', 'error');

        btn.disabled = true;
        btn.innerHTML = 'جاري الإرسال... ⏳';

        const totalAmount = window.cart.reduce((s,i) => s + (i.price * i.qty), 0);
        
        try {
            await addDoc(collection(db, "orders"), {
                items: window.cart, total: totalAmount, customerName: name, customerPhone: phone, customerAddress: address, timestamp: Date.now(), status: 'new', read: false
            });

            let msg = `✨ *طلب جديد من متجر وَهَج* ✨\n\n👤 *الاسم:* ${name}\n📞 *الموبايل:* ${phone}\n📍 *العنوان:* ${address}\n\n🛍️ *التفاصيل:*\n`;
            window.cart.forEach(item => { msg += `🔸 ${item.name} (الكمية: ${item.qty})\n`; });
            msg += `\n💰 *الإجمالي المطلوب:* ${totalAmount} ج.م`;

            window.cart = []; saveCart(); updateBadge(); toggleCart();
            window.toast('تم تأكيد طلبك بنجاح! سيتم تحويلك للواتساب...', 'success');

            setTimeout(() => {
                window.open(`https://wa.me/201020468021?text=${encodeURIComponent(msg)}`, '_blank');
                btn.disabled = false;
            }, 1500);

        } catch(e) { window.toast('حدث خطأ، حاول مرة أخرى', 'error'); btn.disabled = false; btn.innerHTML = 'تأكيد وإرسال الطلب ✅'; }
    }
};

window.toast = (msg, type = 'success') => {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    const bgColor = type === 'error' ? 'bg-red-500' : 'bg-[#6A563D]';
    el.className = `${bgColor} text-white px-6 py-3 rounded-xl shadow-2xl font-bold flex items-center gap-2 toast-animate border border-white/20`;
    el.innerHTML = type === 'error' ? `<span>⚠️</span> ${msg}` : `<span>✨</span> ${msg}`;
    container.appendChild(el);
    setTimeout(() => {
        el.style.opacity = '0';
        el.style.transform = 'translate(-50%, -100%)';
        el.style.transition = 'all 0.3s ease-in';
        setTimeout(()=> el.remove(), 300);
    }, 3000);
};

// تهيئة
fetchProducts();
updateBadge();
