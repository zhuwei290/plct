package main

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// 获取所有分类
func getCategories(c *gin.Context) {
	var categories []Category
	if err := db.Order("name").Find(&categories).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, categories)
}

// 获取所有图书
func getBooks(c *gin.Context) {
	var books []Book
	query := db.Preload("Category").Order("created_at DESC")

	// 搜索
	if search := c.Query("search"); search != "" {
		query = query.Where("title LIKE ? OR author LIKE ? OR isbn LIKE ?",
			"%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	// 按分类筛选
	if categoryID := c.Query("category_id"); categoryID != "" {
		query = query.Where("category_id = ?", categoryID)
	}

	// 按作者筛选
	if author := c.Query("author"); author != "" {
		query = query.Where("author = ?", author)
	}

	// 只显示有库存的
	if available := c.Query("available"); available == "true" {
		query = query.Where("available_copies > 0")
	}

	if err := query.Find(&books).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, books)
}

// 获取单本图书
func getBook(c *gin.Context) {
	id := c.Param("id")
	var book Book
	if err := db.Preload("Category").First(&book, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "图书不存在"})
		return
	}
	c.JSON(http.StatusOK, book)
}

// 添加图书（管理员）
func createBook(c *gin.Context) {
	var req BookRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 检查 ISBN 是否已存在
	if req.ISBN != "" {
		var existing Book
		if err := db.Where("isbn = ?", req.ISBN).First(&existing).Error; err == nil {
			c.JSON(http.StatusConflict, gin.H{"error": "ISBN 已存在"})
			return
		}
	}

	if req.TotalCopies == 0 {
		req.TotalCopies = 1
	}

	book := Book{
		ISBN:            req.ISBN,
		Title:           req.Title,
		Author:          req.Author,
		Publisher:       req.Publisher,
		PublishDate:     &req.PublishDate,
		CategoryID:      req.CategoryID,
		TotalCopies:     req.TotalCopies,
		AvailableCopies: req.TotalCopies,
		Location:        req.Location,
		Description:     req.Description,
		CoverURL:        req.CoverURL,
	}

	if err := db.Create(&book).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "添加图书失败"})
		return
	}

	db.Preload("Category").First(&book, book.ID)
	c.JSON(http.StatusCreated, book)
}

// 更新图书（管理员）
func updateBook(c *gin.Context) {
	id := c.Param("id")
	var book Book
	if err := db.First(&book, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "图书不存在"})
		return
	}

	var req BookRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 更新字段
	updates := map[string]interface{}{
		"isbn":        req.ISBN,
		"title":       req.Title,
		"author":      req.Author,
		"publisher":   req.Publisher,
		"category_id": req.CategoryID,
		"location":    req.Location,
		"description": req.Description,
		"cover_url":   req.CoverURL,
	}

	if req.PublishDate != "" {
		updates["publish_date"] = req.PublishDate
	}

	// 更新总数和可借数
	if req.TotalCopies > 0 {
		diff := req.TotalCopies - book.TotalCopies
		updates["total_copies"] = req.TotalCopies
		updates["available_copies"] = book.AvailableCopies + diff
	}

	if err := db.Model(&book).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "更新失败"})
		return
	}

	db.Preload("Category").First(&book, id)
	c.JSON(http.StatusOK, book)
}

// 删除图书（管理员）
func deleteBook(c *gin.Context) {
	id := c.Param("id")
	var book Book
	if err := db.First(&book, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "图书不存在"})
		return
	}

	// 检查是否有未归还的借阅记录
	var count int64
	db.Model(&Borrowing{}).Where("book_id = ? AND status = ?", id, "borrowed").Count(&count)
	if count > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "该图书有未归还的借阅记录，无法删除"})
		return
	}

	if err := db.Delete(&book).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "删除失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "删除成功"})
}

// 借书
func borrowBook(c *gin.Context) {
	userID := getCurrentUserID(c)

	var req BorrowRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 检查图书是否存在
	var book Book
	if err := db.First(&book, req.BookID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "图书不存在"})
		return
	}

	// 检查是否有可借副本
	if book.AvailableCopies <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "该图书已全部借出"})
		return
	}

	// 检查用户是否已借阅该书且未归还
	var existingBorrowing Borrowing
	if err := db.Where("user_id = ? AND book_id = ? AND status = ?",
		userID, req.BookID, "borrowed").First(&existingBorrowing).Error; err == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "您已借阅该图书，请先归还"})
		return
	}

	// 创建借阅记录
	borrowing := Borrowing{
		UserID:     userID,
		BookID:     req.BookID,
		BorrowDate: time.Now(),
		DueDate:    time.Now().AddDate(0, 0, req.Days),
		Status:     "borrowed",
	}

	// 开始事务
	tx := db.Begin()

	if err := tx.Create(&borrowing).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "借阅失败"})
		return
	}

	// 更新可借数量
	if err := tx.Model(&book).Update("available_copies", book.AvailableCopies-1).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "更新库存失败"})
		return
	}

	tx.Commit()

	// 加载关联数据
	db.Preload("Book").Preload("Book.Category").First(&borrowing, borrowing.ID)
	c.JSON(http.StatusCreated, borrowing)
}

// 还书
func returnBook(c *gin.Context) {
	id := c.Param("id")
	userID := getCurrentUserID(c)
	role := getCurrentUserRole(c)

	var borrowing Borrowing
	query := db.Where("id = ?", id)

	// 非管理员只能归还自己的借阅
	if role != "admin" {
		query = query.Where("user_id = ?", userID)
	}

	if err := query.First(&borrowing).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "借阅记录不存在"})
		return
	}

	if borrowing.Status == "returned" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "该图书已归还"})
		return
	}

	// 开始事务
	tx := db.Begin()

	now := time.Now()
	if err := tx.Model(&borrowing).Updates(map[string]interface{}{
		"return_date": &now,
		"status":      "returned",
	}).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "归还失败"})
		return
	}

	// 更新可借数量
	if err := tx.Model(&Book{}).Where("id = ?", borrowing.BookID).
		Update("available_copies", db.Raw("available_copies + 1")).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "更新库存失败"})
		return
	}

	tx.Commit()

	db.Preload("Book").Preload("Book.Category").First(&borrowing, id)
	c.JSON(http.StatusOK, borrowing)
}

// 续借
func renewBook(c *gin.Context) {
	id := c.Param("id")
	userID := getCurrentUserID(c)

	var borrowing Borrowing
	if err := db.Where("id = ? AND user_id = ?", id, userID).First(&borrowing).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "借阅记录不存在"})
		return
	}

	if borrowing.Status != "borrowed" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "只能续借未归还的图书"})
		return
	}

	if borrowing.RenewCount >= 2 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "已达到最大续借次数(2次)"})
		return
	}

	// 续借14天
	newDueDate := borrowing.DueDate.AddDate(0, 0, 14)
	if err := db.Model(&borrowing).Updates(map[string]interface{}{
		"due_date":    newDueDate,
		"renew_count": borrowing.RenewCount + 1,
	}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "续借失败"})
		return
	}

	db.Preload("Book").Preload("Book.Category").First(&borrowing, id)
	c.JSON(http.StatusOK, borrowing)
}

// 获取借阅记录
func getBorrowings(c *gin.Context) {
	userID := getCurrentUserID(c)
	role := getCurrentUserRole(c)

	var borrowings []Borrowing
	query := db.Preload("Book").Preload("Book.Category").Preload("User").Order("created_at DESC")

	// 非管理员只能看自己的
	if role != "admin" {
		query = query.Where("user_id = ?", userID)
	} else {
		// 管理员可以按用户筛选
		if uid := c.Query("user_id"); uid != "" {
			query = query.Where("user_id = ?", uid)
		}
	}

	// 按状态筛选
	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}

	// 按图书筛选
	if bookID := c.Query("book_id"); bookID != "" {
		query = query.Where("book_id = ?", bookID)
	}

	if err := query.Find(&borrowings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, borrowings)
}

// 获取统计信息
func getStats(c *gin.Context) {
	var stats StatsResponse

	db.Model(&Book{}).Count(&stats.TotalBooks)
	db.Model(&Book{}).Select("COALESCE(SUM(total_copies - available_copies), 0)").Scan(&stats.TotalBorrowed)
	db.Model(&Book{}).Select("COALESCE(SUM(available_copies), 0)").Scan(&stats.TotalAvailable)
	db.Model(&Borrowing{}).Where("status = ?", "borrowed").Count(&stats.ActiveBorrowings)
	db.Model(&User{}).Count(&stats.TotalUsers)

	c.JSON(http.StatusOK, stats)
}

// 健康检查
func healthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":    "ok",
		"timestamp": time.Now().Format(time.RFC3339),
		"service":   "go-library-api",
		"database":  "openGauss",
	})
}
