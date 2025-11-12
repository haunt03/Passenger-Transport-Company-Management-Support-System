package org.example.ptcmssbackend.service;

import org.example.ptcmssbackend.dto.request.Role.CreateRoleRequest;
import org.example.ptcmssbackend.dto.request.Role.UpdateRoleRequest;
import org.example.ptcmssbackend.entity.Roles;
import org.example.ptcmssbackend.enums.UserStatus;

import java.util.List;

public interface RoleService {
    Roles createRole(CreateRoleRequest request);
    Roles updateRole(Integer id, UpdateRoleRequest request);
    List<Roles> getAllRoles(String keyword, UserStatus status);
    Roles getRoleById(Integer id);
    void deleteRole(Integer id);
}
