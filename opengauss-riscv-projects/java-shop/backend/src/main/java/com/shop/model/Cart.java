package com.shop.model;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class Cart {
    private Integer id;
    private Integer userId;
    private Integer productId;
    private Integer quantity;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    // 关联对象
    private Product product;
}
