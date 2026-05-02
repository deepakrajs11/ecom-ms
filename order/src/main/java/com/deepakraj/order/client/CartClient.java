package com.deepakraj.order.client;

import com.deepakraj.order.dto.CartDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;

@FeignClient(name = "cart-service", url = "${services.cart.url}")
public interface CartClient {

    @GetMapping("/api/cart")
    CartDto getMyCart(@RequestHeader("Authorization") String authorization);

    @DeleteMapping("/api/cart")
    void clearCart(@RequestHeader("Authorization") String authorization);
}
