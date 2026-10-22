package com.gametop.forbiddenwords.spyfall;

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

@RestController
@RequestMapping("/api/spyfall/rooms")
public class SpyfallController {

    private final SpyfallService service;

    public SpyfallController(SpyfallService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SpyfallView create(@RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user) {
        return service.create(user);
    }

    @PostMapping("/{code}/players")
    public SpyfallView join(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user) {
        return service.join(code, user);
    }

    @GetMapping("/{code}")
    public SpyfallView get(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user) {
        return service.get(code, user);
    }

    @PostMapping("/{code}/settings")
    public SpyfallView settings(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user,
                                @RequestBody SettingsRequest request) {
        return service.updateSettings(code, user, request.roundSeconds());
    }

    @PostMapping("/{code}/start")
    public SpyfallView start(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user) {
        return service.start(code, user);
    }

    @PostMapping("/{code}/ask")
    public SpyfallView ask(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user,
                           @RequestBody PlayerRequest request) {
        return service.ask(code, user, request.playerId());
    }

    @PostMapping("/{code}/accuse")
    public SpyfallView accuse(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user,
                              @RequestBody PlayerRequest request) {
        return service.accuse(code, user, request.playerId());
    }

    @PostMapping("/{code}/accuse-vote")
    public SpyfallView accuseVote(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user,
                                  @RequestBody AgreeRequest request) {
        return service.accuseVote(code, user, request.agree());
    }

    @PostMapping("/{code}/spy-guess")
    public SpyfallView spyGuess(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user,
                                @RequestBody LocationRequest request) {
        return service.spyGuess(code, user, request.location());
    }

    @PostMapping("/{code}/vote")
    public SpyfallView vote(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user,
                            @RequestBody PlayerRequest request) {
        return service.vote(code, user, request.playerId());
    }

    @PostMapping("/{code}/end-vote")
    public SpyfallView endVote(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user) {
        return service.endVoting(code, user);
    }

    @PostMapping("/{code}/again")
    public SpyfallView again(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user) {
        return service.playAgain(code, user);
    }

    public record SettingsRequest(Integer roundSeconds) {
    }

    public record PlayerRequest(String playerId) {
    }

    public record AgreeRequest(boolean agree) {
    }

    public record LocationRequest(String location) {
    }
}
