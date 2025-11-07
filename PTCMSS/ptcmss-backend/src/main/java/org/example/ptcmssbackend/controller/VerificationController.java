package org.example.ptcmssbackend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ptcmssbackend.service.VerificationService;
import org.springframework.stereotype.Controller; // ĐỔI: Từ @RestController sang @Controller để render HTML
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

@Slf4j(topic = "VERIFICATION_CONTROLLER")
@Controller // Để render Thymeleaf views
@RequiredArgsConstructor
public class VerificationController {

    private final VerificationService verificationService;

    // Map trực tiếp /verify (không base path) để match URL bạn gọi
    @GetMapping("/verify") // URL: http://localhost:8080/verify?token=...
    public String verify(@RequestParam("token") String token, Model model) {
        log.info("Received verify request with token: {}", token); // Debug log
        String message = verificationService.verifyAccount(token);
        model.addAttribute("message", message);
        model.addAttribute("token", token);
        return "verify-result"; // Render HTML template
    }
}
