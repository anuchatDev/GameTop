package com.gametop.forbiddenwords.room;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.gametop.forbiddenwords.auth.AuthInterceptor;
import com.gametop.forbiddenwords.auth.AuthUser;
import com.gametop.forbiddenwords.room.dto.Requests.GuessRequest;
import com.gametop.forbiddenwords.room.dto.Requests.KillRequest;
import com.gametop.forbiddenwords.room.dto.RoomView;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/rooms")
public class RoomController {

    private final RoomService roomService;

    public RoomController(RoomService roomService) {
        this.roomService = roomService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RoomView create(@RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user) {
        return roomService.createRoom(user);
    }

    @PostMapping("/{code}/players")
    @ResponseStatus(HttpStatus.CREATED)
    public RoomView join(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user) {
        return roomService.join(code, user);
    }

    @GetMapping("/{code}")
    public RoomView view(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user) {
        return roomService.view(code, user);
    }

    @PostMapping("/{code}/start")
    public RoomView start(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user) {
        return roomService.startRound(code, user);
    }

    @PostMapping("/{code}/kills")
    public RoomView kill(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user,
                         @Valid @RequestBody KillRequest request) {
        return roomService.reportKill(code, user, request.victimId(), request.killerId());
    }

    @PostMapping("/{code}/guess")
    public RoomView guess(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user,
                          @Valid @RequestBody GuessRequest request) {
        return roomService.submitGuess(code, user, request.guess());
    }

    @PostMapping("/{code}/end")
    public RoomView end(@PathVariable String code, @RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user) {
        return roomService.endRound(code, user);
    }
}
