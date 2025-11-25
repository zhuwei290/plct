package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	_ "github.com/lib/pq"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

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

	// 需要认证的路由
	api := r.Group("/api")
	api.Use(authMiddleware())
	{
		// 用户信息
		api.GET("/user/me", getCurrentUser)

		// 分类
		api.GET("/categories", getCategories)

		// 图书
		api.GET("/books", getBooks)
		api.GET("/books/:id", getBook)

		// 借阅
		api.POST("/borrowings", borrowBook)
		api.POST("/borrowings/:id/return", returnBook)
		api.POST("/borrowings/:id/renew", renewBook)
		api.GET("/borrowings", getBorrowings)

		// 统计
		api.GET("/stats", getStats)
	}

	// 管理员路由
	admin := r.Group("/api/admin")
	admin.Use(authMiddleware(), adminMiddleware())
	{
		// 图书管理
		admin.POST("/books", createBook)
		admin.PUT("/books/:id", updateBook)
		admin.DELETE("/books/:id", deleteBook)
	}

	port := getEnv("PORT", "8007")
	log.Printf("🚀 Library API 服务启动在端口 %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal("服务器启动失败:", err)
	}
}

func initDB() {
	host := getEnv("DB_HOST", "database")
	port := getEnv("DB_PORT", "5432")
	user := getEnv("DB_USERNAME", "library")
	password := getEnv("DB_PASSWORD", "LibraryPass2024")
	dbname := getEnv("DB_NAME", "librarydb")
	sslmode := getEnv("DB_SSLMODE", "disable")

	connStr := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		host, port, user, password, dbname, sslmode,
	)

	log.Printf("📡 连接数据库: host=%s, port=%s, dbname=%s", host, port, dbname)

	sqlDB, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal("❌ 数据库连接失败:", err)
	}

	sqlDB.SetMaxOpenConns(25)
	sqlDB.SetMaxIdleConns(5)
	sqlDB.SetConnMaxLifetime(5 * time.Minute)

	if err := sqlDB.Ping(); err != nil {
		log.Fatal("❌ 数据库连接测试失败:", err)
	}

	db, err = gorm.Open(postgres.New(postgres.Config{
		Conn:                 sqlDB,
		PreferSimpleProtocol: true,
	}), &gorm.Config{
		Logger:                                   logger.Default.LogMode(logger.Silent),
		DisableForeignKeyConstraintWhenMigrating: true,
		SkipDefaultTransaction:                   true,
		PrepareStmt:                              false,
	})

	if err != nil {
		log.Fatal("❌ GORM 初始化失败:", err)
	}

	log.Println("🔍 检查数据库表结构...")

	// 检查表是否存在
	tables := []string{"users", "categories", "books", "borrowings"}
	for _, table := range tables {
		var exists bool
		err = sqlDB.QueryRow("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1)", table).Scan(&exists)
		if err != nil {
			log.Printf("⚠️  检查 %s 表失败: %v", table, err)
		} else if exists {
			log.Printf("✅ %s 表已存在", table)
		} else {
			log.Printf("⚠️  %s 表不存在，请确保已通过 init.sh 创建表", table)
		}
	}

	log.Println("✅ 数据库连接成功（使用 PostgreSQL 兼容驱动）")
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
