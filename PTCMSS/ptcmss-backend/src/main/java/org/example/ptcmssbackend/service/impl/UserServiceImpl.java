package org.example.ptcmssbackend.service.impl;

import lombok.RequiredArgsConstructor;
import org.example.ptcmssbackend.dto.request.User.CreateUserRequest;
import org.example.ptcmssbackend.dto.request.User.UpdateUserRequest;
import org.example.ptcmssbackend.dto.response.User.UserResponse;
import org.example.ptcmssbackend.entity.Roles;
import org.example.ptcmssbackend.entity.Users;
import org.example.ptcmssbackend.enums.UserStatus;
import org.example.ptcmssbackend.repository.RolesRepository;
import org.example.ptcmssbackend.repository.UsersRepository;
import org.example.ptcmssbackend.service.EmailService;
import org.example.ptcmssbackend.service.LocalImageService;
import org.example.ptcmssbackend.service.UserService;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.io.UnsupportedEncodingException;
import java.util.List;
import java.util.UUID;
import jakarta.mail.MessagingException;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UsersRepository usersRepository;
    private final RolesRepository rolesRepository;
    private final EmailService emailService;
    private final LocalImageService localImageService; //

    @Override
    public Integer createUser(CreateUserRequest request) {
        Roles role = rolesRepository.findById(request.getRoleId())
                .orElseThrow(() -> new RuntimeException("Role not found"));

        // Tạo user mới (chưa kích hoạt)
        Users user = new Users();
        user.setFullName(request.getFullName());
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPhone(request.getPhone());
        user.setAddress(request.getAddress());
        user.setRole(role);
        user.setPasswordHash("TEAMP123"); // gán mật khẩu tạm thời
        user.setStatus(UserStatus.INACTIVE); // chưa kích hoạt
        user.setEmailVerified(false);
        user.setVerificationToken(UUID.randomUUID().toString());

        usersRepository.save(user);

        // Tạo đường dẫn xác thực (URL base theo domain)
        String baseUrl = ServletUriComponentsBuilder.fromCurrentContextPath().build().toUriString();

        try {
            emailService.sendVerificationEmail(
                    user.getEmail(),
                    user.getFullName(),
                    user.getVerificationToken(),
                    baseUrl
            );
        } catch (MessagingException | UnsupportedEncodingException e) {
            throw new RuntimeException("Gửi email xác thực thất bại!", e);
        }

        return user.getId();
    }

    @Override
    public Integer updateUser(Integer id, UpdateUserRequest request) {
        Users user = usersRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setFullName(request.getFullName());
        user.setEmail(request.getEmail());
        user.setPhone(request.getPhone());
        user.setAddress(request.getAddress());
        if (request.getRoleId() != null) {
            Roles role = rolesRepository.findById(request.getRoleId())
                    .orElseThrow(() -> new RuntimeException("Role not found"));
            user.setRole(role);
        }
        if (request.getStatus() != null)
            user.setStatus(request.getStatus());
        usersRepository.save(user);
        return user.getId();
    }

    @Override
    public List<UserResponse> getAllUsers(String keyword, Integer roleId, UserStatus status) {
        return usersRepository.findAll().stream()
                .filter(u -> (keyword == null || u.getFullName().toLowerCase().contains(keyword.toLowerCase())
                        || (u.getEmail() != null && u.getEmail().contains(keyword)))
                        && (roleId == null || (u.getRole() != null && u.getRole().getId().equals(roleId)))
                        && (status == null || u.getStatus() == status))
                .map(u -> UserResponse.builder()
                        .id(u.getId())
                        .fullName(u.getFullName())
                        .email(u.getEmail())
                        .phone(u.getPhone())
                        .roleName(u.getRole() != null ? u.getRole().getRoleName() : null)
                        .status(u.getStatus() != null ? u.getStatus().name() : null)
                        .build())
                .toList();
    }

    @Override
    public UserResponse getUserById(Integer id) {
        Users user = usersRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return UserResponse.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .address(user.getAddress())
                .imgUrl(user.getAvatar())
                .roleName(user.getRole() != null ? user.getRole().getRoleName() : null)
                .status(user.getStatus() != null ? user.getStatus().name() : null)
                .build();
    }

    @Override
    public void toggleUserStatus(Integer id) {
        Users user = usersRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setStatus(user.getStatus() == UserStatus.ACTIVE ? UserStatus.INACTIVE : UserStatus.ACTIVE);
        usersRepository.save(user);
    }

    @Override
    public String updateAvatar(Integer userId, MultipartFile file) {
        Users user = usersRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        // Lưu ảnh mới
        String imageUrl = localImageService.saveImage(file);
        user.setAvatar(imageUrl);
        usersRepository.save(user);

        return imageUrl;
    }
}
