package com.shop.dto;

import lombok.Data;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

@Data
public class CreateOrderRequest {
    @NotEmpty(message = "订单商品不能为空")
    private List<OrderItemRequest> items;
    
    private Integer addressId;
    
    @NotBlank(message = "收货人姓名不能为空")
    private String receiverName;
    
    @NotBlank(message = "收货人电话不能为空")
    private String receiverPhone;
    
    @NotBlank(message = "收货地址不能为空")
    private String shippingAddress;
    
    private String remark;
    
    @Data
    public static class OrderItemRequest {
        private Integer productId;
        private Integer quantity;
    }
}
