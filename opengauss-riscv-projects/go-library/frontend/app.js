// API 配置
const API_BASE = window.__API_BASE__ || '/api';
const AUTH_BASE = window.__AUTH_BASE__ || '/api/auth';

// 全局变量
let authToken = localStorage.getItem('auth_token');
let currentUser = JSON.parse(localStorage.getItem('current_user') || 'null');
let isLoginMode = true;
let currentBooks = [];
let currentBorrowings = [];
let categories = [];

// DOM 元素
const authModal = document.getElementById('authModal');
const authForm = document.getElementById('authForm');
const modalTitle = document.getElementById('modalTitle');
const authSubmit = document.getElementById('authSubmit');
const switchText = document.getElementById('switchText');
const switchLink = document.getElementById('switchLink');
const registerFields = document.getElementById('registerFields');
const appContainer = document.getElementById('appContainer');
const currentUsername = document.getElementById('currentUsername');
const userRole = document.getElementById('userRole');
const logoutBtn = document.getElementById('logoutBtn');

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    // 移除隐藏字段的required
    document.getElementById('regEmail').removeAttribute('required');
    
    setupEventListeners();
    checkApiHealth();
    
    if (authToken && currentUser) {
        showApp();
    } else {
        showAuthModal();
    }
    
    setInterval(checkApiHealth, 30000);
});

// 设置事件监听
function setupEventListeners() {
    authForm.addEventListener('submit', handleAuth);
    logoutBtn.addEventListener('click', logout);
    
    // 标签页切换
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    
    // 搜索和筛选
    document.getElementById('searchInput').addEventListener('input', debounce(loadBooks, 300));
    document.getElementById('categoryFilter').addEventListener('change', loadBooks);
    document.getElementById('availableOnly').addEventListener('change', loadBooks);
    
    // 借阅筛选
    document.querySelectorAll('.filter-btn[data-status]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn[data-status]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadBorrowings(btn.dataset.status);
        });
    });
    
    // 图书表单提交
    const bookForm = document.getElementById('bookForm');
    if (bookForm) {
        bookForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const bookId = document.getElementById('bookId').value;
            const data = {
                isbn: document.getElementById('bookISBN').value,
                title: document.getElementById('bookTitle').value,
                author: document.getElementById('bookAuthor').value,
                publisher: document.getElementById('bookPublisher').value,
                publish_date: document.getElementById('bookPublishDate').value,
                category_id: parseInt(document.getElementById('bookCategory').value),
                total_copies: parseInt(document.getElementById('bookCopies').value) || 1,
                location: document.getElementById('bookLocation').value,
                description: document.getElementById('bookDescription').value,
                cover_url: document.getElementById('bookCover').value
            };
            
            try {
                const url = bookId ? `${API_BASE}/admin/books/${bookId}` : `${API_BASE}/admin/books`;
                const method = bookId ? 'PUT' : 'POST';
                
                const res = await fetch(url, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify(data)
                });
                
                if (res.ok) {
                    alert(bookId ? '图书更新成功！' : '图书添加成功！');
                    closeBookFormModal();
                    loadBooks();
                    loadStats();
                } else {
                    const result = await res.json();
                    alert(result.error || '操作失败');
                }
            } catch (error) {
                console.error('操作失败:', error);
                alert('网络错误，请重试');
            }
        });
    }
}

// 切换认证模式
function switchAuthMode() {
    isLoginMode = !isLoginMode;
    const regEmail = document.getElementById('regEmail');
    
    if (isLoginMode) {
        modalTitle.textContent = '登录';
        authSubmit.textContent = '登录';
        switchText.textContent = '还没有账号？';
        switchLink.textContent = '立即注册';
        registerFields.style.display = 'none';
        regEmail.removeAttribute('required');
    } else {
        modalTitle.textContent = '注册';
        authSubmit.textContent = '注册';
        switchText.textContent = '已有账号？';
        switchLink.textContent = '立即登录';
        registerFields.style.display = 'block';
        regEmail.setAttribute('required', '');
    }
}

// 认证处理
async function handleAuth(e) {
    e.preventDefault();
    
    const username = document.getElementById('authUsername').value.trim();
    const password = document.getElementById('authPassword').value;
    
    let url, data;
    
    if (isLoginMode) {
        url = `${AUTH_BASE}/login`;
        data = { username, password };
    } else {
        const email = document.getElementById('regEmail').value.trim();
        const real_name = document.getElementById('regRealName').value.trim();
        const phone = document.getElementById('regPhone').value.trim();
        
        url = `${AUTH_BASE}/register`;
        data = { username, email, password, real_name, phone };
    }
    
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await res.json();
        
        if (res.ok) {
            authToken = result.token;
            currentUser = result.user;
            localStorage.setItem('auth_token', authToken);
            localStorage.setItem('current_user', JSON.stringify(currentUser));
            showApp();
        } else {
            alert(result.error || '操作失败');
        }
    } catch (error) {
        console.error('认证失败:', error);
        alert('网络错误，请重试');
    }
}

// 显示应用
function showApp() {
    authModal.style.display = 'none';
    appContainer.style.display = 'block';
    currentUsername.textContent = currentUser.username;
    userRole.textContent = currentUser.role === 'admin' ? '管理员' : '读者';
    
    // 显示管理员功能
    if (currentUser.role === 'admin') {
        document.querySelectorAll('.admin-only').forEach(el => {
            el.style.display = el.tagName === 'BUTTON' ? 'block' : 'flex';
        });
    }
    
    loadCategories();
    loadStats();
    loadBooks();
}

// 显示认证模态框
function showAuthModal() {
    authModal.style.display = 'flex';
    appContainer.style.display = 'none';
}

// 关闭认证模态框
function closeAuthModal() {
    authModal.style.display = 'none';
}

// 退出登录
function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('current_user');
    showAuthModal();
    location.reload();
}

// 加载分类
async function loadCategories() {
    if (!authToken) return; // 未登录时不加载
    
    try {
        const res = await fetch(`${API_BASE}/categories`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (res.ok) {
            categories = await res.json();
            updateCategorySelects();
        } else if (res.status === 401) {
            // Token 无效，重新登录
            logout();
        }
    } catch (error) {
        console.error('加载分类失败:', error);
    }
}

// 更新分类下拉框
function updateCategorySelects() {
    const filter = document.getElementById('categoryFilter');
    const formSelect = document.getElementById('bookCategory');
    
    categories.forEach(cat => {
        filter.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
        if (formSelect) {
            formSelect.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
        }
    });
}

// 加载统计
async function loadStats() {
    try {
        const res = await fetch(`${API_BASE}/stats`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (res.ok) {
            const stats = await res.json();
            document.getElementById('totalBooks').textContent = stats.total_books || 0;
            document.getElementById('totalBorrowed').textContent = stats.total_borrowed || 0;
            document.getElementById('totalAvailable').textContent = stats.total_available || 0;
            document.getElementById('activeBorrowings').textContent = stats.active_borrowings || 0;
        }
    } catch (error) {
        console.error('加载统计失败:', error);
    }
}

// 加载图书
async function loadBooks() {
    const search = document.getElementById('searchInput').value;
    const categoryId = document.getElementById('categoryFilter').value;
    const availableOnly = document.getElementById('availableOnly').checked;
    
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (categoryId) params.append('category_id', categoryId);
    if (availableOnly) params.append('available', 'true');
    
    try {
        const res = await fetch(`${API_BASE}/books?${params}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (res.ok) {
            currentBooks = await res.json();
            renderBooks();
        }
    } catch (error) {
        console.error('加载图书失败:', error);
    }
}

// 渲染图书列表
function renderBooks() {
    const container = document.getElementById('bookList');
    
    if (currentBooks.length === 0) {
        container.innerHTML = '<div style="background:white;border-radius:10px;padding:40px;text-align:center;"><p style="color:#666;font-size:16px;margin:0;">📚 暂无图书</p></div>';
        return;
    }
    
    container.innerHTML = currentBooks.map(book => `
        <div class="book-card" onclick="showBookDetail(${book.id})">
            <h3>${escapeHtml(book.title)}</h3>
            <p class="book-info">📖 作者：${escapeHtml(book.author)}</p>
            <p class="book-info">🏷️ 分类：${book.category ? book.category.name : '未分类'}</p>
            <p class="book-info">📍 位置：${book.location || '未设置'}</p>
            <p class="book-info ${book.available_copies > 0 ? 'status-available' : 'status-unavailable'}">
                📚 可借：${book.available_copies}/${book.total_copies}
            </p>
            ${book.available_copies > 0 ? `
                <div class="book-actions">
                    <button class="btn-primary" onclick="event.stopPropagation(); borrowBook(${book.id})">借阅</button>
                </div>
            ` : ''}
        </div>
    `).join('');
}

// 借书
async function borrowBook(bookId) {
    const days = prompt('请输入借阅天数（1-90天）:', '30');
    if (!days || days < 1 || days > 90) {
        alert('借阅天数必须在1-90天之间');
        return;
    }
    
    try {
        const res = await fetch(`${API_BASE}/borrowings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ book_id: parseInt(bookId), days: parseInt(days) })
        });
        
        const result = await res.json();
        
        if (res.ok) {
            alert('借阅成功！');
            loadBooks();
            loadStats();
        } else {
            alert(result.error || '借阅失败');
        }
    } catch (error) {
        console.error('借阅失败:', error);
        alert('网络错误，请重试');
    }
}

// 加载借阅记录
async function loadBorrowings(status = '') {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    
    try {
        const res = await fetch(`${API_BASE}/borrowings?${params}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (res.ok) {
            currentBorrowings = await res.json();
            renderBorrowings();
        }
    } catch (error) {
        console.error('加载借阅记录失败:', error);
    }
}

// 渲染借阅列表
function renderBorrowings() {
    const container = document.getElementById('borrowingList');
    
    if (currentBorrowings.length === 0) {
        container.innerHTML = '<div style="background:white;border-radius:10px;padding:40px;text-align:center;"><p style="color:#666;font-size:16px;margin:0;">📖 暂无借阅记录</p></div>';
        return;
    }
    
    container.innerHTML = currentBorrowings.map(b => `
        <div class="borrowing-item">
            <h3>${escapeHtml(b.book.title)}</h3>
            <p>📖 作者：${escapeHtml(b.book.author)}</p>
            <p>📅 借阅日期：${formatDate(b.borrow_date)}</p>
            <p>📅 应还日期：${formatDate(b.due_date)}</p>
            ${b.return_date ? `<p>✅ 归还日期：${formatDate(b.return_date)}</p>` : ''}
            <p>🔄 续借次数：${b.renew_count}/2</p>
            <p class="status-${b.status}">状态：${getStatusText(b.status)}</p>
            ${b.status === 'borrowed' ? `
                <div class="book-actions">
                    <button class="btn-primary" onclick="returnBook(${b.id})">归还</button>
                    ${b.renew_count < 2 ? `
                        <button class="btn-secondary" onclick="renewBook(${b.id})">续借</button>
                    ` : ''}
                </div>
            ` : ''}
        </div>
    `).join('');
}

// 还书
async function returnBook(id) {
    if (!confirm('确认归还此书？')) return;
    
    try {
        const res = await fetch(`${API_BASE}/borrowings/${id}/return`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (res.ok) {
            alert('归还成功！');
            loadBorrowings();
            loadBooks();
            loadStats();
        } else {
            const result = await res.json();
            alert(result.error || '归还失败');
        }
    } catch (error) {
        console.error('归还失败:', error);
        alert('网络错误，请重试');
    }
}

// 续借
async function renewBook(id) {
    try {
        const res = await fetch(`${API_BASE}/borrowings/${id}/renew`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (res.ok) {
            alert('续借成功！延长14天');
            loadBorrowings();
        } else {
            const result = await res.json();
            alert(result.error || '续借失败');
        }
    } catch (error) {
        console.error('续借失败:', error);
        alert('网络错误，请重试');
    }
}

// 切换标签页
function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    document.getElementById(`${tab}Tab`).classList.add('active');
    
    if (tab === 'books') {
        loadBooks();
    } else if (tab === 'borrowings') {
        loadBorrowings();
    } else if (tab === 'manage') {
        loadBooks();
    }
}

// 显示添加图书表单
function showAddBookForm() {
    document.getElementById('bookFormTitle').textContent = '添加图书';
    document.getElementById('bookForm').reset();
    document.getElementById('bookId').value = '';
    document.getElementById('bookFormModal').classList.add('show');
}

// 关闭图书表单
function closeBookFormModal() {
    document.getElementById('bookFormModal').classList.remove('show');
}

// 显示图书详情
function showBookDetail(bookId) {
    const book = currentBooks.find(b => b.id === bookId);
    if (!book) return;
    
    const modal = document.getElementById('bookModal');
    const body = document.getElementById('bookModalBody');
    
    body.innerHTML = `
        <div style="padding:20px;">
            <h3>${escapeHtml(book.title)}</h3>
            <p><strong>ISBN:</strong> ${book.isbn || '无'}</p>
            <p><strong>作者:</strong> ${escapeHtml(book.author)}</p>
            <p><strong>出版社:</strong> ${book.publisher || '未知'}</p>
            <p><strong>分类:</strong> ${book.category ? book.category.name : '未分类'}</p>
            <p><strong>位置:</strong> ${book.location || '未设置'}</p>
            <p><strong>库存:</strong> 可借 ${book.available_copies} / 总数 ${book.total_copies}</p>
            ${book.description ? `<p><strong>简介:</strong> ${escapeHtml(book.description)}</p>` : ''}
            ${book.available_copies > 0 ? `
                <button class="btn-primary" onclick="closeBookModal(); borrowBook(${book.id})">立即借阅</button>
            ` : '<p style="color:#f44336;">暂无可借副本</p>'}
        </div>
    `;
    
    modal.classList.add('show');
}

// 关闭图书详情
function closeBookModal() {
    document.getElementById('bookModal').classList.remove('show');
}

// 健康检查
async function checkApiHealth() {
    try {
        const res = await fetch(`${API_BASE}/health`);
        const status = document.getElementById('apiStatus');
        
        if (res.ok) {
            status.textContent = 'API 连接正常';
            status.style.background = 'rgba(76, 175, 80, 0.3)';
        } else {
            status.textContent = 'API 连接异常';
            status.style.background = 'rgba(244, 67, 54, 0.3)';
        }
    } catch (error) {
        const status = document.getElementById('apiStatus');
        status.textContent = 'API 无法连接';
        status.style.background = 'rgba(244, 67, 54, 0.3)';
    }
}

// 工具函数
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('zh-CN');
}

function getStatusText(status) {
    const map = {
        'borrowed': '借阅中',
        'returned': '已归还',
        'overdue': '已逾期'
    };
    return map[status] || status;
}

// 全局函数
window.switchAuthMode = switchAuthMode;
window.closeAuthModal = closeAuthModal;
window.borrowBook = borrowBook;
window.returnBook = returnBook;
window.renewBook = renewBook;
window.switchTab = switchTab;
window.showAddBookForm = showAddBookForm;
window.closeBookFormModal = closeBookFormModal;
window.showBookDetail = showBookDetail;
window.closeBookModal = closeBookModal;
