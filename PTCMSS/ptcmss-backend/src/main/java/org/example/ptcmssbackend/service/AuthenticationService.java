package org.example.ptcmssbackend.service;

import jakarta.servlet.http.HttpServletRequest;
import org.example.ptcmssbackend.dto.request.LoginRequest;
import org.example.ptcmssbackend.dto.response.LoginResponse;
import org.example.ptcmssbackend.dto.response.TokenResponse;

public interface AuthenticationService {
    TokenResponse getAccessToken(LoginRequest request);

    TokenResponse getRefreshToken(String request);

    String verifyAccount(String token);

    String removeToken(HttpServletRequest request);

}
