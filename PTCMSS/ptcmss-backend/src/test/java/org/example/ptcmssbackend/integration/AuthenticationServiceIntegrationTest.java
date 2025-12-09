package org.example.ptcmssbackend.integration;

import org.example.ptcmssbackend.dto.request.Auth.LoginRequest;
import org.example.ptcmssbackend.dto.request.Auth.SetPasswordRequest;
import org.example.ptcmssbackend.dto.response.Auth.TokenResponse;
import org.example.ptcmssbackend.entity.Roles;
import org.example.ptcmssbackend.entity.Users;
import org.example.ptcmssbackend.enums.UserStatus;
import org.example.ptcmssbackend.repository.RolesRepository;
import org.example.ptcmssbackend.repository.UsersRepository;
import org.example.ptcmssbackend.service.AuthenticationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class AuthenticationServiceIntegrationTest {

    @Autowired
    private AuthenticationService authenticationService;

    @Autowired
    private UsersRepository usersRepository;

    @Autowired
    private RolesRepository rolesRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private Users testUser;
    private Roles testRole;

    @BeforeEach
    void setUp() {
        // Create test role
        testRole = new Roles();
        testRole.setRoleName("USER");
        testRole.setDescription("User Role");
        testRole = rolesRepository.save(testRole);

        // Create test user
        testUser = new Users();
        testUser.setFullName("Test User");
        testUser.setUsername("testuser");
        testUser.setEmail("test@example.com");
        testUser.setPhone("0987654321");
        testUser.setPasswordHash(passwordEncoder.encode("password123"));
        testUser.setStatus(UserStatus.ACTIVE);
        testUser.setRole(testRole);
        testUser = usersRepository.save(testUser);
    }

    @Test
    void getAccessToken_withValidCredentials_shouldReturnToken() {
        // Given
        LoginRequest request = new LoginRequest();
        request.setUsername("testuser");
        request.setPassword("password123");

        // When
        TokenResponse response = authenticationService.getAccessToken(request);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getAccessToken()).isNotBlank();
        assertThat(response.getRefreshToken()).isNotBlank();
        assertThat(response.getUsername()).isEqualTo("testuser");
        assertThat(response.getUserId()).isEqualTo(testUser.getId());
    }

    @Test
    void getAccessToken_withInvalidPassword_shouldThrowException() {
        // Given
        LoginRequest request = new LoginRequest();
        request.setUsername("testuser");
        request.setPassword("wrongpassword");

        // When & Then
        assertThatThrownBy(() -> authenticationService.getAccessToken(request))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    void getAccessToken_withInvalidUsername_shouldThrowException() {
        // Given
        LoginRequest request = new LoginRequest();
        request.setUsername("nonexistent");
        request.setPassword("password123");

        // When & Then
        assertThatThrownBy(() -> authenticationService.getAccessToken(request))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    void getAccessToken_withEmail_shouldReturnToken() {
        // Given
        LoginRequest request = new LoginRequest();
        request.setUsername("test@example.com"); // Use email instead of username
        request.setPassword("password123");

        // When
        TokenResponse response = authenticationService.getAccessToken(request);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getAccessToken()).isNotBlank();
        assertThat(response.getUsername()).isEqualTo("testuser");
    }

    @Test
    void getRefreshToken_withValidToken_shouldReturnNewToken() {
        // Given
        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setUsername("testuser");
        loginRequest.setPassword("password123");
        TokenResponse loginResponse = authenticationService.getAccessToken(loginRequest);

        // When
        TokenResponse response = authenticationService.getRefreshToken(loginResponse.getRefreshToken());

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getAccessToken()).isNotBlank();
        assertThat(response.getRefreshToken()).isNotBlank();
    }

    @Test
    void getRefreshToken_withInvalidToken_shouldThrowException() {
        // When & Then
        assertThatThrownBy(() -> authenticationService.getRefreshToken("invalid_token"))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    void verifyAccount_withValidToken_shouldReturnSuccessMessage() {
        // Given
        Users unverifiedUser = new Users();
        unverifiedUser.setFullName("Unverified User");
        unverifiedUser.setUsername("unverified");
        unverifiedUser.setEmail("unverified@example.com");
        unverifiedUser.setPhone("0111111111");
        unverifiedUser.setPasswordHash(passwordEncoder.encode("password123"));
        unverifiedUser.setStatus(UserStatus.INACTIVE);
        unverifiedUser.setRole(testRole);
        unverifiedUser.setVerificationToken("test_verification_token");
        unverifiedUser = usersRepository.save(unverifiedUser);

        // When
        String result = authenticationService.verifyAccount("test_verification_token");

        // Then
        assertThat(result).isNotBlank();
        assertThat(result).contains("verified");
    }

    @Test
    void verifyAccount_withInvalidToken_shouldThrowException() {
        // When & Then
        assertThatThrownBy(() -> authenticationService.verifyAccount("invalid_token"))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    void forgotPassword_withValidEmail_shouldReturnSuccessMessage() {
        // Given
        String email = "test@example.com";

        // When
        String result = authenticationService.forgotPassword(email);

        // Then
        assertThat(result).isNotBlank();
    }

    @Test
    void forgotPassword_withInvalidEmail_shouldThrowException() {
        // When & Then
        assertThatThrownBy(() -> authenticationService.forgotPassword("nonexistent@example.com"))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    void setPassword_withValidToken_shouldSetPasswordSuccessfully() {
        // Given
        Users userWithToken = new Users();
        userWithToken.setFullName("User With Token");
        userWithToken.setUsername("usertoken");
        userWithToken.setEmail("usertoken@example.com");
        userWithToken.setPhone("0222222222");
        userWithToken.setPasswordHash(passwordEncoder.encode("oldpassword"));
        userWithToken.setStatus(UserStatus.ACTIVE);
        userWithToken.setRole(testRole);
        userWithToken.setVerificationToken("password_reset_token");
        userWithToken = usersRepository.save(userWithToken);

        SetPasswordRequest request = new SetPasswordRequest();
        request.setToken("password_reset_token");
        request.setPassword("NewPass123");
        request.setConfirmPassword("NewPass123");

        // When
        String result = authenticationService.setPassword(request);

        // Then
        assertThat(result).isNotBlank();
        
        // Verify password was changed
        Users updatedUser = usersRepository.findById(userWithToken.getId()).orElse(null);
        assertThat(updatedUser).isNotNull();
        assertThat(passwordEncoder.matches("NewPass123", updatedUser.getPasswordHash())).isTrue();
    }

    @Test
    void setPassword_withInvalidToken_shouldThrowException() {
        // Given
        SetPasswordRequest request = new SetPasswordRequest();
        request.setToken("invalid_token");
        request.setPassword("NewPass123");
        request.setConfirmPassword("NewPass123");

        // When & Then
        assertThatThrownBy(() -> authenticationService.setPassword(request))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    void setPassword_withMismatchedPasswords_shouldThrowException() {
        // Given
        Users userWithToken = new Users();
        userWithToken.setFullName("User With Token");
        userWithToken.setUsername("usertoken2");
        userWithToken.setEmail("usertoken2@example.com");
        userWithToken.setPhone("0333333333");
        userWithToken.setPasswordHash(passwordEncoder.encode("oldpassword"));
        userWithToken.setStatus(UserStatus.ACTIVE);
        userWithToken.setRole(testRole);
        userWithToken.setVerificationToken("password_reset_token2");
        userWithToken = usersRepository.save(userWithToken);

        SetPasswordRequest request = new SetPasswordRequest();
        request.setToken("password_reset_token2");
        request.setPassword("NewPass123");
        request.setConfirmPassword("DifferentPass123");

        // When & Then
        assertThatThrownBy(() -> authenticationService.setPassword(request))
                .isInstanceOf(RuntimeException.class);
    }
}
