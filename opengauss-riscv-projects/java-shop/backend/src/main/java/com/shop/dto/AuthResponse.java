package com.shop.dto;

import com.shop.model.User;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AuthResponse {
    private String token;
    private UserInfo user;
    
    @Data
    public static class UserInfo {
        private Integer id;
        private String username;
        private String email;
        private String realName;
        private String phone;
        private String role;
        private String avatarUrl;
        
        public static UserInfo fromUser(User user) {
            UserInfo info = new UserInfo();
            info.setId(user.getId());
            info.setUsername(user.getUsername());
            info.setEmail(user.getEmail());
            info.setRealName(user.getRealName());
            info.setPhone(user.getPhone());
            info.setRole(user.getRole());
            info.setAvatarUrl(user.getAvatarUrl());
            return info;
        }
    }
}
