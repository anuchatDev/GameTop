package com.gametop.forbiddenwords.word;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface WordRepository extends JpaRepository<Word, Long> {

    List<Word> findByActiveTrue();

    List<Word> findAllByOrderByPackAscCategoryAscIdAsc();

    long countByActiveTrue();

    Optional<Word> findFirstByTextIgnoreCase(String text);
}
