package org.example.ptcmssbackend.service.impl;

import lombok.RequiredArgsConstructor;
import org.example.ptcmssbackend.dto.request.Role.CreateRoleRequest;
import org.example.ptcmssbackend.dto.request.Role.UpdateRoleRequest;
import org.example.ptcmssbackend.entity.Roles;
import org.example.ptcmssbackend.enums.UserStatus;
import org.example.ptcmssbackend.repository.RolesRepository;
import org.example.ptcmssbackend.service.RoleService;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RoleServiceImpl implements RoleService {

    private final RolesRepository rolesRepository;

    @Override
    public Roles createRole(CreateRoleRequest request) {
        if (rolesRepository.findByRoleName(request.getRoleName()).isPresent()) {
            throw new RuntimeException("Role name already exists");
        }
        Roles role = new Roles();
        role.setRoleName(request.getRoleName());
        role.setDescription(request.getDescription());
        role.setStatus(UserStatus.ACTIVE);
        return rolesRepository.save(role);
    }

    @Override
    public Roles updateRole(Integer id, UpdateRoleRequest request) {
        Roles role = rolesRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Role not found"));
        if (request.getRoleName() != null)
            role.setRoleName(request.getRoleName());
        if (request.getDescription() != null)
            role.setDescription(request.getDescription());
        if (request.getStatus() != null)
            role.setStatus(request.getStatus());
        return rolesRepository.save(role);
    }

    @Override
    public List<Roles> getAllRoles(String keyword, UserStatus status) {
        return rolesRepository.findAll().stream()
                .filter(r -> (keyword == null || r.getRoleName().toLowerCase().contains(keyword.toLowerCase()))
                        && (status == null || r.getStatus() == status))
                .toList();
    }

    @Override
    public Roles getRoleById(Integer id) {
        return rolesRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Role not found"));
    }

    @Override
    public void deleteRole(Integer id) {
        Roles role = getRoleById(id);
        role.setStatus(UserStatus.INACTIVE);
        rolesRepository.save(role);
    }
}
