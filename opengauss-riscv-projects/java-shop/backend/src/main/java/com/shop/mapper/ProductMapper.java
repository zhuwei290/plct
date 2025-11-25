package com.shop.mapper;

import com.shop.model.Product;
import org.apache.ibatis.annotations.*;
import java.util.List;

@Mapper
public interface ProductMapper {
    
    List<Product> findAll(@Param("search") String search,
                         @Param("categoryId") Integer categoryId,
                         @Param("status") String status);
    
    @Select("SELECT p.*, c.name as category_name FROM products p " +
            "LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = #{id}")
    @Results({
        @Result(property = "id", column = "id"),
        @Result(property = "category", column = "category_id",
                one = @One(select = "com.shop.mapper.CategoryMapper.findById"))
    })
    Product findById(Integer id);
    
    @Insert("INSERT INTO products (name, description, category_id, price, original_price, " +
            "stock, image_url, images, status) VALUES (#{name}, #{description}, #{categoryId}, " +
            "#{price}, #{originalPrice}, #{stock}, #{imageUrl}, #{images}, #{status})")
    @Options(useGeneratedKeys = true, keyProperty = "id", keyColumn = "id")
    void insert(Product product);
    
    @Update("UPDATE products SET name = #{name}, description = #{description}, " +
            "category_id = #{categoryId}, price = #{price}, original_price = #{originalPrice}, " +
            "stock = #{stock}, image_url = #{imageUrl}, images = #{images}, status = #{status}, " +
            "updated_at = CURRENT_TIMESTAMP WHERE id = #{id}")
    void update(Product product);
    
    @Update("UPDATE products SET stock = stock - #{quantity} WHERE id = #{id} AND stock >= #{quantity}")
    int decreaseStock(@Param("id") Integer id, @Param("quantity") Integer quantity);
    
    @Update("UPDATE products SET stock = stock + #{quantity}, sold_count = sold_count + #{quantity} WHERE id = #{id}")
    void increaseStockAndSoldCount(@Param("id") Integer id, @Param("quantity") Integer quantity);
    
    @Delete("DELETE FROM products WHERE id = #{id}")
    void delete(Integer id);
}
