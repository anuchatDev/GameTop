package com.gametop.forbiddenwords.word;

import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/words")
public class WordController {

    private final WordDeck deck;

    public WordController(WordDeck deck) {
        this.deck = deck;
    }

    @GetMapping
    public List<WordCard> list(@RequestParam(required = false) String pack) {
        if (pack == null) {
            return deck.all();
        }
        return deck.all().stream().filter(c -> c.pack().equals(pack)).toList();
    }

    @GetMapping("/packs")
    public Map<String, String> packs() {
        return deck.packNames();
    }
}
