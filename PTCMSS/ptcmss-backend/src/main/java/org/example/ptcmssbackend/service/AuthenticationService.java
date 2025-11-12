package org.example.ptcmssbackend.service;

import jakarta.servlet.http.HttpServletRequest;
import org.example.ptcmssbackend.dto.request.Auth.LoginRequest;
import org.example.ptcmssbackend.dto.response.Auth.TokenResponse;

public interface AuthenticationService {
    TokenResponse getAccessToken(LoginRequest request);

    TokenResponse getRefreshToken(String request);

    String verifyAccount(String token);

    String removeToken(HttpServletRequest request);

    String forgotPassword(String email);
}