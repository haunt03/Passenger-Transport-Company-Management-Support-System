package org.example.ptcmssbackend.service;

import org.example.ptcmssbackend.enums.TokenType;
import org.example.ptcmssbackend.entity.Users;
import org.example.ptcmssbackend.enums.UserStatus;
import org.example.ptcmssbackend.repository.UsersRepository;
import org.example.ptcmssbackend.service.impl.PasswordServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PasswordServiceImplTest {

    @Mock
    private UsersRepository usersRepository;

    @Mock
    private JwtService jwtService;

    @Mock
    private EmailService emailService;

    @InjectMocks
    private PasswordServiceImpl passwordService;

    // ==================== showSetPasswordPage() Tests ====================

    @Test
    void showSetPasswordPage_whenValidToken_shouldReturnNull() {
        // Given
        String token = "validToken";
        String username = "testuser";

        Users user = new Users();
        user.setId(100);
        user.setUsername(username);
        user.setStatus(UserStatus.INACTIVE);

        when(jwtService.extractUsername(token, TokenType.ACCESS_TOKEN)).thenReturn(username);
        when(usersRepository.findByUsername(username)).thenReturn(Optional.of(user));

        // When
        String result = passwordService.showSetPasswordPage(token);

        // Then
        assertThat(result).isNull();
        verify(jwtService).extractUsername(token, TokenType.ACCESS_TOKEN);
        verify(usersRepository).findByUsername(username);
    }

    @Test
    void showSetPasswordPage_whenInvalidToken_shouldReturnErrorMessage() {
        // Given
        String token = "invalidToken";

        when(jwtService.extractUsername(token, TokenType.ACCESS_TOKEN))
                .thenThrow(new RuntimeException("Invalid token"));

        // When
        String result = passwordService.showSetPasswordPage(token);

        // Then
        assertThat(result).isNotNull();
        assertThat(result).contains("Liên kết không hợp lệ");
        verify(jwtService).extractUsername(token, TokenType.ACCESS_TOKEN);
    }

    @Test
    void showSetPasswordPage_whenUserNotFound_shouldReturnErrorMessage() {
        // Given
        String token = "validToken";
        String username = "nonexistent";

        when(jwtService.extractUsername(token, TokenType.ACCESS_TOKEN)).thenReturn(username);
        when(usersRepository.findByUsername(username)).thenReturn(Optional.empty());

        // When
        String result = passwordService.showSetPasswordPage(token);

        // Then
        assertThat(result).isNotNull();
        assertThat(result).contains("Liên kết không hợp lệ");
    }

    // ==================== setNewPassword() Tests ====================

    @Test
    void setNewPassword_whenValidRequest_shouldSetPassword() {
        // Given
        String token = "validToken";
        String username = "testuser";
        String password = "NewPassword123";
        String confirmPassword = "NewPassword123";

        Users user = new Users();
        user.setId(100);
        user.setUsername(username);
        user.setEmail("test@example.com");
        user.setFullName("Test User");
        user.setStatus(UserStatus.INACTIVE);
        user.setVerificationToken("oldToken");
        user.setPasswordHash("oldHash");

        when(jwtService.extractUsername(token, TokenType.ACCESS_TOKEN)).thenReturn(username);
        when(usersRepository.findByUsername(username)).thenReturn(Optional.of(user));
        when(usersRepository.save(any(Users.class))).thenReturn(user);
        try {
            doNothing().when(emailService).sendCredentialsEmail(anyString(), anyString(), anyString(), anyString());
        } catch (Exception e) {
            // Ignore checked exceptions from mock
        }

        // When
        String result = passwordService.setNewPassword(token, password, confirmPassword);

        // Then
        assertThat(result).isNotNull();
        assertThat(result).contains("Mật khẩu đã được thiết lập thành công");
        assertThat(user.getPasswordHash()).isNotEqualTo("oldHash");
        assertThat(user.getVerificationToken()).isNull();
        assertThat(user.getStatus()).isEqualTo(UserStatus.ACTIVE);
        verify(usersRepository).save(user);
        try {
            verify(emailService).sendCredentialsEmail(anyString(), anyString(), anyString(), anyString());
        } catch (Exception e) {
            // Ignore checked exceptions
        }
    }

    @Test
    void setNewPassword_whenPasswordsDoNotMatch_shouldReturnErrorMessage() {
        // Given
        String token = "validToken";
        String username = "testuser";
        String password = "NewPassword123";
        String confirmPassword = "DifferentPassword";

        Users user = new Users();
        user.setId(100);
        user.setUsername(username);

        when(jwtService.extractUsername(token, TokenType.ACCESS_TOKEN)).thenReturn(username);
        when(usersRepository.findByUsername(username)).thenReturn(Optional.of(user));

        // When
        String result = passwordService.setNewPassword(token, password, confirmPassword);

        // Then
        assertThat(result).isNotNull();
        assertThat(result).contains("Mật khẩu xác nhận không khớp");
        verify(usersRepository, never()).save(any(Users.class));
        try {
            verify(emailService, never()).sendCredentialsEmail(anyString(), anyString(), anyString(), anyString());
        } catch (Exception e) {
            // Ignore checked exceptions
        }
    }

    @Test
    void setNewPassword_whenInvalidToken_shouldReturnErrorMessage() {
        // Given
        String token = "invalidToken";
        String password = "NewPassword123";
        String confirmPassword = "NewPassword123";

        when(jwtService.extractUsername(token, TokenType.ACCESS_TOKEN))
                .thenThrow(new RuntimeException("Invalid token"));

        // When
        String result = passwordService.setNewPassword(token, password, confirmPassword);

        // Then
        assertThat(result).isNotNull();
        assertThat(result).contains("Liên kết không hợp lệ");
        verify(usersRepository, never()).save(any(Users.class));
    }

    @Test
    void setNewPassword_whenUserNotFound_shouldReturnErrorMessage() {
        // Given
        String token = "validToken";
        String username = "nonexistent";
        String password = "NewPassword123";
        String confirmPassword = "NewPassword123";

        when(jwtService.extractUsername(token, TokenType.ACCESS_TOKEN)).thenReturn(username);
        when(usersRepository.findByUsername(username)).thenReturn(Optional.empty());

        // When
        String result = passwordService.setNewPassword(token, password, confirmPassword);

        // Then
        assertThat(result).isNotNull();
        assertThat(result).contains("Liên kết không hợp lệ");
        verify(usersRepository, never()).save(any(Users.class));
    }

    @Test
    void setNewPassword_whenEmailSendingFails_shouldStillSetPassword() throws Exception {
        // Given
        String token = "validToken";
        String username = "testuser";
        String password = "NewPassword123";
        String confirmPassword = "NewPassword123";

        Users user = new Users();
        user.setId(100);
        user.setUsername(username);
        user.setEmail("test@example.com");
        user.setFullName("Test User");
        user.setStatus(UserStatus.INACTIVE);
        user.setVerificationToken("oldToken");

        when(jwtService.extractUsername(token, TokenType.ACCESS_TOKEN)).thenReturn(username);
        when(usersRepository.findByUsername(username)).thenReturn(Optional.of(user));
        when(usersRepository.save(any(Users.class))).thenReturn(user);
        doThrow(new RuntimeException("Email service error"))
                .when(emailService).sendCredentialsEmail(anyString(), anyString(), anyString(), anyString());

        // When
        String result = passwordService.setNewPassword(token, password, confirmPassword);

        // Then
        assertThat(result).isNotNull();
        assertThat(result).contains("Mật khẩu đã được thiết lập thành công");
        // Password should still be set even if email fails
        assertThat(user.getPasswordHash()).isNotNull();
        assertThat(user.getStatus()).isEqualTo(UserStatus.ACTIVE);
        verify(usersRepository).save(user);
    }

    @Test
    void setNewPassword_shouldEncodePassword() {
        // Given
        String token = "validToken";
        String username = "testuser";
        String password = "NewPassword123";
        String confirmPassword = "NewPassword123";

        Users user = new Users();
        user.setId(100);
        user.setUsername(username);
        user.setEmail("test@example.com");
        user.setFullName("Test User");
        user.setStatus(UserStatus.INACTIVE);
        String oldPasswordHash = user.getPasswordHash();

        when(jwtService.extractUsername(token, TokenType.ACCESS_TOKEN)).thenReturn(username);
        when(usersRepository.findByUsername(username)).thenReturn(Optional.of(user));
        when(usersRepository.save(any(Users.class))).thenReturn(user);
        try {
            doNothing().when(emailService).sendCredentialsEmail(anyString(), anyString(), anyString(), anyString());
        } catch (jakarta.mail.MessagingException | java.io.UnsupportedEncodingException e) {
            // Ignore
        }

        // When
        passwordService.setNewPassword(token, password, confirmPassword);

        // Then
        // Password should be encoded (BCrypt hash)
        assertThat(user.getPasswordHash()).isNotEqualTo(password);
        assertThat(user.getPasswordHash()).isNotEqualTo(oldPasswordHash);
        assertThat(user.getPasswordHash()).isNotNull();
        
        // Verify password can be checked with BCrypt
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        assertThat(encoder.matches(password, user.getPasswordHash())).isTrue();
    }
}

