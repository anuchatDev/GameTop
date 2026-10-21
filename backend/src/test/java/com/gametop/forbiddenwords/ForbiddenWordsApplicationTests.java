package com.gametop.forbiddenwords;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import com.gametop.forbiddenwords.word.WordDeck;

@SpringBootTest
class ForbiddenWordsApplicationTests {

    @Autowired
    private WordDeck deck;

    @Test
    void loadsBasePackWithHundredWords() {
        assertThat(deck.packNames()).containsKey("base");
        assertThat(deck.all().stream().filter(c -> c.pack().equals("base"))).hasSize(100);
    }
}
