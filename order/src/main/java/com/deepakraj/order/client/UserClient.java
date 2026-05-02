package com.deepakraj.order.client;

import com.deepakraj.order.dto.UserDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;

@FeignClient(name = "user-service", url = "${services.user.url}")
public interface UserClient {

    @GetMapping("/api/auth/me")
    UserDto getCurrentUser(@RequestHeader("Authorization") String authorization);
}
