import { createApp } from 'vue'
import App from './App.vue'

// 创建并挂载应用
createApp(App).mount('#app')

// 添加控制台欢迎信息
console.log('%c openGauss RISC-V 留言板 ', 'background: #667eea; color: white; font-size: 20px; padding: 10px;')
console.log('%c 轻量级，高性能，开源芯 ', 'background: #764ba2; color: white; font-size: 14px; padding: 5px;')
console.log('数据库: openGauss 6.0.0-riscv64')
console.log('框架: Vue 3 + Vite + FastAPI')
console.log('架构: RISC-V 64-bit')

