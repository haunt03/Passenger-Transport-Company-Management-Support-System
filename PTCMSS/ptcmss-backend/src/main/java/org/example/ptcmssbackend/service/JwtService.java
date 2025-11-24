package org.example.ptcmssbackend.service;

import org.example.ptcmssbackend.enums.TokenType;
import org.springframework.security.core.GrantedAuthority;

import java.util.Collection;

public interface JwtService {
    String generateAccessToken(Integer userId, String username, Collection<? extends GrantedAuthority> authorities);
    String generateRefreshToken(Integer userId, String username, Collection<? extends GrantedAuthority> authorities);

    String extractUsername(String token,  TokenType tokenType);


    String extractUsername(String token, org.example.ptcmssbackend.common.TokenType tokenType);

    String generatePasswordResetToken(String username);
}