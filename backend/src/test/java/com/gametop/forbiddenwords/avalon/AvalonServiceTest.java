package com.gametop.forbiddenwords.avalon;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import java.util.stream.IntStream;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.gametop.forbiddenwords.auth.AuthUser;
import com.gametop.forbiddenwords.avalon.AvalonRoom.Phase;
import com.gametop.forbiddenwords.avalon.AvalonRoom.Role;
import com.gametop.forbiddenwords.avalon.AvalonRoom.Settings;
import com.gametop.forbiddenwords.avalon.AvalonRoom.Team;
import com.gametop.forbiddenwords.avalon.AvalonRoom.WinReason;
import com.gametop.forbiddenwords.common.ApiException;
import com.gametop.forbiddenwords.config.GameProperties;

class AvalonServiceTest {

    private static final GameProperties PROPS = new GameProperties(300, 2, 0, 1.0, 0.5, 1.0, 6, 3);

    /** ไม่สับ — 5 คน: [0]=เมอร์ลิน [1]=เพอร์ซิวาล [2]=ผู้รับใช้ [3]=มือสังหาร [4]=มอร์แกนา */
    private AvalonService service;
    private final List<List<AvalonService.Recorder.Outcome>> recorded = new ArrayList<>();
    private List<AuthUser> users;

    @BeforeEach
    void setUp() {
        Clock clock = Clock.fixed(Instant.parse("2026-01-01T00:00:00Z"), ZoneOffset.UTC);
        service = new AvalonService(clock, PROPS, recorded::add, ArrayList::new, new Random(1));
        users = IntStream.rangeClosed(1, 10)
                .mapToObj(i -> new AuthUser((long) i, "p" + i, com.gametop.forbiddenwords.user.Role.PLAYER)).toList();
    }

    private String room(int players) {
        String code = service.create(users.get(0)).code();
        for (int i = 1; i < players; i++) {
            service.join(code, users.get(i));
        }
        return code;
    }

    private String id(String code, int player) {
        return service.get(code, users.get(0)).players().get(player).id();
    }

    private AuthUser leader(String code) {
        AvalonView v = service.get(code, users.get(0));
        int idx = IntStream.range(0, v.players().size()).filter(i -> v.players().get(i).id().equals(v.leaderId()))
                .findFirst().orElseThrow();
        return users.get(idx);
    }

    /** หัวหน้าเสนอทีมจากผู้เล่นลำดับที่กำหนด แล้วทุกคนโหวตตาม approve */
    private AvalonView proposeAndVote(String code, int players, boolean approve, int... team) {
        service.propose(code, leader(code), IntStream.of(team).mapToObj(i -> id(code, i)).toList());
        AvalonView v = null;
        for (int i = 0; i < players; i++) {
            v = service.vote(code, users.get(i), approve);
        }
        return v;
    }

    private AvalonView runQuest(String code, boolean evilFails, int... team) {
        AvalonView v = null;
        for (int i : team) {
            Role role = roleOf(code, i);
            v = service.quest(code, users.get(i), !(evilFails && role.team == Team.EVIL));
        }
        return v;
    }

    private Role roleOf(String code, int player) {
        return service.get(code, users.get(player)).me().role();
    }

    @Test
    void dealsRolesByPlayerCountAndShowsEachRoleOnlyWhatItShouldKnow() {
        String code = room(5);
        service.start(code, users.get(0));
        AvalonView merlin = service.get(code, users.get(0));
        assertThat(merlin.me().role()).isEqualTo(Role.MERLIN);
        assertThat(merlin.me().seen()).containsOnlyKeys(id(code, 3), id(code, 4));

        AvalonView percival = service.get(code, users.get(1));
        assertThat(percival.me().seen()).containsOnlyKeys(id(code, 0), id(code, 4))
                .containsValue(AvalonService.MERLIN_LABEL);

        assertThat(service.get(code, users.get(2)).me().seen()).isEmpty();
        assertThat(service.get(code, users.get(3)).me().seen()).containsOnlyKeys(id(code, 4));
        // ไม่มีใครเห็นบทบาทคนอื่นระหว่างเล่น
        assertThat(merlin.players()).allMatch(p -> p.role() == null);
        assertThat(merlin.teamSizes()).containsExactly(2, 3, 2, 3, 3);
        assertThat(merlin.evilCount()).isEqualTo(2);
    }

    @Test
    void mordredHiddenFromMerlinAndOberonHiddenFromEvil() {
        assertThat(AvalonService.rolesFor(10, new Settings(true, true, true, true)))
                .containsExactly(Role.MERLIN, Role.PERCIVAL, Role.SERVANT, Role.SERVANT, Role.SERVANT, Role.SERVANT,
                        Role.ASSASSIN, Role.MORGANA, Role.MORDRED, Role.OBERON);
        String code = room(10);
        service.updateSettings(code, users.get(0), new Settings(true, true, true, true));
        service.start(code, users.get(0));
        // [6]=มือสังหาร [7]=มอร์แกนา [8]=มอร์เดรด [9]=โอเบอรอน
        assertThat(service.get(code, users.get(0)).me().seen()).containsOnlyKeys(id(code, 6), id(code, 7), id(code, 9));
        assertThat(service.get(code, users.get(6)).me().seen()).containsOnlyKeys(id(code, 7), id(code, 8));
        assertThat(service.get(code, users.get(9)).me().seen()).isEmpty();
    }

    @Test
    void tooManyEvilSpecialsIsRejected() {
        String code = room(5);
        service.updateSettings(code, users.get(0), new Settings(true, true, true, false));
        assertThatThrownBy(() -> service.start(code, users.get(0))).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> service.start(room(4), users.get(0))).isInstanceOf(ApiException.class);
    }

    @Test
    void onlyLeaderProposesExactTeamSizeAndTieRejectsAndPassesLeadership() {
        String code = room(6);
        service.start(code, users.get(0));
        AuthUser first = leader(code);
        AuthUser notLeader = users.stream().filter(u -> u != first).findFirst().orElseThrow();
        assertThatThrownBy(() -> service.propose(code, notLeader, List.of(id(code, 0), id(code, 1))))
                .isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> service.propose(code, first, List.of(id(code, 0))))
                .isInstanceOf(ApiException.class);

        service.propose(code, first, List.of(id(code, 0), id(code, 1)));
        // 3 เห็นชอบ 3 ไม่เห็นชอบ = เสมอ = ไม่ผ่าน
        for (int i = 0; i < 6; i++) {
            service.vote(code, users.get(i), i < 3);
        }
        AvalonView v = service.get(code, users.get(0));
        assertThat(v.phase()).isEqualTo(Phase.TEAM_BUILDING);
        assertThat(v.rejects()).isEqualTo(1);
        assertThat(v.history()).hasSize(1).first().satisfies(h -> {
            assertThat(h.approved()).isFalse();
            assertThat(h.votes()).hasSize(6);
        });
        assertThat(leader(code)).isNotEqualTo(first);
    }

    @Test
    void fiveRejectionsInARowEvilWins() {
        String code = room(5);
        service.start(code, users.get(0));
        AvalonView v = null;
        for (int i = 0; i < 5; i++) {
            v = proposeAndVote(code, 5, false, 0, 1);
        }
        assertThat(v.phase()).isEqualTo(Phase.RESULT);
        assertThat(v.result().winner()).isEqualTo(Team.EVIL);
        assertThat(v.result().reason()).isEqualTo(WinReason.FIVE_REJECTS);
        assertThat(recorded).hasSize(1);
    }

    @Test
    void goodCannotFailAndOneFailFailsQuest() {
        String code = room(5);
        service.start(code, users.get(0));
        proposeAndVote(code, 5, true, 0, 3);
        assertThatThrownBy(() -> service.quest(code, users.get(0), false)).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> service.quest(code, users.get(2), true)).isInstanceOf(ApiException.class);
        AvalonView v = runQuest(code, true, 0, 3);
        assertThat(v.quests()).hasSize(1).first().satisfies(q -> {
            assertThat(q.success()).isFalse();
            assertThat(q.fails()).isEqualTo(1);
        });
        assertThat(v.questIndex()).isEqualTo(1);
    }

    @Test
    void fourthQuestNeedsTwoFailsWithSevenPlayers() {
        String code = room(7);
        service.start(code, users.get(0));
        // 7 คน: [0]เมอร์ลิน [1]เพอร์ซิวาล [2][3]ผู้รับใช้ [4]มือสังหาร [5]มอร์แกนา [6]สมุน
        proposeAndVote(code, 7, true, 0, 1);
        runQuest(code, false, 0, 1);
        proposeAndVote(code, 7, true, 0, 1, 4);
        runQuest(code, true, 0, 1, 4);
        proposeAndVote(code, 7, true, 0, 1, 4);
        runQuest(code, true, 0, 1, 4);
        // ภารกิจ 4: ทีม 4 คน มีฝ่ายร้าย 1 คนลงล้มเหลว → ยังสำเร็จ
        proposeAndVote(code, 7, true, 0, 1, 2, 4);
        AvalonView v = runQuest(code, true, 0, 1, 2, 4);
        assertThat(v.twoFailQuest()).isEqualTo(3);
        assertThat(v.quests().get(3).fails()).isEqualTo(1);
        assertThat(v.quests().get(3).success()).isTrue();
    }

    @Test
    void threeSuccessesGoToAssassinationAndMissingMerlinGivesGoodTheWin() {
        String code = room(5);
        service.start(code, users.get(0));
        for (int q = 0; q < 3; q++) {
            int[] team = q == 1 ? new int[] {0, 1, 2} : new int[] {0, 1};
            proposeAndVote(code, 5, true, team);
            runQuest(code, false, team);
        }
        AvalonView v = service.get(code, users.get(0));
        assertThat(v.phase()).isEqualTo(Phase.ASSASSINATION);
        assertThat(v.assassinId()).isEqualTo(id(code, 3));
        assertThatThrownBy(() -> service.assassinate(code, users.get(0), id(code, 1))).isInstanceOf(ApiException.class);

        AvalonView r = service.assassinate(code, users.get(3), id(code, 1));
        assertThat(r.result().winner()).isEqualTo(Team.GOOD);
        assertThat(r.result().reason()).isEqualTo(WinReason.MERLIN_SURVIVED);
        assertThat(r.players()).allMatch(p -> p.role() != null);
        assertThat(recorded.get(0)).filteredOn(AvalonService.Recorder.Outcome::won).hasSize(3);
    }

    @Test
    void assassinFindingMerlinFlipsTheGame() {
        String code = room(5);
        service.start(code, users.get(0));
        for (int q = 0; q < 3; q++) {
            int[] team = q == 1 ? new int[] {0, 1, 2} : new int[] {0, 1};
            proposeAndVote(code, 5, true, team);
            runQuest(code, false, team);
        }
        AvalonView r = service.assassinate(code, users.get(3), id(code, 0));
        assertThat(r.result().winner()).isEqualTo(Team.EVIL);
        assertThat(r.result().reason()).isEqualTo(WinReason.MERLIN_ASSASSINATED);
    }

    @Test
    void threeFailedQuestsEvilWins() {
        String code = room(5);
        service.start(code, users.get(0));
        AvalonView v = null;
        for (int q = 0; q < 3; q++) {
            int[] team = q == 1 ? new int[] {0, 3, 4} : new int[] {0, 3};
            proposeAndVote(code, 5, true, team);
            v = runQuest(code, true, team);
        }
        assertThat(v.result().winner()).isEqualTo(Team.EVIL);
        assertThat(v.result().reason()).isEqualTo(WinReason.QUESTS_FAILED);
    }
}
