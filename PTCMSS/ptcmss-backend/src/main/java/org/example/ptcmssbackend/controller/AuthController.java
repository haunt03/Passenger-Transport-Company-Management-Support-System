package org.example.ptcmssbackend.controller;

import lombok.RequiredArgsConstructor;
import org.example.ptcmssbackend.dto.request.LoginRequest;
import org.example.ptcmssbackend.dto.response.LoginResponse;
import org.example.ptcmssbackend.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@CrossOrigin(origins = "http://localhost:5173")
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Validated @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }
}
