package org.example.ptcmssbackend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ptcmssbackend.dto.request.LoginRequest;
import org.example.ptcmssbackend.dto.response.TokenResponse;
import org.example.ptcmssbackend.service.AuthenticationService;
import org.example.ptcmssbackend.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.servlet.view.RedirectView;
import org.springframework.web.bind.annotation.*;
@Slf4j(topic = "AUTH_CONTROLLER")
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
@Tag(name = "Authentication API", description = "Xử lý đăng nhập, refresh token và đăng xuất người dùng")
public class AuthController {

    private final AuthenticationService authService;


    // ---------------- LOGIN ----------------
    @Operation(
            summary = "Đăng nhập",
            description = "Nhập username và password để nhận về Access Token và Refresh Token.",
            responses = {
                    @ApiResponse(responseCode = "200", description = "Đăng nhập thành công",
                            content = @Content(mediaType = "application/json",
                                    schema = @Schema(implementation = TokenResponse.class))),
                    @ApiResponse(responseCode = "401", description = "Sai username hoặc password",
                            content = @Content)
            }
    )
    @PostMapping("/login")
    public ResponseEntity<TokenResponse> login(@Validated @RequestBody LoginRequest request) {
        log.info("[LOGIN] Request login for username: {}", request.getUsername());
        TokenResponse response = authService.getAccessToken(request);
        log.info("[LOGIN] Login successful for username: {}", request.getUsername());
        return ResponseEntity.ok(response);
    }

    // ---------------- REFRESH TOKEN ----------------
    @Operation(
            summary = "Làm mới token",
            description = "Gửi Refresh Token để nhận Access Token mới khi Access Token cũ hết hạn.",
            responses = {
                    @ApiResponse(responseCode = "200", description = "Làm mới thành công",
                            content = @Content(mediaType = "application/json",
                                    schema = @Schema(implementation = TokenResponse.class))),
                    @ApiResponse(responseCode = "403", description = "Token không hợp lệ hoặc hết hạn",
                            content = @Content)
            }
    )
    @PostMapping("/refresh-token")
    public ResponseEntity<TokenResponse> refreshToken(@RequestParam String refreshToken) {
        log.info("[REFRESH] Refresh token request received");
        TokenResponse response = authService.getRefreshToken(refreshToken);
        return ResponseEntity.ok(response);
    }

    // ---------------- LOGOUT ----------------
    @Operation(
            summary = "Đăng xuất",
            description = "Xóa token trong DB, kết thúc phiên đăng nhập hiện tại.",
            responses = {
                    @ApiResponse(responseCode = "200", description = "Đăng xuất thành công"),
                    @ApiResponse(responseCode = "400", description = "Không có token trong header"),
            }
    )
    @PostMapping("/logout")
    public ResponseEntity<String> logout(HttpServletRequest request) {
        log.info("[LOGOUT] Logout request received");
        String message = authService.removeToken(request);
        return ResponseEntity.ok(message);
    }

    // ---------------- VERIFY TOKEN ----------------
    @Operation(
            summary = "Xác thực token từ email",
            description = "Người dùng nhấp vào link trong email, backend xác thực token và chuyển hướng tới trang đặt mật khẩu của frontend.",
            responses = {
                    @ApiResponse(responseCode = "302", description = "Chuyển hướng thành công đến trang frontend"),
                    @ApiResponse(responseCode = "400", description = "Token không hợp lệ hoặc đã hết hạn")
            }
    )
    @GetMapping("/verify")
    public RedirectView verifyAccount(@RequestParam("token") String token) {
        log.info("[VERIFY] Verifying token");
        String frontendUrl = authService.verifyAccount(token);
        log.info("[VERIFY] Redirecting to frontend: {}", frontendUrl);
        return new RedirectView(frontendUrl);
    }
}
