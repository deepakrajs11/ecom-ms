package com.deepakraj.product.service;


import com.deepakraj.product.model.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Optional;

public interface ProductService {

    // Create
    Product createProduct(Product product);

    // Read
    Optional<Product> getProductById(Long id);

    Optional<Product> getProductBySku(String sku);

    Page<Product> getAllActiveProducts(Pageable pageable);

    Page<Product> getProductsByCategory(String category, Pageable pageable);

    Page<Product> searchProductsByName(String name, Pageable pageable);

    // Update
    Product updateProduct(Long id, Product product);

    // Delete (soft delete recommended)
    void deleteProduct(Long id);

    // Utility
    boolean existsBySku(String sku);
}