package com.gametop.forbiddenwords.category;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface CategoryRepository extends JpaRepository<Category, Long> {

    List<Category> findByStandardTrueOrderBySortOrderAscIdAsc();

    List<Category> findByStandardTrueAndActiveTrueOrderBySortOrderAscIdAsc();

    List<Category> findByOwnerIdOrderByCreatedAtAsc(Long ownerId);

    long countByOwnerId(Long ownerId);

    Optional<Category> findBySlug(String slug);
}
