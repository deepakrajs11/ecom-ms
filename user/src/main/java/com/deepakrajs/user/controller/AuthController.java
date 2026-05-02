package com.deepakrajs.user.controller;

import com.deepakrajs.user.component.JwtUtil;
import com.deepakrajs.user.dto.LoginRequestDto;
import com.deepakrajs.user.dto.Role;
import com.deepakrajs.user.model.OtpEntity;
import com.deepakrajs.user.model.User;
import com.deepakrajs.user.repo.OtpRepo;
import com.deepakrajs.user.repo.UserRepo;
import com.deepakrajs.user.service.EmailService;
import com.deepakrajs.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    private final UserService userService;
    private final UserRepo userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final EmailService emailService;
    private final OtpRepo otpRepo;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequestDto request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid credentials");
        }

        String token = jwtUtil.generateToken(user.getEmail(), user.getRole());

        return ResponseEntity.ok(Map.of(
                "token", token,
                "id", user.getId(),
                "name", user.getName(),
                "email", user.getEmail(),
                "role", user.getRole()
        ));
    }

    // ✅ Register User (201 CREATED)
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User user) {

        if (userRepository.findByEmail(user.getEmail()).isPresent()) {
            return ResponseEntity.badRequest().body("Email already exists");
        }
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        if (user.getRole()==null){
           user.setRole(Role.USER);
        }
        User saved = userRepository.save(user);
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/me")
    public ResponseEntity<?> getUser(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body("Unauthorized");
        }
        User user = userRepository.findByEmail(authentication.getName()).get();

        return ResponseEntity.ok(Map.of(
                "id", user.getId(),
                "name", user.getName(),
                "email", authentication.getName(),
                "role", user.getRole(),
                "roles", authentication.getAuthorities()
        ));
    }

    @PostMapping("/validateEmail")
    public ResponseEntity<?> sendOTP(@RequestBody String email){

        try {
            SecureRandom random = new SecureRandom();
            String otp = String.valueOf(100000 + random.nextInt(900000));

            // Save OTP
            OtpEntity entity = new OtpEntity();
            entity.setEmail(email);
            entity.setOtp(otp);
            entity.setExpiryTime(LocalDateTime.now().plusMinutes(10));
            entity.setUsed(false);

            otpRepo.save(entity);

            // Send email
            emailService.sendOtp(email, otp);

            return ResponseEntity.ok("Mail Sent");

        } catch (Exception e){
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }

    @PostMapping("/verifyOtp")
    public ResponseEntity<?> verifyOtp(@RequestBody Map<String, String> req) {

        String email = req.get("email");
        String otp = req.get("otp");

        OtpEntity record = otpRepo
                .findTopByEmailOrderByExpiryTimeDesc(email)
                .orElseThrow(() -> new RuntimeException("Invalid OTP"));

        if (record.isUsed() ||
                record.getExpiryTime().isBefore(LocalDateTime.now()) ||
                !record.getOtp().equals(otp)) {

            return ResponseEntity.badRequest().body("Invalid or expired OTP");
        }

        record.setUsed(true);
        otpRepo.save(record);

        return ResponseEntity.ok("OTP verified");
    }

    @PutMapping("/password-reset")
    public ResponseEntity<String> updatePassword(@RequestBody Map<String, String> req) {
        try {
            String email = req.get("email");
            String otp = req.get("otp");
            String password = req.get("password");
            OtpEntity record = otpRepo
                    .findTopByEmailOrderByExpiryTimeDesc(email)
                    .orElseThrow(() -> new RuntimeException("Invalid OTP"));

            if (record.isUsed() ||
                    record.getExpiryTime().isBefore(LocalDateTime.now()) ||
                    !record.getOtp().equals(otp)) {

                return ResponseEntity.badRequest().body("Invalid or expired OTP");
            }

            record.setUsed(true);
            otpRepo.save(record);
            User user = userRepository.findByEmail(email).orElseThrow();
            user.setPassword(passwordEncoder.encode(password));
            userRepository.save(user);
            return ResponseEntity.ok("Password Updated");
        } catch (Exception e) {
            return ResponseEntity.status(500).body(e.getMessage());

        }
    }

}
