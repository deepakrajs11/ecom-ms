package com.deepakrajs.user.controller;


import com.deepakrajs.user.dto.UpdateRequestDto;
import com.deepakrajs.user.dto.UserRequestDto;
import com.deepakrajs.user.dto.UserResponseDto;
import com.deepakrajs.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    // ✅ Register User (201 CREATED)
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody UserRequestDto user) {
        UserResponseDto userPresent = userService.getUserByEmail(user.getEmail());
        if(userPresent !=null )
            throw new RuntimeException("user with the mailId already exist");
        return ResponseEntity.ok(userService.registerUser(user));
    }

    // ✅ Get User by ID (200 OK)
    @GetMapping("/{id}")
    public ResponseEntity<UserResponseDto> getUserById(@PathVariable Long id) {

        return ResponseEntity.ok(userService.getUserById(id));
    }

    // ✅ Get All Users (200 OK)
    @GetMapping
    public ResponseEntity<List<UserResponseDto>> getAllUsers() {

        return ResponseEntity.ok(userService.getAllUsers());
    }

    // ✅ Update User (200 OK)
    @PutMapping("/{id}")
    public ResponseEntity<UserResponseDto> updateUser(
            @PathVariable Long id,
            @Valid @RequestBody UpdateRequestDto request) {

        return ResponseEntity.ok(userService.updateUser(id, request));
    }

    @PutMapping("/updateByEmail")
    public ResponseEntity<?> updateUser(
            Authentication authentication,
            @Valid @RequestBody UpdateRequestDto request) {
        try {
            if (authentication == null) {
                return ResponseEntity.status(401).body("Unauthorized");
            }
            if(!authentication.getName().equals(request.getEmail())){
                return ResponseEntity.status(500).body("Illegal Operation Found");
            }
            Long id = userService.getUserByEmail(request.getEmail()).getId();
            return ResponseEntity.ok(userService.updateUser(id, request));
        }
        catch (Exception e){
            return ResponseEntity.status(400).body(e.getMessage());
        }

    }

    // ✅ Delete User (204 NO CONTENT)
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {

        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }

   }