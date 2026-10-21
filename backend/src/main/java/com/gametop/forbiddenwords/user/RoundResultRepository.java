package com.gametop.forbiddenwords.user;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface RoundResultRepository extends JpaRepository<RoundResult, Long> {

    List<RoundResult> findTop20ByUserIdOrderByPlayedAtDesc(Long userId);
}
