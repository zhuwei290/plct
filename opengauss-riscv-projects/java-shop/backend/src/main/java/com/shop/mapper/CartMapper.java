package com.shop.mapper;

import com.shop.model.Cart;
import org.apache.ibatis.annotations.*;
import java.util.List;

@Mapper
public interface CartMapper {
    
    @Select("SELECT c.*, p.* FROM carts c " +
            "JOIN products p ON c.product_id = p.id " +
            "WHERE c.user_id = #{userId}")
    @Results({
        @Result(property = "id", column = "id"),
        @Result(property = "product", column = "product_id",
                one = @One(select = "com.shop.mapper.ProductMapper.findById"))
    })
    List<Cart> findByUserId(Integer userId);
    
    @Select("SELECT * FROM carts WHERE user_id = #{userId} AND product_id = #{productId}")
    Cart findByUserIdAndProductId(@Param("userId") Integer userId, @Param("productId") Integer productId);
    
    @Insert("INSERT INTO carts (user_id, product_id, quantity) " +
            "VALUES (#{userId}, #{productId}, #{quantity})")
    @Options(useGeneratedKeys = true, keyProperty = "id", keyColumn = "id")
    void insert(Cart cart);
    
    @Update("UPDATE carts SET quantity = #{quantity}, updated_at = CURRENT_TIMESTAMP " +
            "WHERE user_id = #{userId} AND product_id = #{productId}")
    void updateQuantity(@Param("userId") Integer userId, @Param("productId") Integer productId, 
                       @Param("quantity") Integer quantity);
    
    @Delete("DELETE FROM carts WHERE id = #{id} AND user_id = #{userId}")
    void delete(@Param("id") Integer id, @Param("userId") Integer userId);
    
    @Delete("DELETE FROM carts WHERE user_id = #{userId}")
    void deleteByUserId(Integer userId);
}
