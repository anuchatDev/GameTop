package com.gametop.forbiddenwords.avalon;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface AvalonRecordRepository extends JpaRepository<AvalonRecord, Long> {

    List<AvalonRecord> findByUserId(Long userId);
}
