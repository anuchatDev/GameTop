package com.gametop.forbiddenwords.category;

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

import com.gametop.forbiddenwords.auth.AuthInterceptor;
import com.gametop.forbiddenwords.auth.AuthUser;
import com.gametop.forbiddenwords.category.CategoryService.CategoryInfo;
import com.gametop.forbiddenwords.category.CategoryService.CategoryWord;
import com.gametop.forbiddenwords.category.CategoryService.DrawnWord;
import com.gametop.forbiddenwords.word.Difficulty;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** หมวดหมู่สำหรับผู้เล่น: เลือกหมวด, สร้างหมวดเฉพาะกิจ, สุ่มคำ */
@RestController
@RequestMapping("/api/categories")
public class CategoryController {

    private final CategoryService service;

    public CategoryController(CategoryService service) {
        this.service = service;
    }

    @GetMapping
    public List<CategoryInfo> list(@RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user) {
        return service.listFor(user);
    }

    /** สุ่มคำ เช่น /api/categories/draw?ids=1,2&difficulty=EASY&count=30 (ids ว่าง = ทุกหมวดมาตรฐาน) */
    @GetMapping("/draw")
    public List<DrawnWord> draw(@RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user,
                                @RequestParam(required = false) List<Long> ids,
                                @RequestParam(required = false) Difficulty difficulty,
                                @RequestParam(defaultValue = "30") int count) {
        return service.draw(user, ids, difficulty, count);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CategoryInfo create(@RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user,
                               @Valid @RequestBody CategoryRequest request) {
        return service.createCustom(user, request.name(), request.icon());
    }

    @PutMapping("/{id}")
    public CategoryInfo update(@RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user, @PathVariable Long id,
                               @Valid @RequestBody CategoryRequest request) {
        return service.update(user, id, request.name(), request.icon(), null);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user, @PathVariable Long id) {
        service.delete(user, id);
    }

    @GetMapping("/{id}/words")
    public List<CategoryWord> words(@RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user, @PathVariable Long id) {
        return service.listWords(user, id);
    }

    @PostMapping("/{id}/words")
    @ResponseStatus(HttpStatus.CREATED)
    public CategoryWord addWord(@RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user, @PathVariable Long id,
                                @Valid @RequestBody WordRequest request) {
        return service.addWord(user, id, request.text(), request.difficulty());
    }

    @DeleteMapping("/{id}/words/{wordId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteWord(@RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user, @PathVariable Long id,
                           @PathVariable Long wordId) {
        service.deleteWord(user, id, wordId);
    }

    public record CategoryRequest(
            @NotBlank(message = "กรุณาตั้งชื่อหมวด") @Size(max = 30, message = "ชื่อหมวดยาวได้ไม่เกิน 30 ตัวอักษร") String name,
            @NotBlank(message = "กรุณาเลือกไอคอน") @Size(max = 16, message = "ไอคอนไม่ถูกต้อง") String icon,
            Boolean active) {
    }

    public record WordRequest(
            @NotBlank(message = "กรุณากรอกคำ") @Size(max = 50, message = "คำยาวได้ไม่เกิน 50 ตัวอักษร") String text,
            Difficulty difficulty) {
    }
}
