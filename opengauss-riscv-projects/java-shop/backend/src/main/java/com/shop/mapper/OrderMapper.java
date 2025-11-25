package com.shop.mapper;

import com.shop.model.Order;
import org.apache.ibatis.annotations.*;
import java.util.List;

@Mapper
public interface OrderMapper {
    
    @Select("SELECT * FROM orders WHERE user_id = #{userId} ORDER BY created_at DESC")
    @Results({
        @Result(property = "id", column = "id"),
        @Result(property = "items", column = "id",
                many = @Many(select = "com.shop.mapper.OrderItemMapper.findByOrderId"))
    })
    List<Order> findByUserId(Integer userId);
    
    @Select("SELECT * FROM orders WHERE id = #{id}")
    @Results({
        @Result(property = "id", column = "id"),
        @Result(property = "items", column = "id",
                many = @Many(select = "com.shop.mapper.OrderItemMapper.findByOrderId"))
    })
    Order findById(Integer id);
    
    @Insert("INSERT INTO orders (order_no, user_id, total_amount, status, payment_method, " +
            "shipping_address, receiver_name, receiver_phone, remark) " +
            "VALUES (#{orderNo}, #{userId}, #{totalAmount}, #{status}, #{paymentMethod}, " +
            "#{shippingAddress}, #{receiverName}, #{receiverPhone}, #{remark})")
    @Options(useGeneratedKeys = true, keyProperty = "id", keyColumn = "id")
    void insert(Order order);
    
    @Update("UPDATE orders SET status = #{status}, payment_time = #{paymentTime}, " +
            "updated_at = CURRENT_TIMESTAMP WHERE id = #{id}")
    void updateStatus(Order order);
}
