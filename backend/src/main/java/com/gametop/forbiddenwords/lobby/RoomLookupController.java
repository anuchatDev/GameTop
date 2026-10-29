package com.gametop.forbiddenwords.lobby;

import java.util.ArrayList;
import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import com.gametop.forbiddenwords.avalon.AvalonService;
import com.gametop.forbiddenwords.common.ApiException;
import com.gametop.forbiddenwords.insider.InsiderService;
import com.gametop.forbiddenwords.kittens.KittensService;
import com.gametop.forbiddenwords.ohana.OhanaService;
import com.gametop.forbiddenwords.room.RoomService;
import com.gametop.forbiddenwords.spyfall.SpyfallService;
import com.gametop.forbiddenwords.werewolf.WerewolfService;

/**
 * หาว่ารหัสห้องเป็นของเกมไหน — หน้าแรกมีช่องกรอกรหัสช่องเดียวสำหรับทุกเกม
 */
@RestController
public class RoomLookupController {

    private final RoomService forbidden;
    private final WerewolfService werewolf;
    private final OhanaService ohana;
    private final InsiderService insider;
    private final SpyfallService spyfall;
    private final AvalonService avalon;
    private final KittensService kittens;

    public RoomLookupController(RoomService forbidden, WerewolfService werewolf, OhanaService ohana,
                                InsiderService insider, SpyfallService spyfall, AvalonService avalon,
                                KittensService kittens) {
        this.forbidden = forbidden;
        this.werewolf = werewolf;
        this.ohana = ohana;
        this.insider = insider;
        this.spyfall = spyfall;
        this.avalon = avalon;
        this.kittens = kittens;
    }

    /**
     * @return เกมที่มีห้องรหัสนี้ (key เดียวกับหน้าบ้าน) — ปกติมีเกมเดียว ถ้ารหัสบังเอิญซ้ำกันข้ามเกมจะได้หลายเกมให้ผู้ใช้เลือก
     */
    @GetMapping("/api/rooms/lookup/{code}")
    public LookupResult lookup(@PathVariable String code) {
        if (!code.trim().matches("[A-Za-z]{4}")) {
            throw ApiException.badRequest("รหัสห้องต้องเป็นตัวอักษร 4 ตัว");
        }
        List<String> games = new ArrayList<>();
        if (forbidden.exists(code)) games.add("forbidden");
        if (werewolf.exists(code)) games.add("werewolf");
        if (ohana.exists(code)) games.add("ohana");
        if (insider.exists(code)) games.add("insider");
        if (spyfall.exists(code)) games.add("spyfall");
        if (avalon.exists(code)) games.add("avalon");
        if (kittens.exists(code)) games.add("kittens");
        if (games.isEmpty()) {
            throw ApiException.notFound("ไม่พบห้อง " + code.trim().toUpperCase());
        }
        return new LookupResult(code.trim().toUpperCase(), games);
    }

    public record LookupResult(String code, List<String> games) {
    }
}
