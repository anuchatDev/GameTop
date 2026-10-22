package com.gametop.forbiddenwords.avalon;

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
import com.gametop.forbiddenwords.avalon.AvalonRoom.Settings;

@RestController
@RequestMapping("/api/avalon")
public class AvalonController {

    private final AvalonService service;
    private final AvalonStats stats;

    public AvalonController(AvalonService service, AvalonStats stats) {
        this.service = service;
        this.stats = stats;
    }

    /** สถิติของฉัน: จำนวนเกม, อัตราชนะ, บทบาทที่ได้บ่อยที่สุด */
    @GetMapping("/stats/me")
    public AvalonStats.Summary myStats(@RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user) {
        return stats.summary(user.id());
    }

    @PostMapping("/rooms")
    @ResponseStatus(HttpStatus.CREATED)
    public AvalonView create(@RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user) {
        return service.create(user);
    }

    @PostMapping("/rooms/{code}/players")
    public AvalonView join(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user) {
        return service.join(code, user);
    }

    @GetMapping("/rooms/{code}")
    public AvalonView get(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user) {
        return service.get(code, user);
    }

    @PostMapping("/rooms/{code}/settings")
    public AvalonView settings(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user,
                               @RequestBody Settings settings) {
        return service.updateSettings(code, user, settings);
    }

    @PostMapping("/rooms/{code}/start")
    public AvalonView start(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user) {
        return service.start(code, user);
    }

    @PostMapping("/rooms/{code}/propose")
    public AvalonView propose(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user,
                              @RequestBody TeamRequest request) {
        return service.propose(code, user, request.playerIds());
    }

    @PostMapping("/rooms/{code}/vote")
    public AvalonView vote(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user,
                           @RequestBody VoteRequest request) {
        return service.vote(code, user, request.approve());
    }

    @PostMapping("/rooms/{code}/quest")
    public AvalonView quest(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user,
                            @RequestBody QuestRequest request) {
        return service.quest(code, user, request.success());
    }

    @PostMapping("/rooms/{code}/assassinate")
    public AvalonView assassinate(@PathVariable String code,
                                  @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user,
                                  @RequestBody TargetRequest request) {
        return service.assassinate(code, user, request.playerId());
    }

    @PostMapping("/rooms/{code}/again")
    public AvalonView again(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user) {
        return service.playAgain(code, user);
    }

    public record TeamRequest(List<String> playerIds) {
    }

    public record VoteRequest(boolean approve) {
    }

    public record QuestRequest(boolean success) {
    }

    public record TargetRequest(String playerId) {
    }
}
