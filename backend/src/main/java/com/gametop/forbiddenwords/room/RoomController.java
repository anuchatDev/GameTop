package com.gametop.forbiddenwords.room;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.gametop.forbiddenwords.room.dto.JoinResponse;
import com.gametop.forbiddenwords.room.dto.Requests.GuessRequest;
import com.gametop.forbiddenwords.room.dto.Requests.KillRequest;
import com.gametop.forbiddenwords.room.dto.Requests.NameRequest;
import com.gametop.forbiddenwords.room.dto.RoomView;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/rooms")
public class RoomController {

    static final String TOKEN_HEADER = "X-Player-Token";

    private final RoomService roomService;

    public RoomController(RoomService roomService) {
        this.roomService = roomService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public JoinResponse create(@Valid @RequestBody NameRequest request) {
        return roomService.createRoom(request.name());
    }

    @PostMapping("/{code}/players")
    @ResponseStatus(HttpStatus.CREATED)
    public JoinResponse join(@PathVariable String code, @Valid @RequestBody NameRequest request) {
        return roomService.join(code, request.name());
    }

    @GetMapping("/{code}")
    public RoomView view(@PathVariable String code, @RequestHeader(TOKEN_HEADER) String token) {
        return roomService.view(code, token);
    }

    @PostMapping("/{code}/start")
    public RoomView start(@PathVariable String code, @RequestHeader(TOKEN_HEADER) String token) {
        return roomService.startRound(code, token);
    }

    @PostMapping("/{code}/kills")
    public RoomView kill(@PathVariable String code, @RequestHeader(TOKEN_HEADER) String token,
                         @Valid @RequestBody KillRequest request) {
        return roomService.reportKill(code, token, request.victimId(), request.killerId());
    }

    @PostMapping("/{code}/guess")
    public RoomView guess(@PathVariable String code, @RequestHeader(TOKEN_HEADER) String token,
                          @Valid @RequestBody GuessRequest request) {
        return roomService.submitGuess(code, token, request.guess());
    }

    @PostMapping("/{code}/end")
    public RoomView end(@PathVariable String code, @RequestHeader(TOKEN_HEADER) String token) {
        return roomService.endRound(code, token);
    }
}
