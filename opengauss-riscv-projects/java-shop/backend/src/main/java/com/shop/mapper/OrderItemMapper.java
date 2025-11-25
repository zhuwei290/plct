package com.shop.mapper;

import com.shop.model.OrderItem;
import org.apache.ibatis.annotations.*;
import java.util.List;

@Mapper
public interface OrderItemMapper {
    
    @Select("SELECT * FROM order_items WHERE order_id = #{orderId}")
    List<OrderItem> findByOrderId(Integer orderId);
    
    @Insert("INSERT INTO order_items (order_id, product_id, product_name, product_price, quantity, subtotal) " +
            "VALUES (#{orderId}, #{productId}, #{productName}, #{productPrice}, #{quantity}, #{subtotal})")
    void insert(OrderItem item);
}
