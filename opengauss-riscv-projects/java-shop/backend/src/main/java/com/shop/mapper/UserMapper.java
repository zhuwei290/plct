package com.shop.mapper;

import com.shop.model.User;
import org.apache.ibatis.annotations.*;

@Mapper
public interface UserMapper {
    
    @Select("SELECT * FROM users WHERE username = #{username}")
    User findByUsername(String username);
    
    @Select("SELECT * FROM users WHERE email = #{email}")
    User findByEmail(String email);
    
    @Select("SELECT * FROM users WHERE id = #{id}")
    User findById(Integer id);
    
    @Insert("INSERT INTO users (username, password_hash, email, real_name, phone, role) " +
            "VALUES (#{username}, #{passwordHash}, #{email}, #{realName}, #{phone}, #{role})")
    @Options(useGeneratedKeys = true, keyProperty = "id", keyColumn = "id")
    void insert(User user);
    
    @Update("UPDATE users SET real_name = #{realName}, phone = #{phone}, " +
            "avatar_url = #{avatarUrl}, updated_at = CURRENT_TIMESTAMP WHERE id = #{id}")
    void update(User user);
    
    @Select("SELECT COUNT(*) FROM users")
    int count();
}
