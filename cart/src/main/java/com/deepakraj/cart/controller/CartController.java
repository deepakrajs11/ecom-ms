package com.deepakraj.cart.controller;

import com.deepakraj.cart.dto.CartItemRequest;
import com.deepakraj.cart.dto.CartResponse;
import com.deepakraj.cart.dto.QuantityUpdateRequest;
import com.deepakraj.cart.service.CartService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
public class CartController {

    private final CartService cartService;

    @GetMapping
    public ResponseEntity<CartResponse> getMyCart(@RequestHeader("Authorization") String authorization) {
        return ResponseEntity.ok(cartService.getMyCart(authorization));
    }

    @PostMapping("/items")
    public ResponseEntity<CartResponse> addItem(
            @RequestHeader("Authorization") String authorization,
            @Valid @RequestBody CartItemRequest request
    ) {
        return ResponseEntity.ok(cartService.addItem(authorization, request));
    }

    @PutMapping("/items/{productId}")
    public ResponseEntity<CartResponse> updateItem(
            @RequestHeader("Authorization") String authorization,
            @PathVariable Long productId,
            @Valid @RequestBody QuantityUpdateRequest request
    ) {
        return ResponseEntity.ok(cartService.updateItem(authorization, productId, request));
    }

    @DeleteMapping("/items/{productId}")
    public ResponseEntity<CartResponse> removeItem(
            @RequestHeader("Authorization") String authorization,
            @PathVariable Long productId
    ) {
        return ResponseEntity.ok(cartService.removeItem(authorization, productId));
    }

    @DeleteMapping
    public ResponseEntity<Void> clearCart(@RequestHeader("Authorization") String authorization) {
        cartService.clearCart(authorization);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/admin/users/{userId}")
    public ResponseEntity<CartResponse> getCartByUserId(@PathVariable Long userId) {
        return ResponseEntity.ok(cartService.getCartByUserId(userId));
    }
}
