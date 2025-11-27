package org.example.ptcmssbackend.service;

import jakarta.servlet.http.HttpServletRequest;
import org.example.ptcmssbackend.dto.request.Auth.LoginRequest;
import org.example.ptcmssbackend.dto.request.Auth.SetPasswordRequest;
import org.example.ptcmssbackend.dto.response.Auth.TokenResponse;

public interface AuthenticationService {
    TokenResponse getAccessToken(LoginRequest request);

    TokenResponse getRefreshToken(String request);

    String verifyAccount(String token);

    String forgotPassword(String email);

    String setPassword(SetPasswordRequest request);
}
