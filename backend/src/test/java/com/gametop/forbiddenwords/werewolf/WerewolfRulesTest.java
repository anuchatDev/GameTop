package com.gametop.forbiddenwords.werewolf;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.HashMap;
import java.util.Map;

import org.junit.jupiter.api.Test;

import com.gametop.forbiddenwords.werewolf.WerewolfRules.Winner;

class WerewolfRulesTest {

    @Test
    void suggestionMatchesBrdForFivePlayersAndAlwaysFillsPlayersPlusThree() {
        Map<WwRole, Integer> five = WerewolfRules.suggest(5);
        assertThat(five).containsEntry(WwRole.WEREWOLF, 2).containsEntry(WwRole.SEER, 1)
                .containsEntry(WwRole.ROBBER, 1).containsEntry(WwRole.TROUBLEMAKER, 1)
                .containsEntry(WwRole.VILLAGER, 3);
        for (int n = WerewolfRules.MIN_PLAYERS; n <= WerewolfRules.MAX_PLAYERS; n++) {
            assertThat(WerewolfRules.validateDeck(WerewolfRules.suggest(n), n)).as("players=" + n).isNull();
        }
    }

    @Test
    void deckMustEqualPlayersPlusThree() {
        Map<WwRole, Integer> deck = WerewolfRules.suggest(5);
        assertThat(WerewolfRules.validateDeck(deck, 4)).contains("7 ใบ");
        assertThat(WerewolfRules.validateDeck(Map.of(WwRole.VILLAGER, 3, WwRole.SEER, 1, WwRole.ROBBER, 1,
                WwRole.TROUBLEMAKER, 1), 3)).contains("หมาป่า");
        assertThat(WerewolfRules.validateDeck(Map.of(WwRole.WEREWOLF, 3, WwRole.VILLAGER, 3), 3)).contains("0-2");
    }

    @Test
    void villageWinsWhenAWerewolfIsKilled() {
        var roles = Map.of("a", WwRole.WEREWOLF, "b", WwRole.SEER, "c", WwRole.VILLAGER);
        var outcome = WerewolfRules.decide(roles, votes("a", "b", "b", "a", "c", "a"));
        assertThat(outcome.killedIds()).containsExactly("a");
        assertThat(outcome.winner()).isEqualTo(Winner.VILLAGE);
    }

    @Test
    void werewolvesWinWhenWrongPersonOrNobodyDies() {
        var roles = Map.of("a", WwRole.WEREWOLF, "b", WwRole.SEER, "c", WwRole.VILLAGER);
        assertThat(WerewolfRules.decide(roles, votes("a", "b", "b", "c", "c", "b")).winner()).isEqualTo(Winner.WEREWOLF);
        // ทุกคนได้คนละเสียง = ไม่มีใครตาย
        var spread = WerewolfRules.decide(roles, votes("a", "b", "b", "c", "c", "a"));
        assertThat(spread.killedIds()).isEmpty();
        assertThat(spread.winner()).isEqualTo(Winner.WEREWOLF);
    }

    @Test
    void tiedPlayersAllDie() {
        var roles = Map.of("a", WwRole.WEREWOLF, "b", WwRole.SEER, "c", WwRole.VILLAGER, "d", WwRole.ROBBER);
        var outcome = WerewolfRules.decide(roles, votes("a", "b", "b", "a", "c", "a", "d", "b"));
        assertThat(outcome.killedIds()).containsExactlyInAnyOrder("a", "b");
        assertThat(outcome.winner()).isEqualTo(Winner.VILLAGE);
    }

    @Test
    void noWerewolvesInPlay() {
        var roles = Map.of("a", WwRole.MINION, "b", WwRole.SEER, "c", WwRole.VILLAGER);
        // ทุกคนโหวตการ์ดกลาง → ไม่มีใครตาย → ชาวบ้านชนะ
        var center = WerewolfRules.decide(roles, votes("a", "CENTER", "b", "CENTER", "c", "CENTER"));
        assertThat(center.killedIds()).isEmpty();
        assertThat(center.winner()).isEqualTo(Winner.VILLAGE);
        // ชาวบ้านตายและลูกน้องรอด → ลูกน้องหมาป่าชนะ
        assertThat(WerewolfRules.decide(roles, votes("a", "c", "b", "c", "c", "a")).winner()).isEqualTo(Winner.WEREWOLF);
        // ลูกน้องตาย → ไม่มีใครชนะ
        assertThat(WerewolfRules.decide(roles, votes("a", "b", "b", "a", "c", "a")).winner()).isEqualTo(Winner.NONE);
    }

    @Test
    void winnerByFinalRoleTeam() {
        assertThat(WerewolfRules.isWinner(WwRole.MINION, Winner.WEREWOLF)).isTrue();
        assertThat(WerewolfRules.isWinner(WwRole.ROBBER, Winner.VILLAGE)).isTrue();
        assertThat(WerewolfRules.isWinner(WwRole.WEREWOLF, Winner.VILLAGE)).isFalse();
        assertThat(WerewolfRules.isWinner(WwRole.SEER, Winner.NONE)).isFalse();
    }

    private static Map<String, String> votes(String... pairs) {
        Map<String, String> m = new HashMap<>();
        for (int i = 0; i < pairs.length; i += 2) {
            m.put(pairs[i], pairs[i + 1]);
        }
        return m;
    }
}
