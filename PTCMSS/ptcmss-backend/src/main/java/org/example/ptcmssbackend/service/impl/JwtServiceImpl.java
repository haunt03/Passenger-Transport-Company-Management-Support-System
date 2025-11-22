package org.example.ptcmssbackend.service.impl;

import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.example.ptcmssbackend.common.TokenType;
import org.example.ptcmssbackend.service.JwtService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;

import java.security.Key;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.function.Function;

import static org.example.ptcmssbackend.common.TokenType.ACCESS_TOKEN;
import static org.example.ptcmssbackend.common.TokenType.REFRESH_TOKEN;

@Service
@Slf4j(topic = "JWT_SERVICE")
public class JwtServiceImpl implements JwtService {

    //  Đọc đúng key, có default để chạy ngay nếu thiếu cấu hình
    @Value("${jwt.expireMinutes:15}")          // access token: phút
    private long accessExpireMinutes;

    @Value("${jwt.refreshExpireMinutes:43200}") // refresh token: phút (30 ngày)
    private long refreshExpireMinutes;

    //  Nếu bạn dùng chuỗi Base64 cho secret thì để true (khuyên dùng)
    @Value("${jwt.secretsAreBase64:true}")
    private boolean secretsAreBase64;

    //  Tên key chuẩn: accessKey / refreshKey
    @Value("${jwt.accessKey}")
    private String accessKeyRaw;

    @Value("${jwt.refreshKey}")
    private String refreshKeyRaw;

    private Key getSecretKey(TokenType type) {
        String raw = (type == ACCESS_TOKEN ? accessKeyRaw : refreshKeyRaw);
        byte[] keyBytes = secretsAreBase64 ? Decoders.BASE64.decode(raw) : raw.getBytes();
        return Keys.hmacShaKeyFor(keyBytes); // cần >= 256 bit cho HS256
    }

    @Override
    public String generateAccessToken(Integer userId, String username, Collection<? extends GrantedAuthority> authorities) {
        log.info("[JWT] Generating access token for user: {}", username);
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", userId);
        claims.put("username", username);
        claims.put("roles", authorities.stream().map(GrantedAuthority::getAuthority).toList());

        Instant now = Instant.now();
        Instant exp = now.plus(accessExpireMinutes, ChronoUnit.MINUTES);

        return Jwts.builder()
                .setClaims(claims)
                .setSubject(username)
                .setIssuedAt(Date.from(now))
                .setExpiration(Date.from(exp))
                .signWith(getSecretKey(ACCESS_TOKEN), SignatureAlgorithm.HS256)
                .compact();
    }

    @Override
    public String generateRefreshToken(Integer userId, String username, Collection<? extends GrantedAuthority> authorities) {
        log.info("[JWT] Generating refresh token for user: {}", username);
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", userId);
        claims.put("username", username);
        claims.put("roles", authorities.stream().map(GrantedAuthority::getAuthority).toList());

        Instant now = Instant.now();
        Instant exp = now.plus(refreshExpireMinutes, ChronoUnit.MINUTES);

        return Jwts.builder()
                .setClaims(claims)
                .setSubject(username)
                .setIssuedAt(Date.from(now))
                .setExpiration(Date.from(exp))
                .signWith(getSecretKey(REFRESH_TOKEN), SignatureAlgorithm.HS256)
                .compact();
    }

    @Override
    public String extractUsername(String token, TokenType tokenType) {
        log.info("[JWT] Extracting username (type: {})", tokenType);
        return extractClaim(tokenType, token, Claims::getSubject);
    }

    @Override
    public String generatePasswordResetToken(String username) {
        log.info("[JWT] Generating password reset token for user: {}", username);
        Instant now = Instant.now();
        Instant exp = now.plus(accessExpireMinutes, ChronoUnit.MINUTES);

        return Jwts.builder()
                .setSubject(username)
                .setIssuedAt(Date.from(now))
                .setExpiration(Date.from(exp))
                .claim("purpose", "password_reset")
                .signWith(getSecretKey(ACCESS_TOKEN), SignatureAlgorithm.HS256)
                .compact();
    }

    private <T> T extractClaim(TokenType type, String token, Function<Claims, T> extractor) {
        return extractor.apply(extractAllClaims(token, type));
    }

    private Claims extractAllClaims(String token, TokenType type) {
        try {
            return Jwts.parserBuilder()
                    .setSigningKey(getSecretKey(type))
                    .build()
                    .parseClaimsJws(token)
                    .getBody();
        } catch (io.jsonwebtoken.security.SignatureException e) {
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
}
