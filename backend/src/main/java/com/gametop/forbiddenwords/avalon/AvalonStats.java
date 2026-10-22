package com.gametop.forbiddenwords.avalon;

import java.time.Clock;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gametop.forbiddenwords.avalon.AvalonRoom.Role;
import com.gametop.forbiddenwords.avalon.AvalonRoom.Team;

/**
 * บันทึกผลเกมลงฐานข้อมูล และสรุปสถิติของผู้เล่น
 */
@Service
public class AvalonStats implements AvalonService.Recorder {

    /**
     * @param favoriteRole บทบาทที่ได้บ่อยที่สุด (null = ยังไม่เคยเล่น)
     */
    public record Summary(int games, int wins, int winRate, int goodGames, int evilGames, Role favoriteRole,
                          Map<Role, Integer> roles) {
    }

    private final AvalonRecordRepository records;
    private final Clock clock;

    public AvalonStats(AvalonRecordRepository records, Clock clock) {
        this.records = records;
        this.clock = clock;
    }

    @Override
    @Transactional
    public void record(List<Outcome> outcomes) {
        records.saveAll(outcomes.stream()
                .map(o -> new AvalonRecord(o.userId(), o.role(), o.won(), clock.instant())).toList());
    }

    @Transactional(readOnly = true)
    public Summary summary(Long userId) {
        List<AvalonRecord> mine = records.findByUserId(userId);
        Map<Role, Integer> roles = new EnumMap<>(Role.class);
        mine.forEach(r -> roles.merge(r.getRole(), 1, Integer::sum));
        int wins = (int) mine.stream().filter(AvalonRecord::isWon).count();
        int good = (int) mine.stream().filter(r -> r.getRole().team == Team.GOOD).count();
        Role favorite = roles.entrySet().stream().max(Comparator.comparingInt(Map.Entry::getValue))
                .map(Map.Entry::getKey).orElse(null);
        int rate = mine.isEmpty() ? 0 : Math.round(wins * 100f / mine.size());
        return new Summary(mine.size(), wins, rate, good, mine.size() - good, favorite, roles);
    }
}
