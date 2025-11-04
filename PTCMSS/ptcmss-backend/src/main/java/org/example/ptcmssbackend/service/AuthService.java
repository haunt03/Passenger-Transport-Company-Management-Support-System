package org.example.ptcmssbackend.service;

import org.example.ptcmssbackend.dto.request.LoginRequest;
import org.example.ptcmssbackend.dto.response.LoginResponse;

public interface AuthService {
    LoginResponse login(LoginRequest request);
}
