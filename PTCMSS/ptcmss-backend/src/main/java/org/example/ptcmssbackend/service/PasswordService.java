package org.example.ptcmssbackend.service;

public interface PasswordService {
    String showSetPasswordPage(String token);
    String setNewPassword(String token, String password, String confirmPassword);
}