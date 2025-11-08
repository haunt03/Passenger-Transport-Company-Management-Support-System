package org.example.ptcmssbackend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ptcmssbackend.service.PasswordService;
import org.springframework.stereotype.Controller; // ĐỔI: Từ @RestController sang @Controller
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

@Slf4j(topic = "PASSWORD_CONTROLLER")
@Controller // Để render views
@RequiredArgsConstructor
/**
 * Controller xử lý việc đặt lại mật khẩu thông qua token.
 * Người dùng truy cập trang đặt mật khẩu mới qua liên kết có token.
 * @author Nguyen Thuy Hau
 */
public class PasswordController {

    private final PasswordService passwordService;

    // Map trực tiếp /set-password (không base path)
    @GetMapping("/set-password")
    public String showForm(@RequestParam("token") String token, Model model) {
        log.info("Received set-password GET with token: {}", token);
        String error = passwordService.showSetPasswordPage(token);
        if (error != null) {
            model.addAttribute("error", error);
        }
        model.addAttribute("token", token);
        return "set-password";
    }

    @PostMapping("/set-password")
    public String setPassword(@RequestParam("token") String token,
                              @RequestParam("password") String password,
                              @RequestParam("confirmPassword") String confirmPassword,
                              Model model) {
        log.info("Received set-password POST with token: {}", token);
        String message = passwordService.setNewPassword(token, password, confirmPassword);

        if (message.startsWith("Liên kết không hợp lệ")) {
            model.addAttribute("message", message);
            return "password-success";
        } else {
            model.addAttribute("error", message);
            model.addAttribute("token", token);
            return "set-password";
        }
    }
}

