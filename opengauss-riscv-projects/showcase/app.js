// 应用配置数据
const apps = [
    {
        id: 'messageboard',
        name: '社区留言板',
        icon: '💬',
        description: '基于 FastAPI + Vue 3 的现代化留言板系统，支持用户注册、留言发表、评论互动等功能。展示 openGauss 在 RISC-V 架构上的应用。',
        tech: ['FastAPI', 'Vue 3', 'openGauss', 'RISC-V'],
        path: '/messageboard',
        apiPath: '/messageboard',
        status: 'checking'
    },
    {
        id: 'petclinic',
        name: '宠物诊疗系统',
        icon: '🏥',
        description: 'Spring PetClinic 应用，展示 Spring Boot + Angular 与 openGauss 的集成。经典的宠物医院管理系统示例。',
        tech: ['Spring Boot', 'Angular', 'openGauss', 'RISC-V'],
        path: '/petclinic',
        status: 'checking'
    },
    {
        id: 'galaxy2048',
        name: '2048 银河挑战',
        icon: '🪐',
        description: '开源 2048 排行小游戏，使用 FastAPI + openGauss 存储每日挑战成绩，前端轻量化适配 SG2042 场景。',
        tech: ['FastAPI', '静态前端', 'openGauss', 'Docker'],
        path: '/games/2048',
        apiPath: '/games/api',
        status: 'checking'
    },
    {
        id: 'go-todo',
        name: 'Go 待办清单',
        icon: '✅',
        description: '基于 Go + Gin + GORM 的待办事项管理系统，支持用户注册登录、待办 CRUD、优先级管理。展示 Go 与 openGauss 的完美集成。',
        tech: ['Go', 'Gin', 'GORM', 'openGauss', 'JWT'],
        path: '/go-todo',
        apiPath: '/go-todo/api',
        status: 'checking'
    },
    {
        id: 'go-library',
        name: 'Go 图书管理',
        icon: '📚',
        description: '基于 Go + Gin + openGauss 的图书借阅管理系统，支持图书管理、借还书、续借、统计报表等功能。',
        tech: ['Go', 'Gin', 'GORM', 'openGauss', 'JWT'],
        path: '/go-library',
        apiPath: '/go-library/api',
        status: 'checking'
    },
    {
        id: 'java-shop',
        name: 'Java 在线商城',
        icon: '🛍️',
        description: '基于 Spring Boot + MyBatis + openGauss 的在线购物系统，支持商品浏览、购物车、订单管理等电商核心功能。',
        tech: ['Java', 'Spring Boot', 'MyBatis', 'openGauss', 'JWT'],
        path: '/java-shop',
        apiPath: '/java-shop/api',
        status: 'checking'
    }
];

// 渲染应用卡片
function renderApps() {
    const grid = document.getElementById('appsGrid');
    if (!grid) {
        console.error('找不到 appsGrid 元素');
        return;
    }
    
    console.log('渲染应用列表，共', apps.length, '个应用');
    grid.innerHTML = apps.map(app => {
        console.log('渲染应用:', app.name);
        return `
        <div class="app-card" data-app-id="${app.id}">
            <div class="app-card-header">
                <div class="app-icon">${app.icon}</div>
                <div class="app-title">
                    <h3>${app.name}</h3>
                    <span class="app-badge">RISC-V</span>
                </div>
            </div>
            <div class="app-description">${app.description}</div>
            <div class="app-tech">
                ${app.tech.map(tech => `<span class="tech-tag">${tech}</span>`).join('')}
            </div>
            <div class="app-footer">
                <div class="app-status">
                    <span class="status-dot ${app.status}"></span>
                    <span class="status-text" id="status-${app.id}">检查中...</span>
                </div>
                <a href="${app.path}" 
                   class="btn-visit" 
                   id="btn-${app.id}"
                   target="_blank">
                    访问应用 →
                </a>
            </div>
        </div>
    `;
    }).join('');
    
    console.log('应用卡片渲染完成，开始检查状态');
    // 检查每个应用的状态
    apps.forEach(app => checkAppStatus(app));
}

// 检查应用状态
async function checkAppStatus(app) {
    const statusDot = document.querySelector(`[data-app-id="${app.id}"] .status-dot`);
    const statusText = document.querySelector(`#status-${app.id}`);
    const btn = document.querySelector(`#btn-${app.id}`);
    
    try {
        // 尝试访问应用的健康检查端点或首页
        let checkUrl;
        let fallbackUrl;
        
        if (app.apiPath) {
            // 如果有API路径，先检查API健康状态
            checkUrl = `${app.apiPath}/health`;
            fallbackUrl = `${app.path}/`;  // 备用检查首页
        } else {
            // 否则检查应用首页
            checkUrl = `${app.path}/`;
        }
        
        console.log(`检查应用 ${app.name} 状态: ${checkUrl}`);
        
        let response = await fetch(checkUrl, {
            method: 'GET',
            cache: 'no-cache',
            signal: AbortSignal.timeout(5000) // 5秒超时
        });
        
        console.log(`应用 ${app.name} 健康检查响应:`, response.status);
        
        // 如果主检查失败且有备用URL，尝试备用检查
        if (!response.ok && fallbackUrl) {
            console.log(`尝试备用检查: ${fallbackUrl}`);
            response = await fetch(fallbackUrl, {
                method: 'GET',
                cache: 'no-cache',
                signal: AbortSignal.timeout(5000)
            });
            console.log(`备用检查响应:`, response.status);
        }
        
        // 只有 2xx 状态码才认为服务在线
        if (response.ok) {
            // 服务在线，启用访问按钮
            updateAppStatus(app.id, 'online', '运行中', true);
        } else {
            // 4xx, 5xx 都认为服务不可用
            throw new Error(`Service returned ${response.status}`);
        }
    } catch (error) {
        console.warn(`应用 ${app.name} 状态检查失败:`, error);
        // 服务离线或不可达，禁用访问按钮
        updateAppStatus(app.id, 'offline', '服务不可用', false);
    }
}

// 更新应用状态显示
function updateAppStatus(appId, status, text, enableButton = true) {
    const card = document.querySelector(`[data-app-id="${appId}"]`);
    const statusDot = document.querySelector(`[data-app-id="${appId}"] .status-dot`);
    const statusText = document.querySelector(`#status-${appId}`);
    const btn = document.querySelector(`#btn-${appId}`);
    
    // 为卡片添加状态属性，用于 CSS 样式
    if (card) {
        card.setAttribute('data-status', status);
    }
    
    if (statusDot) {
        statusDot.className = `status-dot ${status}`;
    }
    if (statusText) {
        statusText.textContent = text;
    }
    
    // 根据服务状态控制访问按钮
    if (btn) {
        if (enableButton) {
            // 服务在线，启用按钮
            btn.style.pointerEvents = 'auto';
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
            btn.title = '点击访问应用';
            // 移除之前的点击拦截
            btn.onclick = null;
        } else {
            // 服务离线，禁用按钮并添加提示
            btn.style.pointerEvents = 'none';
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
            btn.title = '服务当前不可用，请稍后再试';
            
            // 添加点击事件阻止（双重保险）
            btn.onclick = (e) => {
                e.preventDefault();
                alert('⚠️ 该服务当前不可用\n\n请确保：\n1. SG2042 服务器正在运行\n2. 应用容器已启动\n3. frp 内网穿透正常工作\n\n稍后自动重试...');
                return false;
            };
        }
    }
}

// 定期检查应用状态（每30秒）
function startStatusChecker() {
    setInterval(() => {
        apps.forEach(app => checkAppStatus(app));
    }, 30000);
}

// 页面加载完成后初始化
function init() {
    console.log('初始化应用展示页面');
    renderApps();
    // 延迟启动状态检查，避免立即请求
    setTimeout(startStatusChecker, 2000);
}

// 复制到剪贴板功能
function copyToClipboard(element) {
    const text = element.textContent;
    const card = element.closest('.credential-card');
    
    navigator.clipboard.writeText(text).then(() => {
        // 添加复制成功效果
        card.classList.add('copied');
        const hint = card.querySelector('.copy-hint');
        const originalText = hint.textContent;
        hint.textContent = '已复制!';
        
        setTimeout(() => {
            card.classList.remove('copied');
            hint.textContent = originalText;
        }, 1500);
    }).catch(err => {
        console.error('复制失败:', err);
        // 降级方案：选中文本
        const range = document.createRange();
        range.selectNode(element);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
        alert('请按 Ctrl+C 复制');
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    // DOM 已经加载完成，立即执行
    init();
}

