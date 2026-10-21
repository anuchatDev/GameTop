package com.gametop.forbiddenwords.user;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RestController;

import com.gametop.forbiddenwords.auth.AuthInterceptor;
import com.gametop.forbiddenwords.auth.AuthUser;

@RestController
public class ProfileController {

    private final ProfileService profileService;

    public ProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping("/api/me")
    public ProfileService.Profile me(@RequestAttribute(AuthInterceptor.USER_ATTR) AuthUser user) {
        return profileService.profile(user.id());
    }
}
