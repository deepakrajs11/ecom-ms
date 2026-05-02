package com.deepakrajs.user.repo;

import com.deepakrajs.user.model.OtpEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface OtpRepo extends JpaRepository<OtpEntity, Long> {
    Optional<OtpEntity> findTopByEmailOrderByExpiryTimeDesc(String email);
}
