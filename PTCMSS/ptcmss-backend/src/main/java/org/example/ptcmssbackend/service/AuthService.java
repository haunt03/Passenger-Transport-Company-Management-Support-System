package org.example.ptcmssbackend.service;

import org.example.ptcmssbackend.dto.LoginRequest;
import org.example.ptcmssbackend.dto.LoginResponse;

public interface AuthService {
    LoginResponse login(LoginRequest request);
}
