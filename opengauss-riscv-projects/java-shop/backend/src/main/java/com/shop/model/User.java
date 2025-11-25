package com.shop.model;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class User {
    private Integer id;
    private String username;
    private String passwordHash;
    private String email;
    private String realName;
    private String phone;
    private String role;  // customer, admin
    private String avatarUrl;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
