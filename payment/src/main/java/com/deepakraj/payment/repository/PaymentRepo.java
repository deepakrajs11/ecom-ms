package com.deepakraj.payment.repository;

import com.deepakraj.payment.model.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentRepo extends JpaRepository<Payment, Long> {

    List<Payment> findByUserEmailOrderByCreatedAtDesc(String userEmail);

    Optional<Payment> findByOrderNumber(String orderNumber);
}
