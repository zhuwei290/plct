package com.shop.model;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class Product {
    private Integer id;
    private String name;
    private String description;
    private Integer categoryId;
    private BigDecimal price;
    private BigDecimal originalPrice;
    private Integer stock;
    private Integer soldCount;
    private String imageUrl;
    private String images;
    private String status;  // active, inactive
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    // 关联对象
    private Category category;
}
