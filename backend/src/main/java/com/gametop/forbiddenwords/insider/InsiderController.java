package com.gametop.forbiddenwords.insider;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.gametop.forbiddenwords.auth.AuthInterceptor;
import com.gametop.forbiddenwords.auth.AuthUser;
import com.gametop.forbiddenwords.category.CategoryService;
import com.gametop.forbiddenwords.insider.InsiderRoom.Answer;
import com.gametop.forbiddenwords.room.CategoryRef;
import com.gametop.forbiddenwords.word.Difficulty;

@RestController
@RequestMapping("/api/insider/rooms")
public class InsiderController {

    private final InsiderService service;
    private final CategoryService categories;

    public InsiderController(InsiderService service, CategoryService categories) {
        this.service = service;
        this.categories = categories;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public InsiderView create(@RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user) {
        return service.create(user);
    }

    @PostMapping("/{code}/players")
    public InsiderView join(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user) {
        return service.join(code, user);
    }

    @GetMapping("/{code}")
    public InsiderView get(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user) {
        return service.get(code, user);
    }

    /**
     * body: {questionSeconds?, categoryIds?, difficulty?} — ถ้าส่ง key "difficulty" มา (แม้เป็น null = ทุกระดับ) จะเปลี่ยนค่า
     */
    @PostMapping("/{code}/settings")
    public InsiderView settings(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user,
                                @RequestBody Map<String, Object> body) {
        Integer seconds = body.get("questionSeconds") instanceof Number n ? n.intValue() : null;
        List<CategoryRef> cats = null;
        if (body.get("categoryIds") instanceof List<?> ids) {
            cats = categories.resolveForHost(user, ids.stream().map(o -> ((Number) o).longValue()).toList());
        }
        boolean difficultyGiven = body.containsKey("difficulty");
        Difficulty difficulty = body.get("difficulty") instanceof String s ? Difficulty.valueOf(s) : null;
        return service.updateSettings(code, user, seconds, cats, difficulty, difficultyGiven);
    }

    @PostMapping("/{code}/start")
    public InsiderView start(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user) {
        return service.start(code, user);
    }

    @PostMapping("/{code}/begin")
    public InsiderView begin(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user) {
        return service.beginQuestions(code, user);
    }

    @PostMapping("/{code}/ask")
    public InsiderView ask(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user,
                           @RequestBody TextRequest request) {
        return service.ask(code, user, request.text());
    }

    @PostMapping("/{code}/answer")
    public InsiderView answer(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user,
                              @RequestBody AnswerRequest request) {
        return service.answer(code, user, request.entryId(), request.answer());
    }

    @PostMapping("/{code}/guess")
    public InsiderView guess(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user,
                             @RequestBody TextRequest request) {
        return service.guess(code, user, request.text());
    }

    @PostMapping("/{code}/correct")
    public InsiderView correct(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user,
                               @RequestBody PlayerRequest request) {
        return service.markCorrect(code, user, request.playerId());
    }

    @PostMapping("/{code}/vote")
    public InsiderView vote(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user,
                            @RequestBody PlayerRequest request) {
        return service.vote(code, user, request.playerId());
    }

    @PostMapping("/{code}/end-vote")
    public InsiderView endVote(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user) {
        return service.endVoting(code, user);
    }

    @PostMapping("/{code}/again")
    public InsiderView again(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user) {
        return service.playAgain(code, user);
    }

    public record TextRequest(String text) {
    }

    public record AnswerRequest(int entryId, Answer answer) {
    }

    public record PlayerRequest(String playerId) {
    }
}
