package com.deepakraj.product.service.impl;


import com.deepakraj.product.model.Product;
import com.deepakraj.product.service.ProductService;
import com.deepakraj.product.repository.ProductRepo;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ProductServiceImpl implements ProductService {

    private final ProductRepo productRepo;

    // ✅ Create
    @Override
    public Product createProduct(Product product) {
        if (productRepo.existsBySku(product.getSku())) {
            throw new IllegalArgumentException("Product with SKU already exists");
        }
        return productRepo.save(product);
    }

    // ✅ Read
    @Override
    public Optional<Product> getProductById(Long id) {
        return productRepo.findById(id)
                .filter(Product::getActive);
    }

    @Override
    public Optional<Product> getProductBySku(String sku) {
        return productRepo.findBySku(sku)
                .filter(Product::getActive);
    }

    @Override
    public Page<Product> getAllActiveProducts(Pageable pageable) {
        return productRepo.findByActiveTrue(pageable);
    }

    @Override
    public Page<Product> getProductsByCategory(String category, Pageable pageable) {
        return productRepo.findByCategoryAndActiveTrue(category, pageable);
    }

    @Override
    public Page<Product> searchProductsByName(String name, Pageable pageable) {
        return productRepo.findByNameContainingIgnoreCaseAndActiveTrue(name, pageable);
    }

    // ✅ Update
    @Override
    public Product updateProduct(Long id, Product updatedProduct) {
        Product existing = productRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Product not found with id: " + id));

        // Optional: prevent SKU duplication
        if (!existing.getSku().equals(updatedProduct.getSku()) &&
                productRepo.existsBySku(updatedProduct.getSku())) {
            throw new IllegalArgumentException("SKU already in use");
        }

        // Update fields
        existing.setName(updatedProduct.getName());
        existing.setDescription(updatedProduct.getDescription());
        existing.setSku(updatedProduct.getSku());
        existing.setPrice(updatedProduct.getPrice());
        existing.setQuantity(updatedProduct.getQuantity());
        existing.setCategory(updatedProduct.getCategory());
        existing.setImageUrl(updatedProduct.getImageUrl());
        existing.setActive(updatedProduct.getActive());

        return productRepo.save(existing);
    }

    // ✅ Soft Delete
    @Override
    public void deleteProduct(Long id) {
        Product product = productRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Product not found with id: " + id));

        product.setActive(false);
        productRepo.save(product);
    }

    // ✅ Utility
    @Override
    public boolean existsBySku(String sku) {
        return productRepo.existsBySku(sku);
    }
}
