package com.shop.controller;

import com.shop.model.Cart;
import com.shop.service.CartService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
public class CartController {
    
    private final CartService cartService;
    
    @GetMapping
    public ResponseEntity<List<Cart>> getCart(@RequestAttribute Integer userId) {
        return ResponseEntity.ok(cartService.getCart(userId));
    }
    
    @PostMapping
    public ResponseEntity<?> addToCart(
            @RequestBody AddToCartRequest request,
            @RequestAttribute Integer userId) {
        try {
            cartService.addToCart(userId, request.productId, request.quantity);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        }
    }
    
    @PutMapping("/{productId}")
    public ResponseEntity<?> updateQuantity(
            @PathVariable Integer productId,
            @RequestBody UpdateQuantityRequest request,
            @RequestAttribute Integer userId) {
        try {
            cartService.updateCartQuantity(userId, productId, request.quantity);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        }
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<?> removeFromCart(
            @PathVariable Integer id,
            @RequestAttribute Integer userId) {
        cartService.removeFromCart(userId, id);
        return ResponseEntity.ok().build();
    }
    
    @DeleteMapping
    public ResponseEntity<?> clearCart(@RequestAttribute Integer userId) {
        cartService.clearCart(userId);
        return ResponseEntity.ok().build();
    }
    
    @Data
    static class AddToCartRequest {
        private Integer productId;
        private Integer quantity;
    }
    
    @Data
    static class UpdateQuantityRequest {
        private Integer quantity;
    }
    
    record ErrorResponse(String error) {}
}
