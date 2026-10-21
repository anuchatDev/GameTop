package com.gametop.forbiddenwords.room;

import org.springframework.stereotype.Component;

import com.gametop.forbiddenwords.config.GameProperties;

/**
 * กติกาการคิดคะแนนต่อรอบ:
 * <ul>
 *   <li>หลอกให้คนอื่นพูดคำต้องห้ามได้ = +killScore ต่อคน (ได้แม้ตัวเองจะตกรอบทีหลัง)</li>
 *   <li>ตกรอบ = ไม่ได้คะแนนการอยู่รอด</li>
 *   <li>อยู่รอดจนหมดเวลา = surviveScore (0.5)</li>
 *   <li>อยู่รอด + ทายคำบนหัวตัวเองถูก = surviveCorrectScore (1)</li>
 * </ul>
 */
@Component
public class ScoreCalculator {

    private final GameProperties props;

    public ScoreCalculator(GameProperties props) {
        this.props = props;
    }

    public double roundScore(Player player) {
        double score = player.getKills() * props.killScore();
        if (player.isAlive()) {
            score += Boolean.TRUE.equals(player.getGuessCorrect())
                    ? props.surviveCorrectScore()
                    : props.surviveScore();
        }
        return score;
    }

    /** เทียบคำที่ทายกับคำจริง โดยไม่สนช่องว่างและตัวพิมพ์เล็ก/ใหญ่ */
    public static boolean isCorrectGuess(String guess, String answer) {
        return normalize(guess).equals(normalize(answer));
    }

    private static String normalize(String s) {
        return s.replaceAll("\\s+", "").toLowerCase();
    }
}
