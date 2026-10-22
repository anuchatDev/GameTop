package com.gametop.forbiddenwords.word;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface WordRepository extends JpaRepository<Word, Long> {

    List<Word> findByActiveTrue();

    List<Word> findByActiveTrueAndCategoryIdIn(Collection<Long> categoryIds);

    List<Word> findByCategoryIdIn(Collection<Long> categoryIds);

    List<Word> findByCategoryIdOrderByIdAsc(Long categoryId);

    List<Word> findByCategoryIdIsNull();

    List<Word> findAllByOrderByCategoryIdAscIdAsc();

    long countByActiveTrue();

    Optional<Word> findFirstByCategoryIdAndTextIgnoreCase(Long categoryId, String text);

    long deleteByCategoryId(Long categoryId);
}
