package com.deepakrajs.user.repo;


import com.deepakrajs.user.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepo extends JpaRepository<User, Long> {
    // Find user by email (for login)
    Optional<User> findByEmail(String email);

    // Check if email already exists (for signup validation)
    boolean existsByEmail(String email);

    // Optional: delete by email
    void deleteByEmail(String email);
}
