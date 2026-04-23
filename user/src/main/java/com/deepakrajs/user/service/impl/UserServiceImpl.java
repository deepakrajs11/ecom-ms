package com.deepakrajs.user.service.impl;

import com.deepakrajs.user.dto.Role;
import com.deepakrajs.user.dto.UserRequestDto;
import com.deepakrajs.user.dto.UserResponseDto;
import com.deepakrajs.user.model.User;
import com.deepakrajs.user.repo.UserRepo;
import com.deepakrajs.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepo userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public UserResponseDto registerUser(UserRequestDto request) {

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already in use");
        }

        User user = mapToEntity(request);

        // 🔐 hash password
        user.setPassword(passwordEncoder.encode(request.getPassword()));

        User savedUser = userRepository.save(user);

        return mapToResponse(savedUser);
    }

    @Override
    public UserResponseDto getUserById(Long id) {
        User user = getUserEntity(id);
        return mapToResponse(user);
    }

    @Override
    public List<UserResponseDto> getAllUsers() {
        return userRepository.findAll()
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    public UserResponseDto updateUser(Long id, UserRequestDto request) {

        User existingUser = getUserEntity(id);

        existingUser.setName(request.getName());
        existingUser.setEmail(request.getEmail());
        existingUser.setRole(Role.valueOf(request.getRole()));

        // Optional: update password only if provided
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            existingUser.setPassword(passwordEncoder.encode(request.getPassword()));
        }

        User updatedUser = userRepository.save(existingUser);

        return mapToResponse(updatedUser);
    }

    @Override
    public void deleteUser(Long id) {
        User user = getUserEntity(id);
        userRepository.delete(user);
    }

    public UserResponseDto getUserByEmail(String email) {
        try {
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));
            return mapToResponse(user);
        } catch (RuntimeException e) {
            return null;
        }
    }

    // ---------------- Helper Methods ----------------

    private User getUserEntity(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private User mapToEntity(UserRequestDto request) {
        return User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(request.getPassword()) // will be encoded later
                .role(Role.valueOf(request.getRole()))
                .build();
    }

    private UserResponseDto mapToResponse(User user) {
        return UserResponseDto.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole().name())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
