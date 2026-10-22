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
import com.gametop.forbiddenwords.category.CategoryController.CategoryRequest;
import com.gametop.forbiddenwords.category.CategoryService;
import com.gametop.forbiddenwords.category.CategoryService.CategoryInfo;
import com.gametop.forbiddenwords.user.Role;
import com.gametop.forbiddenwords.word.Difficulty;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** ระบบผู้ดูแล — AuthInterceptor อนุญาตเฉพาะผู้ใช้ที่มีสิทธิ์ ADMIN */
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService admin;
    private final CategoryService categories;

    public AdminController(AdminService admin, CategoryService categories) {
        this.admin = admin;
        this.categories = categories;
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
                                @RequestParam(required = false) Long categoryId) {
        return admin.listWords(q, categoryId);
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

    // ---------- หมวดหมู่ ----------

    @GetMapping("/categories")
    public List<CategoryInfo> categories(@RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser actor) {
        return categories.listAll(actor);
    }

    /** สร้างหมวดมาตรฐานใหม่ (ทุกคนเลือกเล่นได้) */
    @PostMapping("/categories")
    @ResponseStatus(HttpStatus.CREATED)
    public CategoryInfo createCategory(@RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser actor,
                                       @Valid @RequestBody CategoryRequest request) {
        return categories.createStandard(actor, request.name(), request.icon());
    }

    @PutMapping("/categories/{id}")
    public CategoryInfo updateCategory(@RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser actor,
                                       @PathVariable Long id, @Valid @RequestBody CategoryRequest request) {
        return categories.update(actor, id, request.name(), request.icon(), request.active());
    }

    @DeleteMapping("/categories/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteCategory(@RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser actor, @PathVariable Long id) {
        categories.delete(actor, id);
    }

    public record BanRequest(boolean banned) {
    }

    public record RoleRequest(@NotNull Role role) {
    }

    public record WordRequest(
            @NotBlank(message = "กรุณากรอกคำ") @Size(max = 50, message = "คำยาวได้ไม่เกิน 50 ตัวอักษร") String text,
            @NotNull(message = "กรุณาเลือกหมวด") Long categoryId,
            Difficulty difficulty,
            Boolean active) {

        WordInput toInput() {
            return new WordInput(text, categoryId, difficulty, active);
        }
    }
}
