// API 配置
const API_BASE = window.__API_BASE__ || '/java-shop/api';

// 全局变量
let authToken = localStorage.getItem('auth_token');
let currentUser = JSON.parse(localStorage.getItem('current_user') || 'null');
let isLoginMode = true;
let products = [];
let cart = [];
let orders = [];
let categories = [];

// 全局错误处理 - 阻止浏览器显示原始错误（包含IP）
window.addEventListener('error', (event) => {
    event.preventDefault();
    event.stopPropagation();
    console.error('错误:', event.error);
    // 不显示任何用户提示，避免暴露技术信息
    return true;
}, true);

window.addEventListener('unhandledrejection', (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    console.error('未处理的 Promise 错误:', event.reason);
    // 不显示任何用户提示，避免暴露技术信息
    return true;
}, true);

// 自定义alert函数，替代原生alert（不显示IP）
window.customAlert = function(message) {
    const alertBox = document.getElementById('customAlert');
    const messageEl = document.getElementById('customAlertMessage');
    messageEl.textContent = message;
    alertBox.style.display = 'block';
    
    // 支持Enter键关闭
    const handleKeyPress = (e) => {
        if (e.key === 'Enter' || e.key === 'Escape') {
            window.closeCustomAlert();
            document.removeEventListener('keypress', handleKeyPress);
        }
    };
    document.addEventListener('keypress', handleKeyPress);
};

window.closeCustomAlert = function() {
    document.getElementById('customAlert').style.display = 'none';
};

// 覆盖原生alert
window.alert = window.customAlert;

// 完全禁用console输出，防止IP泄露（生产环境）
if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    const noop = function() {};
    console.log = noop;
    console.error = noop;
    console.warn = noop;
    console.info = noop;
    console.debug = noop;
    console.trace = noop;
    console.dir = noop;
    console.table = noop;
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    // 自定义alert点击遮罩关闭
    const overlay = document.querySelector('.custom-alert-overlay');
    if (overlay) {
        overlay.addEventListener('click', window.closeCustomAlert);
    }
    
    if (authToken && currentUser) {
        showApp();
    } else {
        showAuthModal();
    }
    
    document.getElementById('authForm').addEventListener('submit', handleAuth);
    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    
    // 添加注册页面手机号实时验证
    const phoneInput = document.getElementById('regPhone');
    const phoneHint = document.getElementById('phoneHint');
    
    phoneInput.addEventListener('input', (e) => {
        const phone = e.target.value.trim();
        
        if (phone.length === 0) {
            phoneHint.textContent = '格式：13812345678（选填）';
            phoneHint.style.color = '#999';
            e.target.style.borderColor = '#e0e0e0';
            return;
        }
        
        const phoneDigits = phone.replace(/\D/g, '');
        
        if (phoneDigits.length === 0) {
            phoneHint.textContent = '只能输入数字';
            phoneHint.style.color = '#f44336';
            e.target.style.borderColor = '#f44336';
        } else if (phoneDigits.length < 11) {
            phoneHint.textContent = `还需输入 ${11 - phoneDigits.length} 位数字`;
            phoneHint.style.color = '#ff9800';
            e.target.style.borderColor = '#ff9800';
        } else if (phoneDigits.length === 11 && /^1[3-9]\d{9}$/.test(phoneDigits)) {
            phoneHint.textContent = '✓ 格式正确';
            phoneHint.style.color = '#4caf50';
            e.target.style.borderColor = '#4caf50';
            // 自动格式化为纯数字
            e.target.value = phoneDigits;
        } else if (phoneDigits.length === 11) {
            phoneHint.textContent = '手机号格式不正确';
            phoneHint.style.color = '#f44336';
            e.target.style.borderColor = '#f44336';
        } else {
            phoneHint.textContent = '手机号不能超过11位';
            phoneHint.style.color = '#f44336';
            e.target.style.borderColor = '#f44336';
        }
    });
    
    // 添加结算页面手机号实时验证
    const checkoutPhoneInput = document.getElementById('receiverPhone');
    const checkoutPhoneHint = document.getElementById('checkoutPhoneHint');
    
    checkoutPhoneInput.addEventListener('input', (e) => {
        const phone = e.target.value.trim();
        
        if (phone.length === 0) {
            checkoutPhoneHint.textContent = '请输入11位手机号';
            checkoutPhoneHint.style.color = '#999';
            e.target.style.borderColor = '#e0e0e0';
            return;
        }
        
        const phoneDigits = phone.replace(/\D/g, '');
        
        if (phoneDigits.length === 0) {
            checkoutPhoneHint.textContent = '只能输入数字';
            checkoutPhoneHint.style.color = '#f44336';
            e.target.style.borderColor = '#f44336';
        } else if (phoneDigits.length < 11) {
            checkoutPhoneHint.textContent = `还需输入 ${11 - phoneDigits.length} 位数字`;
            checkoutPhoneHint.style.color = '#ff9800';
            e.target.style.borderColor = '#ff9800';
        } else if (phoneDigits.length === 11 && /^1[3-9]\d{9}$/.test(phoneDigits)) {
            checkoutPhoneHint.textContent = '✓ 格式正确';
            checkoutPhoneHint.style.color = '#4caf50';
            e.target.style.borderColor = '#4caf50';
            // 自动格式化为纯数字
            e.target.value = phoneDigits;
        } else if (phoneDigits.length === 11) {
            checkoutPhoneHint.textContent = '手机号格式不正确（需1开头）';
            checkoutPhoneHint.style.color = '#f44336';
            e.target.style.borderColor = '#f44336';
        } else {
            checkoutPhoneHint.textContent = '手机号不能超过11位';
            checkoutPhoneHint.style.color = '#f44336';
            e.target.style.borderColor = '#f44336';
        }
    });
    
    setInterval(checkHealth, 30000);
});

// 认证处理
async function handleAuth(e) {
    e.preventDefault();
    
    const username = document.getElementById('authUsername').value.trim();
    const password = document.getElementById('authPassword').value;
    
    // 手动验证
    if (!username || !password) {
        alert('请填写用户名和密码');
        return;
    }
    
    let url, data;
    if (isLoginMode) {
        url = `${API_BASE}/auth/login`;
        data = { username, password };
    } else {
        // 注册模式额外验证
        const email = document.getElementById('regEmail').value.trim();
        const phone = document.getElementById('regPhone').value.trim();
        
        if (!email) {
            alert('请填写邮箱');
            return;
        }
        
        // 邮箱格式验证
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email)) {
            alert('邮箱格式不正确');
            return;
        }
        
        // 手机号验证（如果填写了）
        if (phone && phone.length > 0) {
            // 只保留数字
            const phoneDigits = phone.replace(/\D/g, '');
            if (phoneDigits.length === 0) {
                // 没有数字，清空
            } else if (phoneDigits.length !== 11 || !/^1[3-9]\d{9}$/.test(phoneDigits)) {
                alert('手机号格式不正确，请输入11位手机号');
                return;
            }
        }
        
        url = `${API_BASE}/auth/register`;
        data = {
            username,
            password,
            email,
            realName: document.getElementById('regRealName').value.trim(),
            phone
        };
    }
    
    try {
        let res;
        try {
            res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } catch (fetchErr) {
            console.error('网络请求失败');
            alert('网络连接失败，请检查网络后重试');
            return;
        }
        
        let result = {};
        try {
            result = await res.json();
        } catch (jsonErr) {
            console.error('JSON解析失败');
            result = {};
        }
        
        if (res.ok) {
            authToken = result.token;
            currentUser = result.user;
            localStorage.setItem('auth_token', authToken);
            localStorage.setItem('current_user', JSON.stringify(currentUser));
            
            // 显示成功提示
            if (!isLoginMode) {
                alert('注册成功！欢迎来到 Java Shop 🎉');
            }
            
            showApp();
        } else {
            // 根据错误信息显示友好提示
            let errorMsg = '操作失败';
            if (result.error && result.error.includes('already exists')) {
                errorMsg = '用户名已存在，请更换';
            } else if (result.error && result.error.includes('Username')) {
                errorMsg = '用户名已存在，请更换';
            } else if (result.error && result.error.includes('Invalid')) {
                errorMsg = '用户名或密码错误';
            } else if (!isLoginMode) {
                errorMsg = '注册失败，请检查输入信息';
            } else {
                errorMsg = '登录失败，请检查用户名和密码';
            }
            alert(errorMsg);
        }
    } catch (error) {
        console.error('认证失败');
        alert('操作失败，请稍后重试');
    }
}

function switchAuthMode() {
    isLoginMode = !isLoginMode;
    
    if (isLoginMode) {
        document.getElementById('modalTitle').textContent = '登录';
        document.getElementById('authSubmit').textContent = '登录';
        document.getElementById('switchText').textContent = '还没有账号？';
        document.getElementById('switchLink').textContent = '立即注册';
        document.getElementById('registerFields').style.display = 'none';
    } else {
        document.getElementById('modalTitle').textContent = '注册';
        document.getElementById('authSubmit').textContent = '注册';
        document.getElementById('switchText').textContent = '已有账号？';
        document.getElementById('switchLink').textContent = '立即登录';
        document.getElementById('registerFields').style.display = 'block';
    }
    
    // 清空输入
    document.getElementById('authUsername').value = '';
    document.getElementById('authPassword').value = '';
    document.getElementById('regEmail').value = '';
    document.getElementById('regRealName').value = '';
    const phoneInput = document.getElementById('regPhone');
    phoneInput.value = '';
    phoneInput.style.borderColor = '#e0e0e0';
    
    // 重置手机号提示
    const phoneHint = document.getElementById('phoneHint');
    if (phoneHint) {
        phoneHint.textContent = '格式：13812345678（选填）';
        phoneHint.style.color = '#999';
    }
}

function showApp() {
    document.getElementById('authModal').style.display = 'none';
    document.getElementById('appContainer').style.display = 'block';
    document.getElementById('currentUsername').textContent = currentUser.username;
    document.getElementById('userRole').textContent = currentUser.role === 'admin' ? '管理员' : '顾客';
    
    if (currentUser.role === 'admin') {
        // 只显示管理员按钮，不显示内容区域
        document.querySelectorAll('.tab-btn.admin-only').forEach(el => {
            el.style.display = 'inline-block';
        });
    }
    
    loadCategories();
    loadProducts();
    loadCart();
    checkHealth();
}

function showAuthModal() {
    document.getElementById('authModal').style.display = 'flex';
}

function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('current_user');
    location.reload();
}

// 加载分类
async function loadCategories() {
    try {
        const res = await fetch(`${API_BASE}/categories`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (res.ok) {
            categories = await res.json();
            const filter = document.getElementById('categoryFilter');
            filter.innerHTML = '<option value="">全部分类</option>';
            categories.forEach(cat => {
                filter.innerHTML += `<option value="${cat.id}">${cat.icon} ${cat.name}</option>`;
            });
        }
    } catch (error) {
        console.error('加载分类失败:', error);
    }
}

// 加载商品
async function loadProducts() {
    const search = document.getElementById('searchInput')?.value || '';
    const categoryId = document.getElementById('categoryFilter')?.value || '';
    
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (categoryId) params.append('categoryId', categoryId);
    
    try {
        const res = await fetch(`${API_BASE}/products?${params}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (res.ok) {
            products = await res.json();
            renderProducts();
        }
    } catch (error) {
        console.error('加载商品失败:', error);
    }
}

function renderProducts() {
    const container = document.getElementById('productList');
    
    if (products.length === 0) {
        container.innerHTML = '<div style="background:white;padding:40px;border-radius:10px;text-align:center;"><p style="color:#666;">暂无商品</p></div>';
        return;
    }
    
    container.innerHTML = products.map(p => `
        <div class="product-card" onclick="viewProduct(${p.id})">
            <img src="${p.imageUrl || 'https://placehold.co/300x300/667eea/white?text=' + encodeURIComponent(p.name)}" 
                 alt="${p.name}" 
                 onerror="this.src='https://placehold.co/300x300/667eea/white?text=Product'">
            <h3>${p.name}</h3>
            <div class="product-price">
                ¥${p.price}
                ${p.originalPrice ? `<span class="product-original-price">¥${p.originalPrice}</span>` : ''}
            </div>
            <p class="product-stock">库存：${p.stock}</p>
            <p style="color:#999;font-size:14px;">${p.category ? p.category.name : '未分类'}</p>
            <button class="btn-primary" onclick="event.stopPropagation(); addToCart(${p.id})">加入购物车</button>
        </div>
    `).join('');
}

// 加载购物车
async function loadCart() {
    try {
        const res = await fetch(`${API_BASE}/cart`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (res.ok) {
            cart = await res.json();
            updateCartBadge();
            renderCart();
        }
    } catch (error) {
        console.error('加载购物车失败:', error);
    }
}

function updateCartBadge() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cartCount').textContent = count;
}

function renderCart() {
    const container = document.getElementById('cartList');
    
    if (cart.length === 0) {
        container.innerHTML = '<div style="background:white;padding:40px;border-radius:10px;text-align:center;"><p style="color:#666;">购物车是空的</p></div>';
        document.querySelector('.cart-summary').style.display = 'none';
        return;
    }
    
    document.querySelector('.cart-summary').style.display = 'block';
    
    let total = 0;
    container.innerHTML = cart.map(item => {
        const subtotal = item.product.price * item.quantity;
        total += subtotal;
        return `
            <div class="cart-item">
                <img src="${item.product.imageUrl || 'https://placehold.co/100x100/667eea/white?text=' + encodeURIComponent(item.product.name.substring(0,10))}" 
                     alt="${item.product.name}" 
                     onerror="this.src='https://placehold.co/100x100/667eea/white?text=商品'"
                     style="width:100px;height:100px;object-fit:cover;border-radius:8px;">
                <div class="cart-item-info">
                    <h3>${item.product.name}</h3>
                    <p style="color:#f44336;font-size:20px;font-weight:bold;">¥${item.product.price}</p>
                </div>
                <div class="cart-item-actions">
                    <div class="quantity-control">
                        <button onclick="updateCartQuantity(${item.product.id}, ${item.quantity - 1})">-</button>
                        <span style="min-width:30px;text-align:center;">${item.quantity}</span>
                        <button onclick="updateCartQuantity(${item.product.id}, ${item.quantity + 1})">+</button>
                    </div>
                    <p style="color:#666;margin-left:20px;">小计: ¥${subtotal.toFixed(2)}</p>
                    <button class="btn-secondary" onclick="removeFromCart(${item.id})">删除</button>
                </div>
            </div>
        `;
    }).join('');
    
    document.getElementById('cartTotal').textContent = total.toFixed(2);
}

// 购物车操作
async function addToCart(productId) {
    try {
        const res = await fetch(`${API_BASE}/cart`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ productId, quantity: 1 })
        });
        
        if (res.ok) {
            alert('已加入购物车');
            loadCart();
        } else {
            const result = await res.json();
            alert('添加失败，请稍后重试');
        }
    } catch (error) {
        console.error('添加购物车失败:', error);
        alert('操作失败，请检查网络连接');
    }
}

async function updateCartQuantity(productId, quantity) {
    if (quantity < 1) return;
    
    try {
        const res = await fetch(`${API_BASE}/cart/${productId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ quantity })
        });
        
        if (res.ok) {
            loadCart();
        } else {
            const result = await res.json();
            alert('更新数量失败，请稍后重试');
        }
    } catch (error) {
        console.error('更新失败:', error);
    }
}

async function removeFromCart(id) {
    // 直接删除，无需确认
    try {
        await fetch(`${API_BASE}/cart/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        loadCart();
        alert('已从购物车删除');
    } catch (error) {
        console.error('删除失败:', error);
    }
}

// 结算
function checkout() {
    if (cart.length === 0) {
        alert('购物车是空的');
        return;
    }
    document.getElementById('checkoutModal').classList.add('show');
    
    document.getElementById('checkoutForm').onsubmit = async (e) => {
        e.preventDefault();
        
        const receiverName = document.getElementById('receiverName').value.trim();
        const receiverPhone = document.getElementById('receiverPhone').value.trim();
        const shippingAddress = document.getElementById('shippingAddress').value.trim();
        
        // 验证必填字段
        if (!receiverName) {
            alert('请填写收货人姓名');
            return;
        }
        
        if (!receiverPhone) {
            alert('请填写收货人电话');
            return;
        }
        
        // 验证手机号格式
        const phoneDigits = receiverPhone.replace(/\D/g, '');
        if (phoneDigits.length !== 11 || !/^1[3-9]\d{9}$/.test(phoneDigits)) {
            alert('请输入正确的11位手机号');
            return;
        }
        
        if (!shippingAddress) {
            alert('请填写详细地址');
            return;
        }
        
        const items = cart.map(item => ({
            productId: item.product.id,
            quantity: item.quantity
        }));
        
        const data = {
            items,
            receiverName,
            receiverPhone: phoneDigits,  // 使用纯数字
            shippingAddress,
            remark: document.getElementById('orderRemark').value
        };
        
        try {
            const res = await fetch(`${API_BASE}/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(data)
            });
            
            if (res.ok) {
                alert('订单创建成功！');
                closeCheckoutModal();
                loadCart();
                switchTab('orders');
            } else {
                const result = await res.json().catch(() => ({}));
                // 优化错误提示
                let errorMsg = '订单提交失败';
                if (result.error && result.error.includes('stock')) {
                    errorMsg = '商品库存不足，请调整数量';
                } else if (result.error && result.error.includes('address')) {
                    errorMsg = '请填写完整的收货地址';
                } else {
                    errorMsg = '订单提交失败，请检查信息是否完整';
                }
                alert(errorMsg);
            }
        } catch (error) {
            console.error('创建订单失败:', error);
            alert('提交订单失败，请稍后重试');
        }
    };
}

function closeCheckoutModal() {
    document.getElementById('checkoutModal').classList.remove('show');
}

// 订单管理
async function loadOrders() {
    try {
        const res = await fetch(`${API_BASE}/orders`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (res.ok) {
            orders = await res.json();
            renderOrders();
        }
    } catch (error) {
        console.error('加载订单失败:', error);
    }
}

function renderOrders() {
    const container = document.getElementById('orderList');
    
    if (orders.length === 0) {
        container.innerHTML = '<div style="background:white;padding:40px;border-radius:10px;text-align:center;"><p style="color:#666;">暂无订单</p></div>';
        return;
    }
    
    container.innerHTML = orders.map(order => `
        <div class="order-item">
            <div class="order-header">
                <div>
                    <strong>订单号：</strong>${order.orderNo}<br>
                    <strong>下单时间：</strong>${new Date(order.createdAt).toLocaleString('zh-CN')}
                </div>
                <span class="order-status status-${order.status}">${getStatusText(order.status)}</span>
            </div>
            ${order.items.map(item => `
                <div style="display:flex;gap:15px;margin-bottom:10px;">
                    <div>${item.productName}</div>
                    <div>¥${item.productPrice} × ${item.quantity}</div>
                    <div style="color:#f44336;font-weight:bold;">¥${item.subtotal}</div>
                </div>
            `).join('')}
            <div style="margin-top:15px;padding-top:15px;border-top:1px solid #e0e0e0;">
                <strong>总计：</strong><span style="color:#f44336;font-size:20px;font-weight:bold;">¥${order.totalAmount}</span>
            </div>
            <div style="margin-top:10px;color:#666;">
                <strong>收货人：</strong>${order.receiverName} ${order.receiverPhone}<br>
                <strong>地址：</strong>${order.shippingAddress}
            </div>
        </div>
    `).join('');
}

function getStatusText(status) {
    const map = {
        'pending': '待付款',
        'paid': '已付款',
        'shipped': '已发货',
        'completed': '已完成',
        'cancelled': '已取消'
    };
    return map[status] || status;
}

// 标签页切换
function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    document.getElementById(`${tab}Tab`).classList.add('active');
    
    if (tab === 'cart') loadCart();
    else if (tab === 'orders') loadOrders();
    else if (tab === 'products') loadProducts();
    else if (tab === 'manage') loadManageProducts();
}

// 健康检查
async function checkHealth() {
    try {
        const res = await fetch(`${API_BASE}/health`);
        const status = document.getElementById('apiStatus');
        status.textContent = res.ok ? 'API 连接正常' : 'API 连接异常';
        status.style.background = res.ok ? 'rgba(76, 175, 80, 0.3)' : 'rgba(244, 67, 54, 0.3)';
    } catch (error) {
        const status = document.getElementById('apiStatus');
        status.textContent = 'API 无法连接';
        status.style.background = 'rgba(244, 67, 54, 0.3)';
    }
}

function viewProduct(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;
    
    const modal = document.getElementById('productModal');
    const body = document.getElementById('productModalBody');
    
    body.innerHTML = `
        <img src="${product.imageUrl || 'https://placehold.co/400x400/667eea/white?text=' + encodeURIComponent(product.name)}" 
             alt="${product.name}"
             onerror="this.src='https://placehold.co/400x400/667eea/white?text=商品图片'"
             style="width:100%;border-radius:10px;margin-bottom:20px;object-fit:cover;">
        <h2>${product.name}</h2>
        <p style="color:#f44336;font-size:28px;font-weight:bold;margin:15px 0;">
            ¥${product.price}
            ${product.originalPrice ? `<span style="color:#999;text-decoration:line-through;font-size:18px;">¥${product.originalPrice}</span>` : ''}
        </p>
        <p style="color:#666;margin-bottom:10px;">库存：${product.stock}</p>
        <p style="color:#666;margin-bottom:20px;">分类：${product.category ? product.category.name : '未分类'}</p>
        ${product.description ? `<p style="line-height:1.6;color:#666;">${product.description}</p>` : ''}
        <button class="btn-primary" onclick="closeProductModal(); addToCart(${product.id})">加入购物车</button>
    `;
    
    modal.classList.add('show');
}

function closeProductModal() {
    document.getElementById('productModal').classList.remove('show');
}

// 搜索和筛选
document.getElementById('searchInput')?.addEventListener('input', debounce(loadProducts, 300));
document.getElementById('categoryFilter')?.addEventListener('change', loadProducts);

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// 商品管理功能
async function showProductForm(productId = null) {
    const modal = document.getElementById('productFormModal');
    const form = document.getElementById('productForm');
    const title = document.getElementById('productFormTitle');
    const categorySelect = document.getElementById('productCategory');
    
    // 重置表单
    form.reset();
    document.getElementById('productId').value = '';
    
    // 加载分类列表
    try {
        const res = await fetch(`${API_BASE}/categories`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (res.ok) {
            const categories = await res.json();
            categorySelect.innerHTML = '<option value="">选择商品分类 *</option>';
            categories.forEach(cat => {
                categorySelect.innerHTML += `<option value="${cat.id}">${cat.icon} ${cat.name}</option>`;
            });
        }
    } catch (error) {
        console.error('加载分类失败:', error);
    }
    
    if (productId) {
        // 编辑模式 - 从API加载完整数据
        title.textContent = '编辑商品';
        try {
            const res = await fetch(`${API_BASE}/products/${productId}`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (res.ok) {
                const product = await res.json();
                document.getElementById('productId').value = product.id;
                document.getElementById('productName').value = product.name;
                document.getElementById('productCategory').value = product.categoryId || '';
                document.getElementById('productPrice').value = product.price;
                document.getElementById('productStock').value = product.stock;
                document.getElementById('productImageUrl').value = product.imageUrl || '';
                document.getElementById('productDescription').value = product.description || '';
            } else {
                alert('加载商品失败');
                return;
            }
        } catch (error) {
            console.error('加载商品失败:', error);
            alert('加载商品失败，请重试');
            return;
        }
    } else {
        // 添加模式
        title.textContent = '添加商品';
    }
    
    modal.classList.add('show');
}

function closeProductForm() {
    document.getElementById('productFormModal').classList.remove('show');
}

// 处理商品表单提交
document.getElementById('productForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const productId = document.getElementById('productId').value;
    const name = document.getElementById('productName').value.trim();
    const categoryId = parseInt(document.getElementById('productCategory').value);
    const price = parseFloat(document.getElementById('productPrice').value);
    const stock = parseInt(document.getElementById('productStock').value);
    const imageUrl = document.getElementById('productImageUrl').value.trim();
    const description = document.getElementById('productDescription').value.trim();
    const imageFile = document.getElementById('productImageFile').files[0];
    
    // 验证
    if (!name) {
        alert('请填写商品名称');
        return;
    }
    
    if (!categoryId || isNaN(categoryId)) {
        alert('请选择商品分类');
        return;
    }
    
    if (isNaN(price) || price < 0) {
        alert('请填写有效的价格');
        return;
    }
    
    if (isNaN(stock) || stock < 0) {
        alert('请填写有效的库存');
        return;
    }
    
    // 准备数据
    let finalImageUrl = imageUrl;
    
    // 如果上传了图片，转换为Base64
    if (imageFile) {
        const reader = new FileReader();
        reader.onload = async (event) => {
            finalImageUrl = event.target.result;  // Base64
            await saveProduct(productId, name, categoryId, price, stock, finalImageUrl, description);
        };
        reader.readAsDataURL(imageFile);
    } else {
        // 如果是编辑且没有上传新图片，保留原图片
        if (productId && !imageUrl) {
            // 从表单中获取原始imageUrl（已在showProductForm中设置）
            finalImageUrl = document.getElementById('productImageUrl').value.trim();
        }
        await saveProduct(productId, name, categoryId, price, stock, finalImageUrl, description);
    }
});

async function saveProduct(productId, name, categoryId, price, stock, imageUrl, description) {
    const data = {
        name,
        price,
        stock,
        imageUrl: imageUrl || 'https://placehold.co/300x300/667eea/white?text=' + encodeURIComponent(name),
        description,
        categoryId,  // 使用选中的分类
        status: 'active'  // 保持商品为活跃状态
    };
    
    try {
        const url = productId 
            ? `${API_BASE}/admin/products/${productId}` 
            : `${API_BASE}/admin/products`;
        const method = productId ? 'PUT' : 'POST';
        
        const res = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(data)
        });
        
        if (res.ok) {
            alert(productId ? '商品更新成功！' : '商品添加成功！');
            closeProductForm();
            loadProducts();
            if (currentUser.role === 'admin') {
                loadManageProducts();
            }
        } else {
            const result = await res.json().catch(() => ({}));
            let errorMsg = '保存失败';
            if (res.status === 405) {
                errorMsg = '操作不被允许，请检查权限';
            } else if (res.status === 403) {
                errorMsg = '没有权限，请使用管理员账号';
            } else if (res.status === 400) {
                errorMsg = '数据格式错误，请检查输入';
            } else if (result.error) {
                errorMsg = '保存失败，请检查输入信息';
            }
            alert(errorMsg);
        }
    } catch (error) {
        console.error('保存商品失败:', error);
        alert('保存失败，请检查网络连接');
    }
}

// 加载管理员商品列表
async function loadManageProducts() {
    try {
        const res = await fetch(`${API_BASE}/products`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (res.ok) {
            const products = await res.json();
            renderManageProducts(products);
        }
    } catch (error) {
        console.error('加载商品失败:', error);
    }
}

function renderManageProducts(products) {
    const container = document.getElementById('manageProductList');
    if (!container) return;
    
    container.innerHTML = products.map(p => `
        <div class="product-card">
            <img src="${p.imageUrl || 'https://placehold.co/300x300/667eea/white?text=' + encodeURIComponent(p.name)}" 
                 alt="${p.name}" 
                 onerror="this.src='https://placehold.co/300x300/667eea/white?text=Product'">
            <h3>${p.name}</h3>
            <div class="product-price">¥${p.price}</div>
            <p class="product-stock">库存：${p.stock}</p>
            <div style="display:flex;gap:10px;margin-top:10px;">
                <button class="btn-primary" onclick="showProductForm(${p.id})" style="flex:1;">编辑</button>
                <button class="btn-secondary" onclick="deleteProduct(${p.id})" style="flex:1;">删除</button>
            </div>
        </div>
    `).join('');
}

async function deleteProduct(productId) {
    try {
        const res = await fetch(`${API_BASE}/admin/products/${productId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (res.ok) {
            alert('商品已删除');
            loadProducts();
            loadManageProducts();
        } else {
            alert('删除失败，请重试');
        }
    } catch (error) {
        console.error('删除商品失败:', error);
        alert('删除失败，请检查网络连接');
    }
}

window.switchAuthMode = switchAuthMode;
window.switchTab = switchTab;
window.addToCart = addToCart;
window.updateCartQuantity = updateCartQuantity;
window.removeFromCart = removeFromCart;
window.checkout = checkout;
window.closeCheckoutModal = closeCheckoutModal;
window.viewProduct = viewProduct;
window.closeProductModal = closeProductModal;
window.showProductForm = showProductForm;
window.closeProductForm = closeProductForm;
window.deleteProduct = deleteProduct;
