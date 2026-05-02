package com.deepakraj.cart.service;

import com.deepakraj.cart.dto.CartItemRequest;
import com.deepakraj.cart.dto.CartResponse;
import com.deepakraj.cart.dto.QuantityUpdateRequest;

public interface CartService {

    CartResponse getMyCart(String authorization);

    CartResponse getCartByUserId(Long userId);

    CartResponse addItem(String authorization, CartItemRequest request);

    CartResponse updateItem(String authorization, Long productId, QuantityUpdateRequest request);

    CartResponse removeItem(String authorization, Long productId);

    void clearCart(String authorization);
}
