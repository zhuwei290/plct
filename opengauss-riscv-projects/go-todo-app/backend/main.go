package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	
	// PostgreSQL 驱动（openGauss 完全兼容）
	_ "github.com/lib/pq"
	
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// JWT 配置
var jwtSecret = []byte(getEnv("JWT_SECRET", "your-secret-key-change-in-production"))

// 数据库模型
type User struct {
	ID           int       `json:"id" gorm:"primaryKey"`
	Username     string    `json:"username" gorm:"uniqueIndex;not null"`
	Email        string    `json:"email" gorm:"uniqueIndex;not null"`
	PasswordHash string    `json:"-" gorm:"column:password_hash;not null"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
	Todos        []Todo    `json:"-" gorm:"foreignKey:UserID"`
}

type Todo struct {
	ID          int       `json:"id" gorm:"primaryKey"`
	UserID      int       `json:"user_id" gorm:"not null;index"`
	Title       string    `json:"title" gorm:"not null"`
	Description string    `json:"description"`
	Completed   bool      `json:"completed" gorm:"default:false"`
	Priority    int       `json:"priority" gorm:"default:0"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	User        User      `json:"-" gorm:"foreignKey:UserID"`
}

// 请求模型
type RegisterRequest struct {
	Username string `json:"username" binding:"required,min=3,max=50"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type CreateTodoRequest struct {
	Title       string `json:"title" binding:"required"`
	Description string `json:"description"`
	Priority    int    `json:"priority"`
}

type UpdateTodoRequest struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Completed   *bool  `json:"completed"`
	Priority    *int   `json:"priority"`
}

type AuthResponse struct {
	Token string    `json:"token"`
	User  UserInfo  `json:"user"`
}

type UserInfo struct {
	ID       int    `json:"id"`
	Username string `json:"username"`
	Email    string `json:"email"`
}

var db *gorm.DB

func main() {
	initDB()

	gin.SetMode(gin.ReleaseMode)
	r := gin.Default()

	// CORS 配置
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// 公开路由
	r.POST("/api/auth/register", register)
	r.POST("/api/auth/login", login)
	r.GET("/health", healthCheck)
	r.GET("/api/health", healthCheck)
	r.GET("/api/todos/health", healthCheck)

	// 需要认证的路由
	api := r.Group("/api/todos")
	api.Use(authMiddleware())
	{
		api.GET("", getTodos)
		api.GET("/:id", getTodo)
		api.POST("", createTodo)
		api.PUT("/:id", updateTodo)
		api.DELETE("/:id", deleteTodo)
		api.DELETE("", deleteCompletedTodos)
	}

	// 用户信息路由
	userAPI := r.Group("/api/user")
	userAPI.Use(authMiddleware())
	{
		userAPI.GET("/me", getCurrentUser)
	}

	port := getEnv("PORT", "8005")
	log.Printf("🚀 Todo API 服务启动在端口 %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal("服务器启动失败:", err)
	}
}

func initDB() {
	host := getEnv("DB_HOST", "database")
	port := getEnv("DB_PORT", "5432")
	user := getEnv("DB_USERNAME", "todo")
	password := getEnv("DB_PASSWORD", "TodoPass2024")
	dbname := getEnv("DB_NAME", "tododb")
	sslmode := getEnv("DB_SSLMODE", "disable")
	
	// PostgreSQL 连接字符串（openGauss 完全兼容）
	connStr := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		host, port, user, password, dbname, sslmode,
	)
	
	log.Printf("📡 连接数据库: host=%s, port=%s, dbname=%s", host, port, dbname)
	
	// 使用 PostgreSQL 驱动（openGauss 完全兼容）
	sqlDB, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal("❌ 数据库连接失败:", err)
	}
	
	// 设置连接池参数
	sqlDB.SetMaxOpenConns(25)
	sqlDB.SetMaxIdleConns(5)
	sqlDB.SetConnMaxLifetime(5 * time.Minute)
	
	// 测试连接
	if err := sqlDB.Ping(); err != nil {
		log.Fatal("❌ 数据库连接测试失败:", err)
	}
	
	// 使用 GORM 包装 - 使用与 openGauss 兼容的配置
	db, err = gorm.Open(postgres.New(postgres.Config{
		Conn: sqlDB,
		// 禁用自动预编译语句，避免参数绑定问题
		PreferSimpleProtocol: true,
	}), &gorm.Config{
		// 禁用日志以减少兼容性问题
		Logger: logger.Default.LogMode(logger.Silent),
		// 禁用自动 ping 和表检查
		DisableForeignKeyConstraintWhenMigrating: true,
		// 跳过默认事务
		SkipDefaultTransaction: true,
		// 禁用命名策略，使用表名和列名原样
		NamingStrategy: nil,
		// 准备语句模式 - 避免
		PrepareStmt: false,
	})
	
	if err != nil {
		log.Fatal("❌ GORM 初始化失败:", err)
	}

	// 检查表是否存在（使用原生 SQL 避免 GORM 兼容性问题）
	// 由于表已经通过 init.sh 和 schema.sql 创建，这里只做验证
	log.Println("🔍 检查数据库表结构...")
	
	// 使用原生 SQL 检查表是否存在
	var userTableExists bool
	err = sqlDB.QueryRow("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users')").Scan(&userTableExists)
	if err != nil {
		log.Printf("⚠️  检查 users 表失败: %v", err)
	} else if userTableExists {
		log.Println("✅ users 表已存在")
	} else {
		log.Println("⚠️  users 表不存在，请确保已通过 init.sh 创建表")
	}
	
	var todoTableExists bool
	err = sqlDB.QueryRow("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'todos')").Scan(&todoTableExists)
	if err != nil {
		log.Printf("⚠️  检查 todos 表失败: %v", err)
	} else if todoTableExists {
		log.Println("✅ todos 表已存在")
	} else {
		log.Println("⚠️  todos 表不存在，请确保已通过 init.sh 创建表")
	}

	log.Println("✅ 数据库连接成功（使用 PostgreSQL 兼容驱动）")
}

// 工具函数
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func hashPassword(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(hash), err
}

func checkPassword(password, hash string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}

func generateToken(userID int, username string) (string, error) {
	claims := jwt.MapClaims{
		"user_id":  userID,
		"username": username,
		"exp":       time.Now().Add(time.Hour * 24 * 7).Unix(), // 7天过期
		"iat":       time.Now().Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

func parseToken(tokenString string) (jwt.MapClaims, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return jwtSecret, nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, jwt.ErrSignatureInvalid
}

// 认证中间件
func authMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "缺少认证令牌"})
			c.Abort()
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "无效的认证格式"})
			c.Abort()
			return
		}

		claims, err := parseToken(parts[1])
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "无效的令牌"})
			c.Abort()
			return
		}

		// 将用户信息存储到上下文
		userID := int(claims["user_id"].(float64))
		c.Set("user_id", userID)
		c.Set("username", claims["username"])

		c.Next()
	}
}

// 获取当前用户ID（从上下文）
func getCurrentUserID(c *gin.Context) int {
	userID, exists := c.Get("user_id")
	if !exists {
		return 0
	}
	return userID.(int)
}

// API 处理函数
func healthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":    "ok",
		"timestamp": time.Now().Format(time.RFC3339),
		"service":   "go-todo-api",
		"database":  "openGauss",
	})
}

func register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 检查用户名是否已存在
	var existingUser User
	if err := db.Where("username = ? OR email = ?", req.Username, req.Email).First(&existingUser).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "用户名或邮箱已存在"})
		return
	}

	// 哈希密码
	passwordHash, err := hashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "密码加密失败"})
		return
	}

	// 创建用户
	user := User{
		Username:     req.Username,
		Email:        req.Email,
		PasswordHash: passwordHash,
	}

	if err := db.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "注册失败"})
		return
	}

	// 生成令牌
	token, err := generateToken(user.ID, user.Username)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "令牌生成失败"})
		return
	}

	c.JSON(http.StatusCreated, AuthResponse{
		Token: token,
		User: UserInfo{
			ID:       user.ID,
			Username: user.Username,
			Email:    user.Email,
		},
	})
}

func login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 查找用户
	var user User
	if err := db.Where("username = ?", req.Username).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "用户名或密码错误"})
		return
	}

	// 验证密码
	if !checkPassword(req.Password, user.PasswordHash) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "用户名或密码错误"})
		return
	}

	// 生成令牌
	token, err := generateToken(user.ID, user.Username)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "令牌生成失败"})
		return
	}

	c.JSON(http.StatusOK, AuthResponse{
		Token: token,
		User: UserInfo{
			ID:       user.ID,
			Username: user.Username,
			Email:    user.Email,
		},
	})
}

func getCurrentUser(c *gin.Context) {
	userID := getCurrentUserID(c)
	var user User
	if err := db.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "用户不存在"})
		return
	}

	c.JSON(http.StatusOK, UserInfo{
		ID:       user.ID,
		Username: user.Username,
		Email:    user.Email,
	})
}

func getTodos(c *gin.Context) {
	userID := getCurrentUserID(c)
	var todos []Todo
	query := db.Where("user_id = ?", userID).Order("created_at DESC")

	// 过滤已完成/未完成
	if completed := c.Query("completed"); completed != "" {
		completedBool, _ := strconv.ParseBool(completed)
		query = query.Where("completed = ?", completedBool)
	}

	// 过滤优先级
	if priority := c.Query("priority"); priority != "" {
		priorityInt, _ := strconv.Atoi(priority)
		query = query.Where("priority = ?", priorityInt)
	}

	if err := query.Find(&todos).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, todos)
}

func getTodo(c *gin.Context) {
	userID := getCurrentUserID(c)
	id := c.Param("id")
	var todo Todo
	if err := db.Where("id = ? AND user_id = ?", id, userID).First(&todo).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "待办事项不存在"})
		return
	}
	c.JSON(http.StatusOK, todo)
}

func createTodo(c *gin.Context) {
	userID := getCurrentUserID(c)
	var req CreateTodoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	todo := Todo{
		UserID:      userID,
		Title:       req.Title,
		Description: req.Description,
		Priority:    req.Priority,
		Completed:   false,
	}

	if err := db.Create(&todo).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, todo)
}

func updateTodo(c *gin.Context) {
	userID := getCurrentUserID(c)
	id := c.Param("id")
	var todo Todo
	if err := db.Where("id = ? AND user_id = ?", id, userID).First(&todo).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "待办事项不存在"})
		return
	}

	var req UpdateTodoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Title != "" {
		todo.Title = req.Title
	}
	if req.Description != "" {
		todo.Description = req.Description
	}
	if req.Completed != nil {
		todo.Completed = *req.Completed
	}
	if req.Priority != nil {
		todo.Priority = *req.Priority
	}

	if err := db.Save(&todo).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, todo)
}

func deleteTodo(c *gin.Context) {
	userID := getCurrentUserID(c)
	id := c.Param("id")
	if err := db.Where("id = ? AND user_id = ?", id, userID).Delete(&Todo{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "删除成功"})
}

func deleteCompletedTodos(c *gin.Context) {
	userID := getCurrentUserID(c)
	if err := db.Where("user_id = ? AND completed = ?", userID, true).Delete(&Todo{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "已删除所有完成的待办事项"})
}

