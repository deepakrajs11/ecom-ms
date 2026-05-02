package com.deepakrajs.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateRequestDto {
    @Size(min = 3, max = 50)
    private String name;

    @Email
    @NotBlank
    private String email;

    @Size(min = 6)
    private String password;

    private String role;
}
