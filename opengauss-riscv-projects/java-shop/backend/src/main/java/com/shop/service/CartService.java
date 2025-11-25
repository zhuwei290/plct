package com.shop.service;

import com.shop.mapper.CartMapper;
import com.shop.mapper.ProductMapper;
import com.shop.model.Cart;
import com.shop.model.Product;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CartService {
    
    private final CartMapper cartMapper;
    private final ProductMapper productMapper;
    
    public List<Cart> getCart(Integer userId) {
        return cartMapper.findByUserId(userId);
    }
    
    @Transactional
    public void addToCart(Integer userId, Integer productId, Integer quantity) {
        // 检查商品是否存在
        Product product = productMapper.findById(productId);
        if (product == null) {
            throw new RuntimeException("商品不存在");
        }
        
        // 检查库存
        if (product.getStock() < quantity) {
            throw new RuntimeException("库存不足");
        }
        
        // 检查是否已在购物车中
        Cart existing = cartMapper.findByUserIdAndProductId(userId, productId);
        if (existing != null) {
            // 更新数量
            int newQuantity = existing.getQuantity() + quantity;
            if (product.getStock() < newQuantity) {
                throw new RuntimeException("库存不足");
            }
            cartMapper.updateQuantity(userId, productId, newQuantity);
        } else {
            // 新增
            Cart cart = new Cart();
            cart.setUserId(userId);
            cart.setProductId(productId);
            cart.setQuantity(quantity);
            cartMapper.insert(cart);
        }
    }
    
    @Transactional
    public void updateCartQuantity(Integer userId, Integer productId, Integer quantity) {
        if (quantity <= 0) {
            throw new RuntimeException("数量必须大于0");
        }
        
        Product product = productMapper.findById(productId);
        if (product.getStock() < quantity) {
            throw new RuntimeException("库存不足");
        }
        
        cartMapper.updateQuantity(userId, productId, quantity);
    }
    
    public void removeFromCart(Integer userId, Integer id) {
        cartMapper.delete(id, userId);
    }
    
    public void clearCart(Integer userId) {
        cartMapper.deleteByUserId(userId);
    }
}
