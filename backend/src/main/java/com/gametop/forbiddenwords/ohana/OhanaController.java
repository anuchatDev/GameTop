package com.gametop.forbiddenwords.ohana;

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
@RequestMapping("/api/ohana/rooms")
public class OhanaController {

    private final OhanaService service;

    public OhanaController(OhanaService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OhanaView create(@RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user) {
        return service.create(user);
    }

    @PostMapping("/{code}/players")
    public OhanaView join(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user) {
        return service.join(code, user);
    }

    @GetMapping("/{code}")
    public OhanaView get(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user) {
        return service.get(code, user);
    }

    @PostMapping("/{code}/settings")
    public OhanaView settings(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user,
                              @RequestBody SettingsRequest request) {
        return service.updateSettings(code, user, request.penalty(), request.kingRules());
    }

    @PostMapping("/{code}/start")
    public OhanaView start(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user) {
        return service.start(code, user);
    }

    @PostMapping("/{code}/end")
    public OhanaView end(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user) {
        return service.end(code, user);
    }

    @PostMapping("/{code}/draw")
    public OhanaView draw(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user) {
        return service.draw(code, user);
    }

    @PostMapping("/{code}/pick")
    public OhanaView pick(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user,
                          @RequestBody PickRequest request) {
        return service.pick(code, user, request.playerIds());
    }

    @PostMapping("/{code}/duel-loser")
    public OhanaView duelLoser(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user,
                               @RequestBody LoserRequest request) {
        return service.duelLoser(code, user, request.playerId());
    }

    @PostMapping("/{code}/face")
    public OhanaView face(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user) {
        return service.touchFace(code, user);
    }

    @PostMapping("/{code}/face-loser")
    public OhanaView faceLoser(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user,
                               @RequestBody LoserRequest request) {
        return service.faceLoser(code, user, request.playerId());
    }

    @PostMapping("/{code}/guests")
    public OhanaView addGuest(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user,
                              @RequestBody GuestRequest request) {
        return service.addGuest(code, user, request.name());
    }

    @PostMapping("/{code}/guests/remove")
    public OhanaView removeGuest(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user,
                                 @RequestBody LoserRequest request) {
        return service.removeGuest(code, user, request.playerId());
    }

    @PostMapping("/{code}/skip")
    public OhanaView skip(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user) {
        return service.skipTurn(code, user);
    }

    /** ค่าที่เป็น null = ใช้ค่าเดิม */
    public record SettingsRequest(String penalty, List<String> kingRules) {
    }

    public record PickRequest(List<String> playerIds) {
    }

    public record LoserRequest(String playerId) {
    }

    public record GuestRequest(String name) {
    }
}
