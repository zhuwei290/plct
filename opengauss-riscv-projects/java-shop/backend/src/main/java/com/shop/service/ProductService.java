package com.shop.service;

import com.shop.mapper.CategoryMapper;
import com.shop.mapper.ProductMapper;
import com.shop.model.Category;
import com.shop.model.Product;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProductService {
    
    private final ProductMapper productMapper;
    private final CategoryMapper categoryMapper;
    
    public List<Product> getProducts(String search, Integer categoryId) {
        return productMapper.findAll(search, categoryId, "active");
    }
    
    public Product getProductById(Integer id) {
        Product product = productMapper.findById(id);
        if (product == null) {
            throw new RuntimeException("商品不存在");
        }
        return product;
    }
    
    public List<Category> getCategories() {
        return categoryMapper.findAll();
    }
    
    public Product createProduct(Product product) {
        product.setStatus("active");
        productMapper.insert(product);
        return product;
    }
    
    public void updateProduct(Integer id, Product product) {
        Product existing = productMapper.findById(id);
        if (existing == null) {
            throw new RuntimeException("商品不存在");
        }
        product.setId(id);
        // 如果没有传status，保留原有状态
        if (product.getStatus() == null || product.getStatus().isEmpty()) {
            product.setStatus(existing.getStatus());
        }
        // 如果没有传imageUrl，保留原有图片
        if (product.getImageUrl() == null || product.getImageUrl().isEmpty()) {
            product.setImageUrl(existing.getImageUrl());
        }
        // 如果没有传categoryId，保留原有分类
        if (product.getCategoryId() == null) {
            product.setCategoryId(existing.getCategoryId());
        }
        productMapper.update(product);
    }
    
    public void deleteProduct(Integer id) {
        Product existing = productMapper.findById(id);
        if (existing == null) {
            throw new RuntimeException("商品不存在");
        }
        productMapper.delete(id);
    }
}
