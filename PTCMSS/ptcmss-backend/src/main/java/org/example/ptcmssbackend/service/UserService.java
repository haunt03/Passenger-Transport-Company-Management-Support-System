package org.example.ptcmssbackend.service;

import org.example.ptcmssbackend.dto.request.User.CreateUserRequest;
import org.example.ptcmssbackend.dto.request.User.UpdateUserRequest;
import org.example.ptcmssbackend.dto.response.UserResponse;
import org.example.ptcmssbackend.enums.UserStatus;

import java.util.List;
public interface UserService {
    Integer createUser(CreateUserRequest request);
    Integer updateUser(Integer id, UpdateUserRequest request);
    List<UserResponse> getAllUsers(String keyword, Integer roleId, UserStatus status);
    UserResponse getUserById(Integer id);
    void toggleUserStatus(Integer id);
}