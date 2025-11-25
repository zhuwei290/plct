package com.shop.service;

import com.shop.dto.CreateOrderRequest;
import com.shop.mapper.OrderItemMapper;
import com.shop.mapper.OrderMapper;
import com.shop.mapper.ProductMapper;
import com.shop.model.Order;
import com.shop.model.OrderItem;
import com.shop.model.Product;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Random;

@Service
@RequiredArgsConstructor
public class OrderService {
    
    private final OrderMapper orderMapper;
    private final OrderItemMapper orderItemMapper;
    private final ProductMapper productMapper;
    
    public List<Order> getUserOrders(Integer userId) {
        return orderMapper.findByUserId(userId);
    }
    
    public Order getOrderById(Integer id) {
        return orderMapper.findById(id);
    }
    
    @Transactional
    public Order createOrder(Integer userId, CreateOrderRequest request) {
        // 生成订单号
        String orderNo = generateOrderNo();
        
        // 计算总金额并检查库存
        BigDecimal totalAmount = BigDecimal.ZERO;
        for (CreateOrderRequest.OrderItemRequest item : request.getItems()) {
            Product product = productMapper.findById(item.getProductId());
            if (product == null) {
                throw new RuntimeException("商品不存在: " + item.getProductId());
            }
            
            // 扣减库存
            int updated = productMapper.decreaseStock(item.getProductId(), item.getQuantity());
            if (updated == 0) {
                throw new RuntimeException("商品库存不足: " + product.getName());
            }
            
            BigDecimal subtotal = product.getPrice().multiply(BigDecimal.valueOf(item.getQuantity()));
            totalAmount = totalAmount.add(subtotal);
        }
        
        // 创建订单
        Order order = new Order();
        order.setOrderNo(orderNo);
        order.setUserId(userId);
        order.setTotalAmount(totalAmount);
        order.setStatus("pending");
        order.setShippingAddress(request.getShippingAddress());
        order.setReceiverName(request.getReceiverName());
        order.setReceiverPhone(request.getReceiverPhone());
        order.setRemark(request.getRemark());
        
        orderMapper.insert(order);
        
        // 创建订单明细
        for (CreateOrderRequest.OrderItemRequest item : request.getItems()) {
            Product product = productMapper.findById(item.getProductId());
            
            OrderItem orderItem = new OrderItem();
            orderItem.setOrderId(order.getId());
            orderItem.setProductId(product.getId());
            orderItem.setProductName(product.getName());
            orderItem.setProductPrice(product.getPrice());
            orderItem.setQuantity(item.getQuantity());
            orderItem.setSubtotal(product.getPrice().multiply(BigDecimal.valueOf(item.getQuantity())));
            
            orderItemMapper.insert(orderItem);
        }
        
        return order;
    }
    
    @Transactional
    public void payOrder(Integer id, String paymentMethod) {
        Order order = orderMapper.findById(id);
        if (order == null) {
            throw new RuntimeException("订单不存在");
        }
        
        if (!"pending".equals(order.getStatus())) {
            throw new RuntimeException("订单状态不正确");
        }
        
        order.setStatus("paid");
        order.setPaymentMethod(paymentMethod);
        order.setPaymentTime(LocalDateTime.now());
        
        orderMapper.updateStatus(order);
    }
    
    @Transactional
    public void cancelOrder(Integer id) {
        Order order = orderMapper.findById(id);
        if (order == null) {
            throw new RuntimeException("订单不存在");
        }
        
        if (!"pending".equals(order.getStatus())) {
            throw new RuntimeException("只能取消待付款订单");
        }
        
        // 恢复库存
        for (OrderItem item : order.getItems()) {
            productMapper.increaseStockAndSoldCount(item.getProductId(), item.getQuantity());
        }
        
        order.setStatus("cancelled");
        orderMapper.updateStatus(order);
    }
    
    private String generateOrderNo() {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
        String timestamp = LocalDateTime.now().format(formatter);
        int random = new Random().nextInt(10000);
        return String.format("O%s%04d", timestamp, random);
    }
}
