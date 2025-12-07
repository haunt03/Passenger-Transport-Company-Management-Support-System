package org.example.ptcmssbackend.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import org.example.ptcmssbackend.common.TokenType;
import org.example.ptcmssbackend.service.impl.JwtServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Collection;
import java.util.Collections;
import java.util.Date;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.example.ptcmssbackend.common.TokenType.ACCESS_TOKEN;
import static org.example.ptcmssbackend.common.TokenType.REFRESH_TOKEN;

@ExtendWith(MockitoExtension.class)
class JwtServiceImplTest {

    @InjectMocks
    private JwtServiceImpl jwtService;

    private String testAccessKey = "testAccessKey123456789012345678901234567890"; // 40+ chars for HS256
    private String testRefreshKey = "testRefreshKey123456789012345678901234567890"; // 40+ chars for HS256

    @BeforeEach
    void setUp() {
        // Set private fields using reflection
        ReflectionTestUtils.setField(jwtService, "expriMinutes", 60L);
        ReflectionTestUtils.setField(jwtService, "expriDate", 7L);
        ReflectionTestUtils.setField(jwtService, "accesskey", testAccessKey);
        ReflectionTestUtils.setField(jwtService, "refreshkey", testRefreshKey);
    }

    // ==================== generateAccessToken() Tests ====================

    @Test
    void generateAccessToken_whenValidInput_shouldGenerateToken() {
        // Given
        Integer userId = 100;
        String username = "testuser";
        Collection<? extends GrantedAuthority> authorities = Collections.singletonList(
                new SimpleGrantedAuthority("ROLE_EMPLOYEE")
        );

        // When
        String token = jwtService.generateAccessToken(userId, username, authorities);

        // Then
        assertThat(token).isNotNull();
        assertThat(token).isNotEmpty();
        // Token should have 3 parts separated by dots (header.payload.signature)
        assertThat(token.split("\\.")).hasSize(3);
    }

    @Test
    void generateAccessToken_whenMultipleAuthorities_shouldIncludeAllRoles() {
        // Given
        Integer userId = 100;
        String username = "testuser";
        Collection<? extends GrantedAuthority> authorities = List.of(
                new SimpleGrantedAuthority("ROLE_EMPLOYEE"),
                new SimpleGrantedAuthority("ROLE_MANAGER")
        );

        // When
        String token = jwtService.generateAccessToken(userId, username, authorities);

        // Then
        assertThat(token).isNotNull();
        // Verify token can be parsed
        Claims claims = parseToken(token, ACCESS_TOKEN);
        assertThat(claims.get("userId")).isEqualTo(100);
        assertThat(claims.getSubject()).isEqualTo("testuser");
    }

    @Test
    void generateAccessToken_whenNoAuthorities_shouldStillGenerateToken() {
        // Given
        Integer userId = 100;
        String username = "testuser";
        Collection<? extends GrantedAuthority> authorities = Collections.emptyList();

        // When
        String token = jwtService.generateAccessToken(userId, username, authorities);

        // Then
        assertThat(token).isNotNull();
        assertThat(token).isNotEmpty();
    }

    // ==================== generateRefreshToken() Tests ====================

    @Test
    void generateRefreshToken_whenValidInput_shouldGenerateToken() {
        // Given
        Integer userId = 100;
        String username = "testuser";
        Collection<? extends GrantedAuthority> authorities = Collections.singletonList(
                new SimpleGrantedAuthority("ROLE_EMPLOYEE")
        );

        // When
        String token = jwtService.generateRefreshToken(userId, username, authorities);

        // Then
        assertThat(token).isNotNull();
        assertThat(token).isNotEmpty();
        assertThat(token.split("\\.")).hasSize(3);
    }

    @Test
    void generateRefreshToken_shouldHaveLongerExpirationThanAccessToken() {
        // Given
        Integer userId = 100;
        String username = "testuser";
        Collection<? extends GrantedAuthority> authorities = Collections.singletonList(
                new SimpleGrantedAuthority("ROLE_EMPLOYEE")
        );

        // When
        String accessToken = jwtService.generateAccessToken(userId, username, authorities);
        String refreshToken = jwtService.generateRefreshToken(userId, username, authorities);

        // Then
        Claims accessClaims = parseToken(accessToken, ACCESS_TOKEN);
        Claims refreshClaims = parseToken(refreshToken, REFRESH_TOKEN);
        
        Date accessExpiration = accessClaims.getExpiration();
        Date refreshExpiration = refreshClaims.getExpiration();
        
        // Refresh token should expire later than access token
        assertThat(refreshExpiration.after(accessExpiration)).isTrue();
    }

    // ==================== extractUsername() Tests ====================

    @Test
    void extractUsername_whenValidAccessToken_shouldExtractUsername() {
        // Given
        Integer userId = 100;
        String username = "testuser";
        Collection<? extends GrantedAuthority> authorities = Collections.singletonList(
                new SimpleGrantedAuthority("ROLE_EMPLOYEE")
        );
        String token = jwtService.generateAccessToken(userId, username, authorities);

        // When
        String extractedUsername = jwtService.extractUsername(token, ACCESS_TOKEN);

        // Then
        assertThat(extractedUsername).isEqualTo(username);
    }

    @Test
    void extractUsername_whenValidRefreshToken_shouldExtractUsername() {
        // Given
        Integer userId = 100;
        String username = "testuser";
        Collection<? extends GrantedAuthority> authorities = Collections.singletonList(
                new SimpleGrantedAuthority("ROLE_EMPLOYEE")
        );
        String token = jwtService.generateRefreshToken(userId, username, authorities);

        // When
        String extractedUsername = jwtService.extractUsername(token, REFRESH_TOKEN);

        // Then
        assertThat(extractedUsername).isEqualTo(username);
    }

    @Test
    void extractUsername_whenWrongTokenType_shouldThrowException() {
        // Given
        Integer userId = 100;
        String username = "testuser";
        Collection<? extends GrantedAuthority> authorities = Collections.singletonList(
                new SimpleGrantedAuthority("ROLE_EMPLOYEE")
        );
        String accessToken = jwtService.generateAccessToken(userId, username, authorities);

        // When & Then - Try to extract with wrong token type
        assertThatThrownBy(() -> jwtService.extractUsername(accessToken, REFRESH_TOKEN))
                .isInstanceOf(Exception.class);
    }

    @Test
    void extractUsername_whenInvalidToken_shouldThrowException() {
        // Given
        String invalidToken = "invalid.token.here";

        // When & Then
        assertThatThrownBy(() -> jwtService.extractUsername(invalidToken, ACCESS_TOKEN))
                .isInstanceOf(Exception.class);
    }

    // ==================== generatePasswordResetToken() Tests ====================

    @Test
    void generatePasswordResetToken_whenValidUsername_shouldGenerateToken() {
        // Given
        String username = "testuser";

        // When
        String token = jwtService.generatePasswordResetToken(username);

        // Then
        assertThat(token).isNotNull();
        assertThat(token).isNotEmpty();
        assertThat(token.split("\\.")).hasSize(3);
    }

    @Test
    void generatePasswordResetToken_shouldContainUsername() {
        // Given
        String username = "testuser";

        // When
        String token = jwtService.generatePasswordResetToken(username);

        // Then
        Claims claims = parseToken(token, ACCESS_TOKEN);
        assertThat(claims.getSubject()).isEqualTo(username);
        assertThat(claims.get("username")).isEqualTo(username);
    }

    // ==================== Edge Cases ====================

    @Test
    void generateAccessToken_shouldIncludeUserIdInClaims() {
        // Given
        Integer userId = 100;
        String username = "testuser";
        Collection<? extends GrantedAuthority> authorities = Collections.singletonList(
                new SimpleGrantedAuthority("ROLE_EMPLOYEE")
        );

        // When
        String token = jwtService.generateAccessToken(userId, username, authorities);

        // Then
        Claims claims = parseToken(token, ACCESS_TOKEN);
        assertThat(claims.get("userId")).isEqualTo(100);
        assertThat(claims.get("username")).isEqualTo("testuser");
    }

    @Test
    void generateAccessToken_shouldIncludeRolesInClaims() {
        // Given
        Integer userId = 100;
        String username = "testuser";
        Collection<? extends GrantedAuthority> authorities = List.of(
                new SimpleGrantedAuthority("ROLE_EMPLOYEE"),
                new SimpleGrantedAuthority("ROLE_MANAGER")
        );

        // When
        String token = jwtService.generateAccessToken(userId, username, authorities);

        // Then
        Claims claims = parseToken(token, ACCESS_TOKEN);
        @SuppressWarnings("unchecked")
        java.util.List<String> roles = (java.util.List<String>) claims.get("roles");
        assertThat(roles).contains("ROLE_EMPLOYEE", "ROLE_MANAGER");
    }

    // ==================== Helper Methods ====================

    private Claims parseToken(String token, TokenType tokenType) {
        String key = tokenType == ACCESS_TOKEN ? testAccessKey : testRefreshKey;
        return Jwts.parserBuilder()
                .setSigningKey(io.jsonwebtoken.security.Keys.hmacShaKeyFor(key.getBytes()))
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}

