package com.shop.mapper;

import com.shop.model.Category;
import org.apache.ibatis.annotations.*;
import java.util.List;

@Mapper
public interface CategoryMapper {
    
    @Select("SELECT * FROM categories ORDER BY sort_order, id")
    List<Category> findAll();
    
    @Select("SELECT * FROM categories WHERE id = #{id}")
    Category findById(Integer id);
    
    @Insert("INSERT INTO categories (name, description, parent_id, icon, sort_order) " +
            "VALUES (#{name}, #{description}, #{parentId}, #{icon}, #{sortOrder})")
    @Options(useGeneratedKeys = true, keyProperty = "id", keyColumn = "id")
    void insert(Category category);
}
