

package com.shop.model;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class Order {
    private Integer id;
    private String orderNo;
    private Integer userId;
    private BigDecimal totalAmount;
    private String status;  // pending, paid, shipped, completed, cancelled
    private String paymentMethod;
    private LocalDateTime paymentTime;
    private String shippingAddress;
    private String receiverName;
    private String receiverPhone;
    private String remark;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    // 关联对象
    private List<OrderItem> items;
}
