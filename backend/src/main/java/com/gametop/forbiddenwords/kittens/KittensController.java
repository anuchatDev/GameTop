package com.gametop.forbiddenwords.kittens;

import java.util.List;

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
@RequestMapping("/api/kittens/rooms")
public class KittensController {

    private final KittensService service;

    public KittensController(KittensService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public KittensView create(@RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user) {
        return service.create(user);
    }

    @PostMapping("/{code}/players")
    public KittensView join(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user) {
        return service.join(code, user);
    }

    @GetMapping("/{code}")
    public KittensView get(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user) {
        return service.get(code, user);
    }

    @PostMapping("/{code}/start")
    public KittensView start(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user) {
        return service.start(code, user);
    }

    @PostMapping("/{code}/play")
    public KittensView play(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user,
                            @RequestBody PlayRequest request) {
        return service.play(code, user, request.cardIds(), request.targetId(), request.named());
    }

    @PostMapping("/{code}/nope")
    public KittensView nope(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user) {
        return service.nope(code, user);
    }

    @PostMapping("/{code}/draw")
    public KittensView draw(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user) {
        return service.draw(code, user);
    }

    @PostMapping("/{code}/place")
    public KittensView place(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user,
                             @RequestBody PlaceRequest request) {
        return service.placeKitten(code, user, request.position());
    }

    @PostMapping("/{code}/give")
    public KittensView give(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user,
                            @RequestBody GiveRequest request) {
        return service.give(code, user, request.cardId());
    }

    @PostMapping("/{code}/again")
    public KittensView again(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user) {
        return service.playAgain(code, user);
    }

    public record PlayRequest(List<Integer> cardIds, String targetId, CardType named) {
    }

    public record PlaceRequest(int position) {
    }

    public record GiveRequest(int cardId) {
    }
}
