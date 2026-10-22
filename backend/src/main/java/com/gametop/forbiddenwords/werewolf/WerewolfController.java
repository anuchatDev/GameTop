package com.gametop.forbiddenwords.werewolf;

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

import jakarta.validation.constraints.NotBlank;

@RestController
@RequestMapping("/api/werewolf/rooms")
public class WerewolfController {

    private final WerewolfService service;

    public WerewolfController(WerewolfService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public WwView create(@RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user) {
        return service.create(user);
    }

    @PostMapping("/{code}/players")
    public WwView join(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user) {
        return service.join(code, user);
    }

    @GetMapping("/{code}")
    public WwView get(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user) {
        return service.get(code, user);
    }

    @PostMapping("/{code}/settings")
    public WwView settings(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user,
                           @RequestBody SettingsRequest request) {
        return service.updateSettings(code, user, request.roles(), request.discussionSeconds(),
                request.nightStepSeconds());
    }

    @PostMapping("/{code}/start")
    public WwView start(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user) {
        return service.start(code, user);
    }

    @PostMapping("/{code}/night")
    public WwView night(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user,
                        @RequestBody NightActionRequest request) {
        return service.nightAction(code, user, request.playerIds(), request.centerIndexes());
    }

    @PostMapping("/{code}/skip")
    public WwView skip(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user) {
        return service.skipDiscussion(code, user);
    }

    @PostMapping("/{code}/vote")
    public WwView vote(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user,
                       @RequestBody VoteRequest request) {
        return service.vote(code, user, request.target());
    }

    @PostMapping("/{code}/end-vote")
    public WwView endVote(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user) {
        return service.endVoting(code, user);
    }

    @PostMapping("/{code}/again")
    public WwView again(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user) {
        return service.playAgain(code, user);
    }

    /** ค่าที่เป็น null = ใช้ค่าเดิม */
    public record SettingsRequest(Map<WwRole, Integer> roles, Integer discussionSeconds, Integer nightStepSeconds) {
    }

    public record NightActionRequest(List<String> playerIds, List<Integer> centerIndexes) {
    }

    /** target = playerId หรือ "CENTER" */
    public record VoteRequest(@NotBlank String target) {
    }
}
