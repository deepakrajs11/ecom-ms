package com.deepakrajs.user.service;

import com.deepakrajs.user.dto.UserRequestDto;
import com.deepakrajs.user.dto.UserResponseDto;

import java.util.List;

public interface UserService {

    UserResponseDto registerUser(UserRequestDto request);

    UserResponseDto getUserById(Long id);

    List<UserResponseDto> getAllUsers();

    UserResponseDto updateUser(Long id, UserRequestDto request);

    void deleteUser(Long id);

    UserResponseDto getUserByEmail(String email);
}
