<template>
  <div class="app">
    <!-- 头部 -->
    <header class="header">
      <div class="container">
        <div class="header-content">
          <div class="logo">
            <h1>🗨️ openGauss RISC-V 留言板</h1>
            <p class="slogan">轻量级，高性能，开源芯</p>
          </div>
          <div class="header-actions">
            <div class="tech-stack">
              <span class="badge">openGauss 6.0.0</span>
              <span class="badge">RISC-V 64-bit</span>
            </div>
            <div class="auth-buttons">
              <button v-if="!user" @click="showLoginModal = true" class="btn btn-outline">登录</button>
              <button v-if="!user" @click="showRegisterModal = true" class="btn btn-primary">注册</button>
              <div v-if="user" class="user-info">
                <span class="user-name">👤 {{ user.username }}</span>
                <button @click="logout" class="btn btn-outline btn-sm">退出</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- 统计面板 -->
    <section class="stats-section">
      <div class="container">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">📝</div>
            <div class="stat-value">{{ stats.total_messages || 0 }}</div>
            <div class="stat-label">总留言数</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">❤️</div>
            <div class="stat-value">{{ stats.total_likes || 0 }}</div>
            <div class="stat-label">总点赞数</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">💬</div>
            <div class="stat-value">{{ stats.total_comments || 0 }}</div>
            <div class="stat-label">总评论数</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">🎉</div>
            <div class="stat-value">{{ stats.today_messages || 0 }}</div>
            <div class="stat-label">今日新增</div>
          </div>
        </div>
      </div>
    </section>

    <!-- 主要内容区 -->
    <main class="main-content">
      <div class="container">
        <div class="content-grid">
          <!-- 左侧：发表留言 -->
          <aside class="sidebar">
            <div class="card">
              <h2 class="card-title">✍️ 发表留言</h2>
              <form @submit.prevent="submitMessage" class="message-form">
                <div class="form-group">
                  <input 
                    v-model="newMessage.username" 
                    type="text" 
                    placeholder="您的昵称" 
                    required
                    maxlength="50"
                    class="form-input"
                  >
                </div>
                <div class="form-group">
                  <input 
                    v-model="newMessage.email" 
                    type="email" 
                    placeholder="邮箱（可选）" 
                    class="form-input"
                  >
                </div>
                <div class="form-group">
                  <textarea 
                    v-model="newMessage.content" 
                    placeholder="写下您的留言..." 
                    required
                    maxlength="5000"
                    rows="6"
                    class="form-textarea"
                  ></textarea>
                  <div class="char-count">{{ newMessage.content.length }}/5000</div>
                </div>
                <button type="submit" class="btn btn-primary" :disabled="submitting">
                  {{ submitting ? '发送中...' : '🚀 发表留言' }}
                </button>
              </form>
            </div>

            <!-- 排序选择 -->
            <div class="card" style="margin-top: 1.5rem;">
              <h3 class="card-title">📊 排序方式</h3>
              <div class="sort-buttons">
                <button 
                  @click="changeSort('created_at')" 
                  :class="['btn-sort', { active: sortBy === 'created_at' }]"
                >
                  ⏰ 最新
                </button>
                <button 
                  @click="changeSort('likes')" 
                  :class="['btn-sort', { active: sortBy === 'likes' }]"
                >
                  🔥 最热
                </button>
              </div>
            </div>
          </aside>

          <!-- 右侧：留言列表 -->
          <div class="messages-section">
            <div class="messages-header">
              <h2>💬 留言列表</h2>
              <button @click="refreshMessages" class="btn-refresh" title="刷新">
                🔄
              </button>
            </div>

            <!-- 加载状态 -->
            <div v-if="loading" class="loading-state">
              <div class="spinner"></div>
              <p>加载中...</p>
            </div>

            <!-- 错误状态 -->
            <div v-else-if="error" class="error-state">
              <p>❌ {{ error }}</p>
              <button @click="refreshMessages" class="btn-secondary">重试</button>
            </div>

            <!-- 留言列表 -->
            <div v-else class="messages-list">
              <div v-if="messages.length === 0" class="empty-state">
                <p>📭 还没有留言，快来发表第一条吧！</p>
              </div>
              
              <article 
                v-for="message in messages" 
                :key="message.id" 
                class="message-card"
              >
                <div class="message-header">
                  <div class="message-author">
                    <div class="avatar">{{ message.username.charAt(0) }}</div>
                    <div>
                      <div class="author-name">{{ message.username }}</div>
                      <div class="message-time">{{ formatTime(message.created_at) }}</div>
                    </div>
                  </div>
                </div>
                <div class="message-content">
                  {{ message.content }}
                </div>
                <div class="message-footer">
                  <button 
                    @click="likeMessage(message.id, message)" 
                    class="btn-like"
                    :class="{ liked: message.justLiked }"
                  >
                    <span class="like-icon">{{ message.justLiked ? '❤️' : '🤍' }}</span>
                    <span class="like-count">{{ message.likes }}</span>
                  </button>
                  <button 
                    @click="toggleComments(message.id)" 
                    class="btn-comment"
                  >
                    💬 {{ message.comment_count || 0 }} 条评论
                  </button>
                </div>

                <!-- 评论区域 -->
                <div v-if="message.showComments" class="comments-section">
                  <!-- 评论列表 -->
                  <div v-if="message.comments && message.comments.length > 0" class="comments-list">
                    <div v-for="comment in message.comments" :key="comment.id" class="comment-item">
                      <div class="comment-header">
                        <div class="comment-author">{{ comment.username }}</div>
                        <div class="comment-time">{{ formatTime(comment.created_at) }}</div>
                      </div>
                      <div class="comment-content">{{ comment.content }}</div>
                    </div>
                  </div>

                  <!-- 发表评论表单 -->
                  <div class="comment-form">
                    <form @submit.prevent="submitComment(message.id)" class="comment-submit-form">
                      <div class="form-group">
                        <input 
                          v-model="newComment.username" 
                          type="text" 
                          placeholder="您的昵称" 
                          required
                          maxlength="50"
                          class="form-input"
                        >
                      </div>
                      <div class="form-group">
                        <textarea 
                          v-model="newComment.content" 
                          placeholder="写下您的评论..." 
                          required
                          maxlength="1000"
                          rows="3"
                          class="form-textarea"
                        ></textarea>
                        <div class="char-count">{{ newComment.content.length }}/1000</div>
                      </div>
                      <button type="submit" class="btn btn-primary btn-sm" :disabled="submittingComment">
                        {{ submittingComment ? '发送中...' : '💬 发表评论' }}
                      </button>
                    </form>
                  </div>
                </div>
              </article>
            </div>

            <!-- 加载更多 -->
            <div v-if="messages.length > 0 && hasMore" class="load-more">
              <button @click="loadMore" class="btn-secondary" :disabled="loadingMore">
                {{ loadingMore ? '加载中...' : '加载更多' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- 页脚 -->
    <footer class="footer">
      <div class="container">
        <p>
          基于 <strong>openGauss 6.0.0-riscv64</strong> 数据库 | 
          运行在 <strong>RISC-V</strong> 架构 | 
          <a href="https://github.com/zhuwei290/plct" target="_blank">git仓库</a>
        </p>
        <p class="copyright">
          由 openGauss RISC-V SIG 提供技术支持 | 
          <a href="https://gitee.com/opengauss" target="_blank">开源地址</a>
        </p>
      </div>
    </footer>

    <!-- 登录模态框 -->
    <div v-if="showLoginModal" class="modal-overlay" @click="showLoginModal = false">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>🔐 用户登录</h3>
          <button @click="showLoginModal = false" class="btn-close">×</button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="login" class="auth-form">
            <div class="form-group">
              <input 
                v-model="loginForm.username" 
                type="text" 
                placeholder="用户名" 
                required
                class="form-input"
              >
            </div>
            <div class="form-group">
              <input 
                v-model="loginForm.password" 
                type="password" 
                placeholder="密码" 
                required
                class="form-input"
              >
            </div>
            <button type="submit" class="btn btn-primary" :disabled="submittingAuth">
              {{ submittingAuth ? '登录中...' : '登录' }}
            </button>
          </form>
        </div>
      </div>
    </div>

    <!-- 注册模态框 -->
    <div v-if="showRegisterModal" class="modal-overlay" @click="showRegisterModal = false">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>📝 用户注册</h3>
          <button @click="showRegisterModal = false" class="btn-close">×</button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="register" class="auth-form">
            <div class="form-group">
              <input 
                v-model="registerForm.username" 
                type="text" 
                placeholder="用户名" 
                required
                maxlength="50"
                class="form-input"
              >
            </div>
            <div class="form-group">
              <input 
                v-model="registerForm.email" 
                type="email" 
                placeholder="邮箱" 
                required
                class="form-input"
              >
            </div>
            <div class="form-group">
              <input 
                v-model="registerForm.password" 
                type="password" 
                placeholder="密码" 
                required
                minlength="6"
                class="form-input"
              >
            </div>
            <div class="form-group">
              <input 
                v-model="registerForm.confirmPassword" 
                type="password" 
                placeholder="确认密码" 
                required
                class="form-input"
              >
            </div>
            <button type="submit" class="btn btn-primary" :disabled="submittingAuth">
              {{ submittingAuth ? '注册中...' : '注册' }}
            </button>
          </form>
        </div>
      </div>
    </div>

    <!-- 提示消息 -->
    <div v-if="toast.show" class="toast" :class="toast.type">
      {{ toast.message }}
    </div>
  </div>
</template>

<script>
import { ref, onMounted, reactive } from 'vue'
import axios from 'axios'

export default {
  name: 'App',
  setup() {
    // 状态管理
    const messages = ref([])
    const stats = ref({})
    const loading = ref(true)
    const error = ref(null)
    const submitting = ref(false)
    const loadingMore = ref(false)
    const sortBy = ref('created_at')
    const offset = ref(0)
    const hasMore = ref(true)
    const limit = 20

    // 用户认证
    const user = ref(null)
    const showLoginModal = ref(false)
    const showRegisterModal = ref(false)
    const submittingAuth = ref(false)

    // 新留言表单
    const newMessage = reactive({
      username: '',
      content: '',
      email: ''
    })

    // 新评论表单
    const newComment = reactive({
      username: '',
      content: ''
    })
    const submittingComment = ref(false)

    // 登录表单
    const loginForm = reactive({
      username: '',
      password: ''
    })

    // 注册表单
    const registerForm = reactive({
      username: '',
      email: '',
      password: '',
      confirmPassword: ''
    })

    // Toast 提示
    const toast = reactive({
      show: false,
      message: '',
      type: 'success'
    })

    // 显示提示
    const showToast = (message, type = 'success') => {
      toast.message = message
      toast.type = type
      toast.show = true
      setTimeout(() => {
        toast.show = false
      }, 3000)
    }

    // 获取留言列表
    const fetchMessages = async (append = false) => {
      try {
        if (!append) {
          loading.value = true
          offset.value = 0
        } else {
          loadingMore.value = true
        }
        
        error.value = null
        
        const response = await axios.get('/api/messages', {
          params: {
            limit,
            offset: offset.value,
            order_by: sortBy.value
          }
        })
        
        const newMessages = response.data
        
        if (append) {
          messages.value = [...messages.value, ...newMessages]
        } else {
          messages.value = newMessages
        }
        
        hasMore.value = newMessages.length === limit
        
      } catch (err) {
        error.value = err.response?.data?.detail || '加载失败，请重试'
        console.error('获取留言失败:', err)
      } finally {
        loading.value = false
        loadingMore.value = false
      }
    }

    // 获取统计信息
    const fetchStats = async () => {
      try {
        const response = await axios.get('/api/stats')
        stats.value = response.data
      } catch (err) {
        console.error('获取统计失败:', err)
      }
    }

    // 发表留言
    const submitMessage = async () => {
      if (!newMessage.username.trim() || !newMessage.content.trim()) {
        showToast('请填写必填项', 'error')
        return
      }
      
      submitting.value = true
      
      try {
        await axios.post('/api/messages', {
          username: newMessage.username.trim(),
          content: newMessage.content.trim(),
          email: newMessage.email.trim() || null
        })
        
        showToast('✅ 留言发表成功！', 'success')
        
        // 清空表单，但保留已登录用户的用户名
        if (!user.value) {
          newMessage.username = ''
        }
        newMessage.content = ''
        newMessage.email = ''
        
        // 刷新列表
        await fetchMessages()
        await fetchStats()
        
      } catch (err) {
        showToast(err.response?.data?.detail || '发表失败，请重试', 'error')
        console.error('发表留言失败:', err)
      } finally {
        submitting.value = false
      }
    }

    // 点赞
    const likeMessage = async (messageId, message) => {
      try {
        const response = await axios.post(`/api/messages/${messageId}/like`)
        message.likes = response.data.likes
        message.justLiked = true
        
        // 更新统计
        stats.value.total_likes = (stats.value.total_likes || 0) + 1
        
        setTimeout(() => {
          message.justLiked = false
        }, 1000)
        
      } catch (err) {
        showToast('点赞失败', 'error')
        console.error('点赞失败:', err)
      }
    }

    // 切换排序
    const changeSort = async (newSortBy) => {
      if (sortBy.value === newSortBy) return
      sortBy.value = newSortBy
      offset.value = 0
      await fetchMessages()
    }

    // 刷新
    const refreshMessages = async () => {
      offset.value = 0
      await Promise.all([fetchMessages(), fetchStats()])
      showToast('🔄 刷新成功', 'success')
    }

    // 加载更多
    const loadMore = async () => {
      offset.value += limit
      await fetchMessages(true)
    }

    // 切换评论显示
    const toggleComments = async (messageId) => {
      const message = messages.value.find(m => m.id === messageId)
      if (!message) return

      if (!message.showComments) {
        // 显示评论，加载评论数据
        try {
          const response = await axios.get(`/api/messages/${messageId}`)
          message.comments = response.data.comments || []
          message.showComments = true
        } catch (err) {
          showToast('加载评论失败', 'error')
          console.error('加载评论失败:', err)
        }
      } else {
        // 隐藏评论
        message.showComments = false
      }
    }

    // 提交评论
    const submitComment = async (messageId) => {
      if (!newComment.username.trim() || !newComment.content.trim()) {
        showToast('请填写必填项', 'error')
        return
      }

      submittingComment.value = true

      try {
        await axios.post(`/api/messages/${messageId}/comments`, {
          username: newComment.username.trim(),
          content: newComment.content.trim()
        })

        showToast('✅ 评论发表成功！', 'success')

        // 清空表单
        newComment.username = ''
        newComment.content = ''

        // 刷新评论列表
        const message = messages.value.find(m => m.id === messageId)
        if (message && message.showComments) {
          const response = await axios.get(`/api/messages/${messageId}`)
          message.comments = response.data.comments || []
          message.comment_count = message.comments.length
        }

        // 更新统计
        await fetchStats()

      } catch (err) {
        showToast(err.response?.data?.detail || '发表评论失败，请重试', 'error')
        console.error('发表评论失败:', err)
      } finally {
        submittingComment.value = false
      }
    }

    // 用户登录
    const login = async () => {
      if (!loginForm.username.trim() || !loginForm.password.trim()) {
        showToast('请填写用户名和密码', 'error')
        return
      }

      submittingAuth.value = true

      try {
        const response = await axios.post('/api/auth/login', {
          username: loginForm.username.trim(),
          password: loginForm.password.trim()
        })

        user.value = response.data.user
        localStorage.setItem('user', JSON.stringify(user.value))
        
        // 自动填充用户名到留言和评论表单
        newMessage.username = user.value.username
        newComment.username = user.value.username
        
        showToast('✅ 登录成功！', 'success')
        showLoginModal.value = false

        // 清空登录表单
        loginForm.username = ''
        loginForm.password = ''

      } catch (err) {
        showToast(err.response?.data?.detail || '登录失败，请重试', 'error')
        console.error('登录失败:', err)
      } finally {
        submittingAuth.value = false
      }
    }

    // 用户注册
    const register = async () => {
      if (!registerForm.username.trim() || !registerForm.email.trim() || 
          !registerForm.password.trim() || !registerForm.confirmPassword.trim()) {
        showToast('请填写所有必填项', 'error')
        return
      }

      if (registerForm.password !== registerForm.confirmPassword) {
        showToast('两次输入的密码不一致', 'error')
        return
      }

      if (registerForm.password.length < 6) {
        showToast('密码长度至少6位', 'error')
        return
      }

      submittingAuth.value = true

      try {
        await axios.post('/api/auth/register', {
          username: registerForm.username.trim(),
          email: registerForm.email.trim(),
          password: registerForm.password.trim()
        })

        showToast('✅ 注册成功！请登录', 'success')
        showRegisterModal.value = false
        showLoginModal.value = true

        // 清空表单
        registerForm.username = ''
        registerForm.email = ''
        registerForm.password = ''
        registerForm.confirmPassword = ''

      } catch (err) {
        showToast(err.response?.data?.detail || '注册失败，请重试', 'error')
        console.error('注册失败:', err)
      } finally {
        submittingAuth.value = false
      }
    }

    // 用户退出
    const logout = () => {
      user.value = null
      localStorage.removeItem('user')
      
      // 清空表单中的用户名
      newMessage.username = ''
      newComment.username = ''
      
      showToast('已退出登录', 'success')
    }

    // 格式化时间
    const formatTime = (timestamp) => {
      const date = new Date(timestamp)
      const now = new Date()
      const diff = now - date
      
      const minutes = Math.floor(diff / 60000)
      const hours = Math.floor(diff / 3600000)
      const days = Math.floor(diff / 86400000)
      
      if (minutes < 1) return '刚刚'
      if (minutes < 60) return `${minutes} 分钟前`
      if (hours < 24) return `${hours} 小时前`
      if (days < 7) return `${days} 天前`
      
      return date.toLocaleDateString('zh-CN')
    }

    // 初始化
    onMounted(async () => {
      // 从localStorage加载用户信息
      const savedUser = localStorage.getItem('user')
      if (savedUser) {
        try {
          user.value = JSON.parse(savedUser)
          // 自动填充用户名到表单
          newMessage.username = user.value.username
        } catch (e) {
          console.error('加载用户信息失败:', e)
          localStorage.removeItem('user')
        }
      }
      
      await Promise.all([fetchMessages(), fetchStats()])
    })

    return {
      messages,
      stats,
      loading,
      error,
      submitting,
      loadingMore,
      sortBy,
      hasMore,
      newMessage,
      newComment,
      submittingComment,
      user,
      showLoginModal,
      showRegisterModal,
      submittingAuth,
      loginForm,
      registerForm,
      toast,
      submitMessage,
      likeMessage,
      changeSort,
      refreshMessages,
      loadMore,
      toggleComments,
      submitComment,
      login,
      register,
      logout,
      formatTime
    }
  }
}
</script>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

/* 头部 */
.header {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  padding: 1.5rem 0;
  color: white;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.logo h1 {
  font-size: 1.8rem;
  margin-bottom: 0.25rem;
}

.slogan {
  font-size: 0.9rem;
  opacity: 0.9;
  font-style: italic;
}

.tech-stack {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.badge {
  background: rgba(255, 255, 255, 0.2);
  padding: 0.4rem 0.8rem;
  border-radius: 20px;
  font-size: 0.85rem;
  backdrop-filter: blur(10px);
}

/* 统计面板 */
.stats-section {
  padding: 2rem 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.stat-card {
  background: rgba(255, 255, 255, 0.95);
  padding: 1.5rem;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s;
}

.stat-card:hover {
  transform: translateY(-5px);
}

.stat-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.stat-value {
  font-size: 2rem;
  font-weight: bold;
  color: #667eea;
  margin-bottom: 0.25rem;
}

.stat-label {
  color: #666;
  font-size: 0.9rem;
}

/* 主内容区 */
.main-content {
  flex: 1;
  padding: 2rem 0;
}

.content-grid {
  display: grid;
  grid-template-columns: 350px 1fr;
  gap: 2rem;
}

@media (max-width: 968px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
}

/* 卡片 */
.card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.card-title {
  font-size: 1.2rem;
  margin-bottom: 1rem;
  color: #333;
}

/* 表单 */
.message-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  position: relative;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 0.95rem;
  transition: border-color 0.3s;
  font-family: inherit;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #667eea;
}

.form-textarea {
  resize: vertical;
  min-height: 120px;
}

.char-count {
  position: absolute;
  bottom: 0.5rem;
  right: 0.75rem;
  font-size: 0.75rem;
  color: #999;
}

/* 按钮 */
.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: #f0f0f0;
  color: #333;
}

.btn-secondary:hover {
  background: #e0e0e0;
}

/* 排序按钮 */
.sort-buttons {
  display: flex;
  gap: 0.5rem;
}

.btn-sort {
  flex: 1;
  padding: 0.6rem;
  border: 2px solid #e0e0e0;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 0.9rem;
}

.btn-sort:hover {
  border-color: #667eea;
}

.btn-sort.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: transparent;
}

/* 留言区域 */
.messages-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  color: white;
}

.btn-refresh {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1.2rem;
  transition: all 0.3s;
}

.btn-refresh:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: rotate(180deg);
}

/* 留言卡片 */
.messages-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.message-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s, box-shadow 0.3s;
}

.message-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.message-author {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 1.1rem;
}

.author-name {
  font-weight: 600;
  color: #333;
}

.message-time {
  font-size: 0.85rem;
  color: #999;
}

.message-content {
  color: #444;
  line-height: 1.6;
  margin-bottom: 1rem;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.message-footer {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.btn-like {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.4rem 0.8rem;
  border: 2px solid #e0e0e0;
  background: white;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 0.9rem;
}

.btn-like:hover {
  border-color: #ff6b6b;
  transform: scale(1.05);
}

.btn-like.liked {
  border-color: #ff6b6b;
  background: #fff5f5;
  animation: pulse 0.5s;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.like-count {
  font-weight: 600;
  color: #ff6b6b;
}

.comment-count {
  font-size: 0.9rem;
  color: #999;
}

/* 评论功能样式 */
.btn-comment {
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  font-size: 0.9rem;
  padding: 0.5rem;
  border-radius: 6px;
  transition: all 0.2s;
}

.btn-comment:hover {
  background: #f0f0f0;
  color: #333;
}

.comments-section {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #eee;
}

.comments-list {
  margin-bottom: 1rem;
}

.comment-item {
  background: #f8f9fa;
  padding: 0.75rem;
  border-radius: 8px;
  margin-bottom: 0.5rem;
}

.comment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.comment-author {
  font-weight: 600;
  color: #333;
  font-size: 0.9rem;
}

.comment-time {
  font-size: 0.8rem;
  color: #999;
}

.comment-content {
  color: #555;
  line-height: 1.4;
}

.comment-form {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
}

.comment-submit-form .form-group {
  margin-bottom: 0.75rem;
}

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
}

/* 认证功能样式 */
.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.auth-buttons {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.user-name {
  font-weight: 600;
  color: #333;
}

.btn-outline {
  background: transparent;
  border: 2px solid #007bff;
  color: #007bff;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-outline:hover {
  background: #007bff;
  color: white;
}

/* 模态框样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 400px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #eee;
}

.modal-header h3 {
  margin: 0;
  color: #333;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #999;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-close:hover {
  color: #333;
}

.modal-body {
  padding: 1.5rem;
}

.auth-form .form-group {
  margin-bottom: 1rem;
}

/* 状态显示 */
.loading-state,
.error-state,
.empty-state {
  text-align: center;
  padding: 3rem;
  color: white;
}

.spinner {
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top: 4px solid white;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.load-more {
  text-align: center;
  padding: 2rem 0;
}

/* Toast 提示 */
.toast {
  position: fixed;
  top: 2rem;
  right: 2rem;
  background: white;
  padding: 1rem 1.5rem;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  animation: slideIn 0.3s;
}

.toast.success {
  border-left: 4px solid #4caf50;
}

.toast.error {
  border-left: 4px solid #f44336;
}

@keyframes slideIn {
  from {
    transform: translateX(400px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* 页脚 */
.footer {
  background: rgba(0, 0, 0, 0.3);
  color: white;
  padding: 2rem 0;
  text-align: center;
  margin-top: 3rem;
}

.footer p {
  margin: 0.5rem 0;
  font-size: 0.9rem;
}

.footer a {
  color: #ffd700;
  text-decoration: none;
  transition: opacity 0.3s;
}

.footer a:hover {
  opacity: 0.8;
  text-decoration: underline;
}

.copyright {
  opacity: 0.8;
}
</style>

