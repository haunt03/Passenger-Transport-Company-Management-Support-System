package org.example.ptcmssbackend.service;

import org.example.ptcmssbackend.dto.request.Auth.LoginRequest;
import org.example.ptcmssbackend.dto.request.Auth.SetPasswordRequest;
import org.example.ptcmssbackend.dto.response.Auth.TokenResponse;
import org.example.ptcmssbackend.entity.Roles;
import org.example.ptcmssbackend.entity.Users;
import org.example.ptcmssbackend.enums.UserStatus;
import org.example.ptcmssbackend.exception.InvalidDataException;
import org.example.ptcmssbackend.repository.UsersRepository;
import org.example.ptcmssbackend.service.impl.AuthenticationServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthenticationServiceImplTest {

    @Mock
    private UsersRepository userRepository;

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private JwtService jwtService;

    @Mock
    private EmailService emailService;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private AuthenticationServiceImpl authenticationService;

    // ==================== getAccessToken() Tests ====================

    @Test
    void getAccessToken_whenValidUsername_shouldReturnTokens() {
        // Given
        LoginRequest request = new LoginRequest();
        request.setUsername("testuser");
        request.setPassword("password123");

        Users user = new Users();
        user.setId(100);
        user.setUsername("testuser");
        user.setEmail("test@example.com");
        user.setStatus(UserStatus.ACTIVE);
        user.setPasswordHash("encodedPassword");

        Roles role = new Roles();
        role.setRoleName("EMPLOYEE");
        user.setRole(role);
        user.setStatus(UserStatus.ACTIVE); // Set status to make isEnabled() return true

        Authentication authentication = mock(Authentication.class);
        SecurityContext securityContext = mock(SecurityContext.class);

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(authentication);
        when(securityContext.getAuthentication()).thenReturn(authentication);
        SecurityContextHolder.setContext(securityContext);
        when(jwtService.generateAccessToken(eq(100), eq("testuser"), anyCollection()))
                .thenReturn("accessToken123");
        when(jwtService.generateRefreshToken(eq(100), eq("testuser"), anyCollection()))
                .thenReturn("refreshToken123");

        // When
        TokenResponse result = authenticationService.getAccessToken(request);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getAccessToken()).isEqualTo("accessToken123");
        assertThat(result.getRefreshToken()).isEqualTo("refreshToken123");
        assertThat(result.getUserId()).isEqualTo(100);
        assertThat(result.getUsername()).isEqualTo("testuser");
        assertThat(result.getRoleName()).isEqualTo("EMPLOYEE");
        verify(userRepository).findByUsername("testuser");
        verify(authenticationManager).authenticate(any(UsernamePasswordAuthenticationToken.class));
        verify(jwtService).generateAccessToken(eq(100), eq("testuser"), anyCollection());
        verify(jwtService).generateRefreshToken(eq(100), eq("testuser"), anyCollection());
    }

    @Test
    void getAccessToken_whenUsernameNotFoundButEmailFound_shouldReturnTokens() {
        // Given
        LoginRequest request = new LoginRequest();
        request.setUsername("test@example.com");
        request.setPassword("password123");

        Users user = new Users();
        user.setId(100);
        user.setUsername("testuser");
        user.setEmail("test@example.com");
        user.setStatus(UserStatus.ACTIVE);
        user.setPasswordHash("encodedPassword");

        Roles role = new Roles();
        role.setRoleName("EMPLOYEE");
        user.setRole(role);

        Authentication authentication = mock(Authentication.class);
        SecurityContext securityContext = mock(SecurityContext.class);

        when(userRepository.findByUsername("test@example.com")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(authentication);
        when(securityContext.getAuthentication()).thenReturn(authentication);
        SecurityContextHolder.setContext(securityContext);
        when(jwtService.generateAccessToken(eq(100), eq("testuser"), anyCollection()))
                .thenReturn("accessToken123");
        when(jwtService.generateRefreshToken(eq(100), eq("testuser"), anyCollection()))
                .thenReturn("refreshToken123");

        // When
        TokenResponse result = authenticationService.getAccessToken(request);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getAccessToken()).isEqualTo("accessToken123");
        verify(userRepository).findByUsername("test@example.com");
        verify(userRepository).findByEmail("test@example.com");
    }

    @Test
    void getAccessToken_whenUserNotFound_shouldThrowException() {
        // Given
        LoginRequest request = new LoginRequest();
        request.setUsername("nonexistent");
        request.setPassword("password123");

        when(userRepository.findByUsername("nonexistent")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("nonexistent")).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> authenticationService.getAccessToken(request))
                .isInstanceOf(InvalidDataException.class)
                .hasMessageContaining("Thông tin đăng nhập không hợp lệ");
    }

    @Test
    void getAccessToken_whenUserDisabled_shouldThrowException() {
        // Given
        LoginRequest request = new LoginRequest();
        request.setUsername("testuser");
        request.setPassword("password123");

        Users user = new Users();
        user.setId(100);
        user.setUsername("testuser");
        user.setStatus(UserStatus.INACTIVE);

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));

        // When & Then
        assertThatThrownBy(() -> authenticationService.getAccessToken(request))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Tài khoản đã bị vô hiệu hóa");
    }

    @Test
    void getAccessToken_whenBadCredentials_shouldThrowException() {
        // Given
        LoginRequest request = new LoginRequest();
        request.setUsername("testuser");
        request.setPassword("wrongpassword");

        Users user = new Users();
        user.setId(100);
        user.setUsername("testuser");
        user.setStatus(UserStatus.ACTIVE);

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        // When & Then
        assertThatThrownBy(() -> authenticationService.getAccessToken(request))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Thông tin đăng nhập không hợp lệ");
    }

    // ==================== getRefreshToken() Tests ====================

    @Test
    void getRefreshToken_whenValidToken_shouldReturnNewAccessToken() {
        // Given
        String refreshToken = "validRefreshToken";
        String username = "testuser";

        Users user = new Users();
        user.setId(100);
        user.setUsername(username);

        Roles role = new Roles();
        role.setRoleName("EMPLOYEE");
        user.setRole(role);

        when(jwtService.extractUsername(refreshToken, org.example.ptcmssbackend.common.TokenType.REFRESH_TOKEN))
                .thenReturn(username);
        when(userRepository.findByUsername(username)).thenReturn(Optional.of(user));
        when(jwtService.generateAccessToken(eq(100), eq(username), anyCollection()))
                .thenReturn("newAccessToken123");

        // When
        TokenResponse result = authenticationService.getRefreshToken(refreshToken);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getAccessToken()).isEqualTo("newAccessToken123");
        assertThat(result.getRefreshToken()).isEqualTo(refreshToken);
        verify(jwtService).extractUsername(refreshToken, org.example.ptcmssbackend.common.TokenType.REFRESH_TOKEN);
        verify(jwtService).generateAccessToken(eq(100), eq(username), anyCollection());
    }

    @Test
    void getRefreshToken_whenEmptyToken_shouldThrowException() {
        // Given
        String refreshToken = "";

        // When & Then
        assertThatThrownBy(() -> authenticationService.getRefreshToken(refreshToken))
                .isInstanceOf(InvalidDataException.class)
                .hasMessageContaining("Token không được để trống");
    }

    @Test
    void getRefreshToken_whenUserNotFound_shouldThrowException() {
        // Given
        String refreshToken = "validRefreshToken";
        String username = "nonexistent";

        when(jwtService.extractUsername(refreshToken, org.example.ptcmssbackend.common.TokenType.REFRESH_TOKEN))
                .thenReturn(username);
        when(userRepository.findByUsername(username)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> authenticationService.getRefreshToken(refreshToken))
                .isInstanceOf(InvalidDataException.class)
                .hasMessageContaining("Không tìm thấy người dùng");
    }

    // ==================== verifyAccount() Tests ====================

    @Test
    void verifyAccount_whenValidToken_shouldReturnSetPasswordUrl() {
        // Given
        String token = "validToken";

        Users user = new Users();
        user.setId(100);
        user.setUsername("testuser");
        user.setEmailVerified(false);
        user.setVerificationToken(token);

        when(userRepository.findByVerificationToken(token)).thenReturn(Optional.of(user));
        when(userRepository.save(any(Users.class))).thenReturn(user);

        // When
        String result = authenticationService.verifyAccount(token);

        // Then
        assertThat(result).isNotNull();
        assertThat(result).contains("set-password");
        assertThat(result).contains("token=" + token);
        assertThat(user.getEmailVerified()).isTrue();
        verify(userRepository).findByVerificationToken(token);
        verify(userRepository).save(user);
    }

    @Test
    void verifyAccount_whenTokenAlreadyVerified_shouldReturnSetPasswordUrl() {
        // Given
        String token = "alreadyVerifiedToken";

        Users user = new Users();
        user.setId(100);
        user.setUsername("testuser");
        user.setEmailVerified(true);
        user.setVerificationToken(token);

        when(userRepository.findByVerificationToken(token)).thenReturn(Optional.of(user));

        // When
        String result = authenticationService.verifyAccount(token);

        // Then
        assertThat(result).isNotNull();
        assertThat(result).contains("set-password");
        verify(userRepository).findByVerificationToken(token);
        verify(userRepository, never()).save(any(Users.class));
    }

    @Test
    void verifyAccount_whenInvalidToken_shouldReturnErrorUrl() {
        // Given
        String token = "invalidToken";

        when(userRepository.findByVerificationToken(token)).thenReturn(Optional.empty());

        // When
        String result = authenticationService.verifyAccount(token);

        // Then
        assertThat(result).isNotNull();
        assertThat(result).contains("verification-error");
        verify(userRepository).findByVerificationToken(token);
    }

    @Test
    void verifyAccount_whenEmptyToken_shouldReturnErrorUrl() {
        // Given
        String token = "";

        // When
        String result = authenticationService.verifyAccount(token);

        // Then
        assertThat(result).isNotNull();
        assertThat(result).contains("verification-error");
        verify(userRepository, never()).findByVerificationToken(anyString());
    }

    // ==================== setPassword() Tests ====================

    @Test
    void setPassword_whenValidRequest_shouldSetPassword() {
        // Given
        SetPasswordRequest request = new SetPasswordRequest();
        request.setToken("validToken");
        request.setPassword("NewPassword123");
        request.setConfirmPassword("NewPassword123");

        Users user = new Users();
        user.setId(100);
        user.setUsername("testuser");
        user.setEmailVerified(true);
        user.setVerificationToken("validToken");
        user.setStatus(UserStatus.INACTIVE);

        when(userRepository.findByVerificationToken("validToken")).thenReturn(Optional.of(user));
        when(passwordEncoder.encode("NewPassword123")).thenReturn("encodedPassword");
        when(userRepository.save(any(Users.class))).thenReturn(user);

        // When
        String result = authenticationService.setPassword(request);

        // Then
        assertThat(result).isNotNull();
        assertThat(result).contains("Mật khẩu đã được thiết lập thành công");
        assertThat(user.getPasswordHash()).isEqualTo("encodedPassword");
        assertThat(user.getStatus()).isEqualTo(UserStatus.ACTIVE);
        assertThat(user.getVerificationToken()).isNull();
        verify(userRepository).findByVerificationToken("validToken");
        verify(passwordEncoder).encode("NewPassword123");
        verify(userRepository).save(user);
    }

    @Test
    void setPassword_whenPasswordsDoNotMatch_shouldThrowException() {
        // Given
        SetPasswordRequest request = new SetPasswordRequest();
        request.setToken("validToken");
        request.setPassword("NewPassword123");
        request.setConfirmPassword("DifferentPassword");

        // When & Then
        assertThatThrownBy(() -> authenticationService.setPassword(request))
                .isInstanceOf(InvalidDataException.class)
                .hasMessageContaining("Mật khẩu xác nhận không khớp");
    }

    @Test
    void setPassword_whenEmailNotVerified_shouldThrowException() {
        // Given
        SetPasswordRequest request = new SetPasswordRequest();
        request.setToken("validToken");
        request.setPassword("NewPassword123");
        request.setConfirmPassword("NewPassword123");

        Users user = new Users();
        user.setId(100);
        user.setEmailVerified(false);
        user.setVerificationToken("validToken");

        when(userRepository.findByVerificationToken("validToken")).thenReturn(Optional.of(user));

        // When & Then
        assertThatThrownBy(() -> authenticationService.setPassword(request))
                .isInstanceOf(InvalidDataException.class)
                .hasMessageContaining("Email chưa được xác thực");
    }

    // ==================== forgotPassword() Tests ====================

    @Test
    void forgotPassword_whenValidEmail_shouldSendResetEmail() throws Exception {
        // Setup mock request context
        MockHttpServletRequest mockRequest = new MockHttpServletRequest();
        mockRequest.setScheme("http");
        mockRequest.setServerName("localhost");
        mockRequest.setServerPort(8080);
        mockRequest.setContextPath("/api");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(mockRequest));
        
        // Given
        String email = "test@example.com";

        Users user = new Users();
        user.setId(100);
        user.setEmail(email);
        user.setFullName("Test User");

        when(userRepository.findByEmail(email.toLowerCase())).thenReturn(Optional.of(user));
        when(jwtService.generatePasswordResetToken(user.getUsername())).thenReturn("resetToken123");
        doNothing().when(emailService).sendPasswordResetEmail(anyString(), anyString(), anyString(), anyString());

        // When
        String result = authenticationService.forgotPassword(email);

        // Then
        assertThat(result).isNotNull();
        assertThat(result).contains("Chúng tôi đã gửi link đặt lại mật khẩu");
        verify(userRepository).findByEmail(email.toLowerCase());
        verify(jwtService).generatePasswordResetToken(user.getUsername());
        verify(emailService).sendPasswordResetEmail(anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void forgotPassword_whenEmailNotFound_shouldThrowException() {
        // Given
        String email = "nonexistent@example.com";

        when(userRepository.findByEmail(email.toLowerCase())).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> authenticationService.forgotPassword(email))
                .isInstanceOf(InvalidDataException.class)
                .hasMessageContaining("Email không tồn tại trong hệ thống");
    }

    @Test
    void forgotPassword_whenEmptyEmail_shouldThrowException() {
        // Given
        String email = "";

        // When & Then
        assertThatThrownBy(() -> authenticationService.forgotPassword(email))
                .isInstanceOf(InvalidDataException.class)
                .hasMessageContaining("Email không được để trống");
    }
}

