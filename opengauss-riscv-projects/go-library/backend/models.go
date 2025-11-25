package main

import "time"

// 数据库模型
type User struct {
	ID           int       `json:"id" gorm:"primaryKey"`
	Username     string    `json:"username" gorm:"uniqueIndex;not null"`
	Email        string    `json:"email" gorm:"uniqueIndex;not null"`
	PasswordHash string    `json:"-" gorm:"column:password_hash;not null"`
	RealName     string    `json:"real_name"`
	Phone        string    `json:"phone"`
	Role         string    `json:"role" gorm:"default:reader"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type Category struct {
	ID          int       `json:"id" gorm:"primaryKey"`
	Name        string    `json:"name" gorm:"uniqueIndex;not null"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
}

type Book struct {
	ID              int       `json:"id" gorm:"primaryKey"`
	ISBN            string    `json:"isbn" gorm:"uniqueIndex"`
	Title           string    `json:"title" gorm:"not null"`
	Author          string    `json:"author" gorm:"not null"`
	Publisher       string    `json:"publisher"`
	PublishDate     *string   `json:"publish_date"`
	CategoryID      *int      `json:"category_id"`
	Category        *Category `json:"category,omitempty" gorm:"foreignKey:CategoryID"`
	TotalCopies     int       `json:"total_copies" gorm:"default:1"`
	AvailableCopies int       `json:"available_copies" gorm:"default:1"`
	Location        string    `json:"location"`
	Description     string    `json:"description"`
	CoverURL        string    `json:"cover_url"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type Borrowing struct {
	ID         int       `json:"id" gorm:"primaryKey"`
	UserID     int       `json:"user_id" gorm:"not null;index"`
	BookID     int       `json:"book_id" gorm:"not null;index"`
	User       *User     `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Book       *Book     `json:"book,omitempty" gorm:"foreignKey:BookID"`
	BorrowDate time.Time `json:"borrow_date"`
	DueDate    time.Time `json:"due_date"`
	ReturnDate *time.Time `json:"return_date"`
	RenewCount int       `json:"renew_count" gorm:"default:0"`
	Status     string    `json:"status" gorm:"default:borrowed"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// 请求模型
type RegisterRequest struct {
	Username string `json:"username" binding:"required,min=3,max=50"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
	RealName string `json:"real_name"`
	Phone    string `json:"phone"`
}

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type BookRequest struct {
	ISBN        string `json:"isbn"`
	Title       string `json:"title" binding:"required"`
	Author      string `json:"author" binding:"required"`
	Publisher   string `json:"publisher"`
	PublishDate string `json:"publish_date"`
	CategoryID  *int   `json:"category_id"`
	TotalCopies int    `json:"total_copies"`
	Location    string `json:"location"`
	Description string `json:"description"`
	CoverURL    string `json:"cover_url"`
}

type BorrowRequest struct {
	BookID int `json:"book_id" binding:"required"`
	Days   int `json:"days" binding:"required,min=1,max=90"`
}

type AuthResponse struct {
	Token string   `json:"token"`
	User  UserInfo `json:"user"`
}

type UserInfo struct {
	ID       int    `json:"id"`
	Username string `json:"username"`
	Email    string `json:"email"`
	RealName string `json:"real_name"`
	Role     string `json:"role"`
}

type StatsResponse struct {
	TotalBooks      int64 `json:"total_books"`
	TotalBorrowed   int64 `json:"total_borrowed"`
	TotalAvailable  int64 `json:"total_available"`
	ActiveBorrowings int64 `json:"active_borrowings"`
	TotalUsers      int64 `json:"total_users"`
}
