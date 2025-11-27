package org.example.ptcmssbackend.service;

import org.springframework.web.multipart.MultipartFile;
import org.example.ptcmssbackend.dto.request.User.CreateUserRequest;
import org.example.ptcmssbackend.dto.request.User.UpdateUserRequest;
import org.example.ptcmssbackend.dto.request.User.UpdateProfileRequest;
import org.example.ptcmssbackend.dto.response.User.UserResponse;
import org.example.ptcmssbackend.enums.UserStatus;

import java.util.List;
public interface UserService {
    Integer createUser(CreateUserRequest request);
    Integer updateUser(Integer id, UpdateUserRequest request);
    Integer updateProfile(Integer id, UpdateProfileRequest request);
    List<UserResponse> getAllUsers(String keyword, Integer roleId, UserStatus status);
    UserResponse getUserById(Integer id);
    void toggleUserStatus(Integer id);

    //  Thêm hàm upload ảnh đại diện
    String updateAvatar(Integer userId, MultipartFile file);

    List<UserResponse> searchUsers(String keyword, Integer roleId, Integer branchId, UserStatus status);
    List<UserResponse> getUsersByBranch(Integer branchId);

}
