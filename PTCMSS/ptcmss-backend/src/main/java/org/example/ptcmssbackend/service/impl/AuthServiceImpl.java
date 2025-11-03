package org.example.ptcmssbackend.service.impl;

import lombok.RequiredArgsConstructor;
import org.example.ptcmssbackend.dto.LoginRequest;
import org.example.ptcmssbackend.dto.LoginResponse;
import org.example.ptcmssbackend.entity.Users;
import org.example.ptcmssbackend.enums.UserStatus;
import org.example.ptcmssbackend.repository.UsersRepository;
import org.example.ptcmssbackend.service.AuthService;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UsersRepository usersRepository;

    @Override
    public LoginResponse login(LoginRequest request) {
        Users user = usersRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new RuntimeException("Invalid username or password"));

        // For demo: passwordHash stores plain text or some hash; here we compare raw
        if (!user.getPasswordHash().equals(request.getPassword())) {
            throw new RuntimeException("Invalid username or password");
        }
        if (user.getStatus() != null && user.getStatus() != UserStatus.ACTIVE) {
            throw new RuntimeException("User is not active");
        }

        String tokenPayload = user.getId() + ":" + user.getUsername() + ":" + System.currentTimeMillis();
        String token = Base64.getEncoder().encodeToString(tokenPayload.getBytes(StandardCharsets.UTF_8));

        return LoginResponse.builder()
                .token(token)
                .user(LoginResponse.UserDto.builder()
                        .id(user.getId())
                        .username(user.getUsername())
                        .fullName(user.getFullName())
                        .email(user.getEmail())
                        .phone(user.getPhone())
                        .role(user.getRole() != null ? user.getRole().getRoleName() : null)
                        .status(user.getStatus() != null ? user.getStatus().name() : null)
                        .build())
                .build();
    }
}
