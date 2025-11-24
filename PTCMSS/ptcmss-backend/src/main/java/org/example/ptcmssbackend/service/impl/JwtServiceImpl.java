package org.example.ptcmssbackend.service.impl;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SignatureException;
import lombok.extern.slf4j.Slf4j;
import org.example.ptcmssbackend.enums.TokenType;
import org.example.ptcmssbackend.service.JwtService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;

import java.security.Key;
import java.util.*;
import java.util.function.Function;

import static org.example.ptcmssbackend.enums.TokenType.ACCESS_TOKEN;
import static org.example.ptcmssbackend.enums.TokenType.REFRESH_TOKEN;

@Service
@Slf4j(topic = "JWT_SERVICE")
public class JwtServiceImpl implements JwtService {

    @Value("${jwt.expriMinutes}")
    private long expriMinutes;

    @Value("${jwt.expireDate}")
    private long expriDate;

    @Value("${jwt.accesskey}")
    private String accesskey;

    @Value("${jwt.refreshkey}")
    private String refreshkey;

    /**
     * Tạo Access Token (thời hạn ngắn)
     */
    @Override
    public String generateAccessToken(Integer userId, String username, Collection<? extends GrantedAuthority> authorities) {
        log.info("[JWT] Generating access token for user: {}", username);

        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", userId);
        claims.put("username", username);
        claims.put("roles", authorities.stream().map(GrantedAuthority::getAuthority).toList());

        return Jwts.builder()
                .setClaims(claims)
                .setSubject(username)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + expriMinutes * 60 * 1000))
                .signWith(getSecretKey(ACCESS_TOKEN), SignatureAlgorithm.HS256)
                .compact();
    }

    /**
     * Tạo Refresh Token (thời hạn dài)
     */
    @Override
    public String generateRefreshToken(Integer userId, String username, Collection<? extends GrantedAuthority> authorities) {
        log.info("[JWT] Generating refresh token for user: {}", username);

        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", userId);
        claims.put("username", username);
        claims.put("roles", authorities.stream().map(GrantedAuthority::getAuthority).toList());

        return Jwts.builder()
                .setClaims(claims)
                .setSubject(username)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + 24 * 60 * 60 * 1000 * expriDate))
                .signWith(getSecretKey(REFRESH_TOKEN), SignatureAlgorithm.HS256)
                .compact();
    }

    /**
     * Trích xuất username từ token
     */
    @Override
    public String extractUsername(String token, TokenType tokenType) {
        log.info("[JWT] Extracting username (type: {})", tokenType);
        return extractClaim(tokenType, token, Claims::getSubject);
    }

    /**
     * Tạo token cho reset mật khẩu
     */
    @Override
    public String generatePasswordResetToken(String username) {
        log.info("[JWT] Generating password reset token for user: {}", username);

        Map<String, Object> claims = new HashMap<>();
        claims.put("username", username);

        return Jwts.builder()
                .setClaims(claims)
                .setSubject(username)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + expriMinutes * 60 * 1000))
                .signWith(getSecretKey(ACCESS_TOKEN), SignatureAlgorithm.HS256)
                .compact();
    }

    // ================== PRIVATE UTILS =================== //

    private <T> T extractClaim(TokenType type, String token, Function<Claims, T> claimsExtractor) {
        final Claims claims = extractAllClaim(token, type);
        return claimsExtractor.apply(claims);
    }

    private Claims extractAllClaim(String token, TokenType type) {
        try {
            return Jwts.parserBuilder()
                    .setSigningKey(getSecretKey(type))
                    .build()
                    .parseClaimsJws(token)
                    .getBody();
        } catch (SignatureException e) {
            log.error("[JWT] Invalid signature for {} token", type);
            throw new AccessDeniedException("Access denied! Invalid JWT signature.");
        } catch (ExpiredJwtException e) {
            log.error("[JWT] {} token expired", type);
            throw new AccessDeniedException("Access denied! Token expired.");
        } catch (Exception e) {
            log.error("[JWT] Error parsing {} token: {}", type, e.getMessage());
            throw new AccessDeniedException("Access denied! " + e.getMessage());
        }
    }


    private Key getSecretKey(TokenType type) {
        if (type == TokenType.ACCESS_TOKEN) {
            return Keys.hmacShaKeyFor(accesskey.getBytes());
        } else if (type == TokenType.REFRESH_TOKEN) {
            return Keys.hmacShaKeyFor(refreshkey.getBytes());
        } else {
            throw new IllegalArgumentException("Invalid token type: " + type);
        }
    }
}

