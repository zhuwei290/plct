package com.shop.controller;

import com.shop.model.Category;
import com.shop.model.Product;
import com.shop.service.ProductService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ProductController {
    
    private final ProductService productService;
    
    @GetMapping("/products")
    public ResponseEntity<List<Product>> getProducts(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Integer categoryId) {
        return ResponseEntity.ok(productService.getProducts(search, categoryId));
    }
    
    @GetMapping("/products/{id}")
    public ResponseEntity<?> getProduct(@PathVariable Integer id) {
        try {
            return ResponseEntity.ok(productService.getProductById(id));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        }
    }
    
    @GetMapping("/categories")
    public ResponseEntity<List<Category>> getCategories() {
        return ResponseEntity.ok(productService.getCategories());
    }
    
    @PostMapping("/admin/products")
    public ResponseEntity<?> createProduct(
            @RequestBody Product product,
            @RequestAttribute String role) {
        try {
            if (!"admin".equals(role)) {
                return ResponseEntity.status(403).body(new ErrorResponse("权限不足"));
            }
            return ResponseEntity.ok(productService.createProduct(product));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        }
    }
    
    @PutMapping("/admin/products/{id}")
    public ResponseEntity<?> updateProduct(
            @PathVariable Integer id,
            @RequestBody Product product,
            @RequestAttribute String role) {
        try {
            if (!"admin".equals(role)) {
                return ResponseEntity.status(403).body(new ErrorResponse("权限不足"));
            }
            productService.updateProduct(id, product);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        }
    }
    
    @DeleteMapping("/admin/products/{id}")
    public ResponseEntity<?> deleteProduct(
            @PathVariable Integer id,
            @RequestAttribute String role) {
        try {
            if (!"admin".equals(role)) {
                return ResponseEntity.status(403).body(new ErrorResponse("权限不足"));
            }
            productService.deleteProduct(id);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        }
    }
    
    record ErrorResponse(String error) {}
}
