// 自动检测 API 基础路径
// 如果在子路径下（如 /go-todo/），使用相对路径
// 如果在根路径下，使用绝对路径
const getBasePath = () => {
    const path = window.location.pathname;
    // 如果路径包含 /go-todo/，说明在网关后面
    if (path.includes('/go-todo')) {
        return '/go-todo/api';
    }
    // 否则直接访问后端
    return '/api';
};

const API_BASE_PATH = window.__API_BASE_PATH__ || getBasePath();
const API_BASE = `${API_BASE_PATH}/todos`;
const AUTH_BASE = `${API_BASE_PATH}/auth`;
let currentFilter = 'all';
let todos = [];
let isLoginMode = true;
let authToken = localStorage.getItem('auth_token');
let currentUser = null;

// DOM 元素
const authModal = document.getElementById('authModal');
const appContainer = document.getElementById('appContainer');
const authForm = document.getElementById('authForm');
const modalTitle = document.getElementById('modalTitle');
const registerFields = document.getElementById('registerFields');
const switchLink = document.getElementById('switchLink');
const switchText = document.getElementById('switchText');
const authSubmit = document.getElementById('authSubmit');
const currentUsername = document.getElementById('currentUsername');
const logoutBtn = document.getElementById('logoutBtn');

const todoTitle = document.getElementById('todoTitle');
const todoDesc = document.getElementById('todoDesc');
const todoPriority = document.getElementById('todoPriority');
const addBtn = document.getElementById('addTodo');
const todoList = document.getElementById('todoList');
const filterBtns = document.querySelectorAll('.filter-btn');
const clearCompletedBtn = document.getElementById('clearCompleted');
const totalCount = document.getElementById('totalCount');
const activeCount = document.getElementById('activeCount');
const completedCount = document.getElementById('completedCount');
const apiStatus = document.getElementById('apiStatus');

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    // 确保初始状态正确（登录模式）
    const regEmail = document.getElementById('regEmail');
    regEmail.removeAttribute('required');
    
    checkApiHealth();
    setupEventListeners();
    
    if (authToken) {
        // 验证 token 是否有效
        verifyToken();
    } else {
        showAuthModal();
    }
    
    setInterval(checkApiHealth, 30000);
});

// 设置事件监听
function setupEventListeners() {
    authForm.addEventListener('submit', handleAuth);
    logoutBtn.addEventListener('click', logout);
    addBtn.addEventListener('click', addTodo);
    todoTitle.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTodo();
    });
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            currentFilter = btn.dataset.filter;
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderTodos();
        });
    });
    clearCompletedBtn.addEventListener('click', clearCompleted);
}

// 切换登录/注册模式
function switchAuthMode() {
    isLoginMode = !isLoginMode;
    const regEmail = document.getElementById('regEmail');
    
    if (isLoginMode) {
        modalTitle.textContent = '登录';
        authSubmit.textContent = '登录';
        switchText.textContent = '还没有账号？';
        switchLink.textContent = '立即注册';
        registerFields.style.display = 'none';
        // 移除 required 属性，避免隐藏字段验证错误
        regEmail.removeAttribute('required');
    } else {
        modalTitle.textContent = '注册';
        authSubmit.textContent = '注册';
        switchText.textContent = '已有账号？';
        switchLink.textContent = '立即登录';
        registerFields.style.display = 'block';
        // 添加回 required 属性
        regEmail.setAttribute('required', '');
    }
}

// 显示认证模态框
function showAuthModal() {
    authModal.style.display = 'flex';
    appContainer.style.display = 'none';
}

// 关闭认证模态框
function closeAuthModal() {
    if (!authToken) {
        // 如果没有 token，不允许关闭
        return;
    }
    authModal.style.display = 'none';
}

// 处理认证（登录/注册）
async function handleAuth(e) {
    e.preventDefault();
    
    const username = document.getElementById('authUsername').value.trim();
    const password = document.getElementById('authPassword').value;
    
    if (!username || !password) {
        alert('请填写完整信息');
        return;
    }
    
    let url, data;
    
    if (isLoginMode) {
        // 登录
        url = `${AUTH_BASE}/login`;
        data = { username, password };
    } else {
        // 注册
        const email = document.getElementById('regEmail').value.trim();
        if (!email) {
            alert('请填写邮箱地址');
            return;
        }
        url = `${AUTH_BASE}/register`;
        data = { username, email, password };
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
            
            currentUsername.textContent = currentUser.username;
            authModal.style.display = 'none';
            appContainer.style.display = 'block';
            
            // 加载待办事项
            loadTodos();
        } else {
            alert(result.error || '操作失败');
        }
    } catch (error) {
        console.error('认证失败:', error);
        alert('网络错误，请重试');
    }
}

// 验证 token
async function verifyToken() {
    try {
        const res = await fetch(`${API_BASE_PATH}/user/me`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (res.ok) {
            currentUser = await res.json();
            localStorage.setItem('current_user', JSON.stringify(currentUser));
            currentUsername.textContent = currentUser.username;
            appContainer.style.display = 'block';
            loadTodos();
        } else {
            // Token 无效，清除并显示登录
            logout();
        }
    } catch (error) {
        console.error('Token 验证失败:', error);
        logout();
    }
}

// 退出登录
function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('current_user');
    todos = [];
    showAuthModal();
    authForm.reset();
    isLoginMode = true;
    switchAuthMode();
}

// 获取认证头
function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
    };
}

// 检查API健康状态
async function checkApiHealth() {
    try {
        const res = await fetch(`${API_BASE_PATH}/health`);
        if (res.ok) {
            apiStatus.textContent = 'API 在线';
            apiStatus.className = 'api-status online';
        } else {
            throw new Error('API 不可用');
        }
    } catch (error) {
        apiStatus.textContent = 'API 离线';
        apiStatus.className = 'api-status offline';
    }
}

// 加载待办事项
async function loadTodos() {
    if (!authToken) return;
    
    try {
        const res = await fetch(API_BASE, {
            headers: getAuthHeaders()
        });
        
        if (res.status === 401) {
            logout();
            return;
        }
        
        if (res.ok) {
            todos = await res.json();
            updateStats();
            renderTodos();
        }
    } catch (error) {
        console.error('加载失败:', error);
        todoList.innerHTML = '<li class="error">无法连接到服务器</li>';
    }
}

// 添加待办事项
async function addTodo() {
    if (!authToken) {
        showAuthModal();
        return;
    }
    
    const title = todoTitle.value.trim();
    if (!title) return;

    const todo = {
        title: title,
        description: todoDesc.value.trim(),
        priority: parseInt(todoPriority.value)
    };

    try {
        const res = await fetch(API_BASE, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(todo)
        });

        if (res.status === 401) {
            logout();
            return;
        }

        if (res.ok) {
            todoTitle.value = '';
            todoDesc.value = '';
            loadTodos();
        } else {
            const error = await res.json();
            alert(error.error || '添加失败');
        }
    } catch (error) {
        console.error('添加失败:', error);
        alert('添加失败，请重试');
    }
}

// 更新待办事项
async function updateTodo(id, updates) {
    if (!authToken) return;
    
    try {
        const res = await fetch(`${API_BASE}/${id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(updates)
        });

        if (res.status === 401) {
            logout();
            return;
        }

        if (res.ok) {
            loadTodos();
        }
    } catch (error) {
        console.error('更新失败:', error);
    }
}

// 删除待办事项
async function deleteTodo(id) {
    if (!authToken) return;
    if (!confirm('确定要删除这个待办事项吗？')) return;

    try {
        const res = await fetch(`${API_BASE}/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        if (res.status === 401) {
            logout();
            return;
        }

        if (res.ok) {
            loadTodos();
        }
    } catch (error) {
        console.error('删除失败:', error);
    }
}

// 清除已完成
async function clearCompleted() {
    if (!authToken) return;
    if (!confirm('确定要清除所有已完成的待办事项吗？')) return;

    try {
        const res = await fetch(API_BASE, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        if (res.status === 401) {
            logout();
            return;
        }

        if (res.ok) {
            loadTodos();
        }
    } catch (error) {
        console.error('清除失败:', error);
    }
}

// 渲染待办列表
function renderTodos() {
    let filteredTodos = todos;

    switch (currentFilter) {
        case 'active':
            filteredTodos = todos.filter(t => !t.completed);
            break;
        case 'completed':
            filteredTodos = todos.filter(t => t.completed);
            break;
        case 'high':
            filteredTodos = todos.filter(t => t.priority === 2);
            break;
    }

    if (filteredTodos.length === 0) {
        todoList.innerHTML = '<li class="empty">暂无待办事项</li>';
        return;
    }

    todoList.innerHTML = filteredTodos.map(todo => `
        <li class="todo-item ${todo.completed ? 'completed' : ''} priority-${todo.priority}">
            <div class="todo-content">
                <input type="checkbox" ${todo.completed ? 'checked' : ''} 
                       onchange="updateTodo(${todo.id}, {completed: this.checked})">
                <div class="todo-info">
                    <h3>${escapeHtml(todo.title)}</h3>
                    ${todo.description ? `<p>${escapeHtml(todo.description)}</p>` : ''}
                    <span class="todo-meta">
                        ${getPriorityLabel(todo.priority)} · 
                        ${new Date(todo.created_at).toLocaleString('zh-CN')}
                    </span>
                </div>
            </div>
            <div class="todo-actions">
                <button onclick="deleteTodo(${todo.id})">删除</button>
            </div>
        </li>
    `).join('');
}

// 更新统计
function updateStats() {
    totalCount.textContent = todos.length;
    activeCount.textContent = todos.filter(t => !t.completed).length;
    completedCount.textContent = todos.filter(t => t.completed).length;
}

// 工具函数
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getPriorityLabel(priority) {
    const labels = ['低优先级', '中优先级', '高优先级'];
    const colors = ['#4CAF50', '#FF9800', '#F44336'];
    return `<span style="color: ${colors[priority]}">${labels[priority]}</span>`;
}

// 全局函数
window.updateTodo = updateTodo;
window.deleteTodo = deleteTodo;
window.switchAuthMode = switchAuthMode;
window.closeAuthModal = closeAuthModal;

