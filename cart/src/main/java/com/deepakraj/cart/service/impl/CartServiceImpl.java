package com.deepakraj.cart.service.impl;

import com.deepakraj.cart.client.ProductClient;
import com.deepakraj.cart.client.UserClient;
import com.deepakraj.cart.dto.*;
import com.deepakraj.cart.model.CartItem;
import com.deepakraj.cart.repository.CartItemRepo;
import com.deepakraj.cart.service.CartService;
import feign.FeignException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class CartServiceImpl implements CartService {

    private final CartItemRepo cartItemRepo;
    private final ProductClient productClient;
    private final UserClient userClient;

    @Override
    public CartResponse getMyCart(String authorization) {
        UserDto user = getCurrentUser(authorization);
        return buildCartResponse(user.getId(), user.getEmail(), cartItemRepo.findByUserIdOrderByCreatedAtDesc(user.getId()));
    }

    @Override
    public CartResponse getCartByUserId(Long userId) {
        List<CartItem> items = cartItemRepo.findByUserIdOrderByCreatedAtDesc(userId);
        String userEmail = items.isEmpty() ? null : items.getFirst().getUserEmail();

        return buildCartResponse(userId, userEmail, items);
    }

    @Override
    public CartResponse addItem(String authorization, CartItemRequest request) {
        UserDto user = getCurrentUser(authorization);
        ProductDto product = getProduct(request.getProductId());
        CartItem cartItem = cartItemRepo.findByUserIdAndProductId(user.getId(), product.getId())
                .orElseGet(() -> CartItem.builder()
                        .userId(user.getId())
                        .userEmail(user.getEmail())
                        .productId(product.getId())
                        .quantity(0)
                        .build());
        int nextQuantity = cartItem.getQuantity() + request.getQuantity();

        validateStock(product, nextQuantity);
        applyProductSnapshot(cartItem, product);
        cartItem.setQuantity(nextQuantity);
        cartItemRepo.save(cartItem);

        return getMyCart(authorization);
    }

    @Override
    public CartResponse updateItem(String authorization, Long productId, QuantityUpdateRequest request) {
        UserDto user = getCurrentUser(authorization);
        ProductDto product = getProduct(productId);
        CartItem cartItem = cartItemRepo.findByUserIdAndProductId(user.getId(), productId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cart item not found"));

        validateStock(product, request.getQuantity());
        applyProductSnapshot(cartItem, product);
        cartItem.setQuantity(request.getQuantity());
        cartItemRepo.save(cartItem);

        return getMyCart(authorization);
    }

    @Override
    @Transactional
    public CartResponse removeItem(String authorization, Long productId) {
        UserDto user = getCurrentUser(authorization);
        cartItemRepo.deleteByUserIdAndProductId(user.getId(), productId);

        return getMyCart(authorization);
    }

    @Override
    @Transactional
    public void clearCart(String authorization) {
        UserDto user = getCurrentUser(authorization);
        cartItemRepo.deleteByUserId(user.getId());
    }

    private UserDto getCurrentUser(String authorization) {
        try {
            UserDto user = userClient.getCurrentUser(authorization);
            log.info("User service resolved cart user {} with id {}", user.getEmail(), user.getId());

            if (user.getId() == null) {
                log.warn("User service /api/auth/me did not return id for {}", user.getEmail());
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "User service /api/auth/me must return user id. Restart user service with the latest code.");
            }

            return user;
        } catch (FeignException.Unauthorized | FeignException.Forbidden e) {
            log.warn("User service rejected cart token with status {}", e.status());
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User token is not accepted by user service");
        } catch (FeignException e) {
            log.warn("User service call failed with status {} and body {}", e.status(), e.contentUTF8());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "User service is not reachable");
        }
    }

    private ProductDto getProduct(Long productId) {
        try {
            ProductDto product = productClient.getProductById(productId);
            log.info("Product service resolved product {} for cart", productId);

            if (product.getActive() == Boolean.FALSE) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Product is not active");
            }

            return product;
        } catch (FeignException.NotFound e) {
            log.warn("Product {} was not found by product service", productId);
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found");
        } catch (FeignException e) {
            log.warn("Product service call failed with status {} and body {}", e.status(), e.contentUTF8());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Product service is not reachable");
        }
    }

    private void validateStock(ProductDto product, Integer requestedQuantity) {
        if (product.getQuantity() != null && requestedQuantity > product.getQuantity()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Requested quantity exceeds available stock");
        }
    }

    private void applyProductSnapshot(CartItem cartItem, ProductDto product) {
        cartItem.setProductName(product.getName());
        cartItem.setSku(product.getSku());
        cartItem.setImageUrl(product.getImageUrl());
        cartItem.setUnitPrice(product.getPrice());
    }

    private CartResponse buildCartResponse(Long userId, String userEmail, List<CartItem> items) {
        List<CartItemResponse> itemResponses = items.stream()
                .map(this::toItemResponse)
                .toList();
        Integer totalQuantity = items.stream()
                .mapToInt(CartItem::getQuantity)
                .sum();
        BigDecimal totalAmount = itemResponses.stream()
                .map(CartItemResponse::getLineTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return CartResponse.builder()
                .userId(userId)
                .userEmail(userEmail)
                .items(itemResponses)
                .totalQuantity(totalQuantity)
                .totalAmount(totalAmount)
                .build();
    }

    private CartItemResponse toItemResponse(CartItem item) {
        BigDecimal lineTotal = item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity()));

        return CartItemResponse.builder()
                .id(item.getId())
                .productId(item.getProductId())
                .productName(item.getProductName())
                .sku(item.getSku())
                .imageUrl(item.getImageUrl())
                .unitPrice(item.getUnitPrice())
                .quantity(item.getQuantity())
                .lineTotal(lineTotal)
                .build();
    }
}
