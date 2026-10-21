package com.gametop.forbiddenwords.admin;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.gametop.forbiddenwords.admin.AdminService.Stats;
import com.gametop.forbiddenwords.admin.AdminService.UserSummary;
import com.gametop.forbiddenwords.admin.AdminService.WordInput;
import com.gametop.forbiddenwords.admin.AdminService.WordItem;
import com.gametop.forbiddenwords.auth.AuthInterceptor;
import com.gametop.forbiddenwords.auth.AuthUser;
import com.gametop.forbiddenwords.user.Role;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** ระบบผู้ดูแล — AuthInterceptor อนุญาตเฉพาะผู้ใช้ที่มีสิทธิ์ ADMIN */
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService admin;

    public AdminController(AdminService admin) {
        this.admin = admin;
    }

    @GetMapping("/stats")
    public Stats stats() {
        return admin.stats();
    }

    @GetMapping("/users")
    public List<UserSummary> users(@RequestParam(required = false) String q) {
        return admin.listUsers(q);
    }

    @PostMapping("/users/{id}/ban")
    public UserSummary ban(@RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser actor, @PathVariable Long id,
                           @RequestBody BanRequest request) {
        return admin.setBanned(actor, id, request.banned());
    }

    @PostMapping("/users/{id}/role")
    public UserSummary role(@RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser actor, @PathVariable Long id,
                            @Valid @RequestBody RoleRequest request) {
        return admin.setRole(actor, id, request.role());
    }

    @DeleteMapping("/users/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteUser(@RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser actor, @PathVariable Long id) {
        admin.deleteUser(actor, id);
    }

    @GetMapping("/words")
    public List<WordItem> words(@RequestParam(required = false) String q,
                                @RequestParam(required = false) String pack) {
        return admin.listWords(q, pack);
    }

    @PostMapping("/words")
    @ResponseStatus(HttpStatus.CREATED)
    public WordItem createWord(@Valid @RequestBody WordRequest request) {
        return admin.createWord(request.toInput());
    }

    @PutMapping("/words/{id}")
    public WordItem updateWord(@PathVariable Long id, @Valid @RequestBody WordRequest request) {
        return admin.updateWord(id, request.toInput());
    }

    @DeleteMapping("/words/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteWord(@PathVariable Long id) {
        admin.deleteWord(id);
    }

    public record BanRequest(boolean banned) {
    }

    public record RoleRequest(@NotNull Role role) {
    }

    public record WordRequest(
            @NotBlank(message = "กรุณากรอกคำ") @Size(max = 50, message = "คำยาวได้ไม่เกิน 50 ตัวอักษร") String text,
            @NotBlank(message = "กรุณากรอกหมวด") @Size(max = 30, message = "หมวดยาวได้ไม่เกิน 30 ตัวอักษร") String category,
            @NotBlank(message = "กรุณากรอกแพ็ก")
            @Pattern(regexp = "^[a-z0-9-]{1,30}$", message = "ชื่อแพ็กใช้ได้เฉพาะ a-z 0-9 และ - (เช่น base, exp1)") String pack,
            Boolean active) {

        WordInput toInput() {
            return new WordInput(text, category, pack, active);
        }
    }
}
