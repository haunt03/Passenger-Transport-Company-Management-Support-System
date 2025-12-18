package org.example.ptcmssbackend.service;

import org.example.ptcmssbackend.dto.request.Role.CreateRoleRequest;
import org.example.ptcmssbackend.dto.request.Role.UpdateRoleRequest;
import org.example.ptcmssbackend.entity.Roles;
import org.example.ptcmssbackend.enums.UserStatus;
import org.example.ptcmssbackend.repository.RolesRepository;
import org.example.ptcmssbackend.service.impl.RoleServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RoleServiceImplTest {

    @Mock
    private RolesRepository rolesRepository;

    @InjectMocks
    private RoleServiceImpl roleService;

    // ==================== createRole() Tests ====================

    @Test
    void createRole_whenValidRequest_shouldCreateRole() {
        // Given
        CreateRoleRequest request = new CreateRoleRequest();
        request.setRoleName("MANAGER");
        request.setDescription("Quản lý chi nhánh");

        Roles savedRole = new Roles();
        savedRole.setId(1);
        savedRole.setRoleName("MANAGER");
        savedRole.setDescription("Quản lý chi nhánh");
        savedRole.setStatus(UserStatus.ACTIVE);

        when(rolesRepository.findByRoleName("MANAGER")).thenReturn(Optional.empty());
        when(rolesRepository.save(any(Roles.class))).thenReturn(savedRole);

        // When
        Roles result = roleService.createRole(request);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1);
        assertThat(result.getRoleName()).isEqualTo("MANAGER");
        assertThat(result.getDescription()).isEqualTo("Quản lý chi nhánh");
        assertThat(result.getStatus()).isEqualTo(UserStatus.ACTIVE);
        verify(rolesRepository).findByRoleName("MANAGER");
        verify(rolesRepository).save(any(Roles.class));
    }

    @Test
    void createRole_whenRoleNameExists_shouldThrowException() {
        // Given
        CreateRoleRequest request = new CreateRoleRequest();
        request.setRoleName("ADMIN");

        Roles existingRole = new Roles();
        existingRole.setId(1);
        existingRole.setRoleName("ADMIN");

        when(rolesRepository.findByRoleName("ADMIN")).thenReturn(Optional.of(existingRole));

        // When & Then
        assertThatThrownBy(() -> roleService.createRole(request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Tên vai trò đã tồn tại");
        verify(rolesRepository, never()).save(any(Roles.class));
    }

    @Test
    void createRole_whenNullDescription_shouldStillCreate() {
        // Given
        CreateRoleRequest request = new CreateRoleRequest();
        request.setRoleName("EMPLOYEE");
        request.setDescription(null);

        Roles savedRole = new Roles();
        savedRole.setId(2);
        savedRole.setRoleName("EMPLOYEE");
        savedRole.setDescription(null);
        savedRole.setStatus(UserStatus.ACTIVE);

        when(rolesRepository.findByRoleName("EMPLOYEE")).thenReturn(Optional.empty());
        when(rolesRepository.save(any(Roles.class))).thenReturn(savedRole);

        // When
        Roles result = roleService.createRole(request);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getDescription()).isNull();
        verify(rolesRepository).save(any(Roles.class));
    }

    // ==================== updateRole() Tests ====================

    @Test
    void updateRole_whenValidRequest_shouldUpdateRole() {
        // Given
        Integer roleId = 1;
        UpdateRoleRequest request = new UpdateRoleRequest();
        request.setRoleName("SENIOR_MANAGER");
        request.setDescription("Quản lý cấp cao");
        request.setStatus(UserStatus.ACTIVE);

        Roles existingRole = new Roles();
        existingRole.setId(roleId);
        existingRole.setRoleName("MANAGER");
        existingRole.setDescription("Quản lý");
        existingRole.setStatus(UserStatus.INACTIVE);

        when(rolesRepository.findById(roleId)).thenReturn(Optional.of(existingRole));
        when(rolesRepository.save(any(Roles.class))).thenReturn(existingRole);

        // When
        Roles result = roleService.updateRole(roleId, request);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getRoleName()).isEqualTo("SENIOR_MANAGER");
        assertThat(result.getDescription()).isEqualTo("Quản lý cấp cao");
        assertThat(result.getStatus()).isEqualTo(UserStatus.ACTIVE);
        verify(rolesRepository).findById(roleId);
        verify(rolesRepository).save(existingRole);
    }

    @Test
    void updateRole_whenPartialUpdate_shouldUpdateOnlyProvidedFields() {
        // Given
        Integer roleId = 1;
        UpdateRoleRequest request = new UpdateRoleRequest();
        request.setDescription("Mô tả mới");
        // roleName và status không được set

        Roles existingRole = new Roles();
        existingRole.setId(roleId);
        existingRole.setRoleName("MANAGER");
        existingRole.setDescription("Mô tả cũ");
        existingRole.setStatus(UserStatus.ACTIVE);

        when(rolesRepository.findById(roleId)).thenReturn(Optional.of(existingRole));
        when(rolesRepository.save(any(Roles.class))).thenReturn(existingRole);

        // When
        Roles result = roleService.updateRole(roleId, request);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getRoleName()).isEqualTo("MANAGER"); // Không đổi
        assertThat(result.getDescription()).isEqualTo("Mô tả mới"); // Đã đổi
        assertThat(result.getStatus()).isEqualTo(UserStatus.ACTIVE); // Không đổi
        verify(rolesRepository).save(existingRole);
    }

    @Test
    void updateRole_whenRoleNotFound_shouldThrowException() {
        // Given
        Integer roleId = 999;
        UpdateRoleRequest request = new UpdateRoleRequest();

        when(rolesRepository.findById(roleId)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> roleService.updateRole(roleId, request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không tìm thấy vai trò");
        verify(rolesRepository, never()).save(any(Roles.class));
    }

    // ==================== getAllRoles() Tests ====================

    @Test
    void getAllRoles_whenNoFilters_shouldReturnAllRoles() {
        // Given
        Roles role1 = new Roles();
        role1.setId(1);
        role1.setRoleName("ADMIN");
        role1.setStatus(UserStatus.ACTIVE);

        Roles role2 = new Roles();
        role2.setId(2);
        role2.setRoleName("MANAGER");
        role2.setStatus(UserStatus.ACTIVE);

        Roles role3 = new Roles();
        role3.setId(3);
        role3.setRoleName("EMPLOYEE");
        role3.setStatus(UserStatus.INACTIVE);

        when(rolesRepository.findAll()).thenReturn(List.of(role1, role2, role3));

        // When
        List<Roles> result = roleService.getAllRoles(null, null);

        // Then
        assertThat(result).hasSize(3);
        verify(rolesRepository).findAll();
    }

    @Test
    void getAllRoles_whenKeywordFilter_shouldFilterByKeyword() {
        // Given
        Roles role1 = new Roles();
        role1.setId(1);
        role1.setRoleName("ADMIN");
        role1.setStatus(UserStatus.ACTIVE);

        Roles role2 = new Roles();
        role2.setId(2);
        role2.setRoleName("MANAGER");
        role2.setStatus(UserStatus.ACTIVE);

        Roles role3 = new Roles();
        role3.setId(3);
        role3.setRoleName("EMPLOYEE");
        role3.setStatus(UserStatus.ACTIVE);

        when(rolesRepository.findAll()).thenReturn(List.of(role1, role2, role3));

        // When
        List<Roles> result = roleService.getAllRoles("MAN", null);

        // Then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getRoleName()).isEqualTo("MANAGER");
    }

    @Test
    void getAllRoles_whenStatusFilter_shouldFilterByStatus() {
        // Given
        Roles role1 = new Roles();
        role1.setId(1);
        role1.setRoleName("ADMIN");
        role1.setStatus(UserStatus.ACTIVE);

        Roles role2 = new Roles();
        role2.setId(2);
        role2.setRoleName("MANAGER");
        role2.setStatus(UserStatus.ACTIVE);

        Roles role3 = new Roles();
        role3.setId(3);
        role3.setRoleName("EMPLOYEE");
        role3.setStatus(UserStatus.INACTIVE);

        when(rolesRepository.findAll()).thenReturn(List.of(role1, role2, role3));

        // When
        List<Roles> result = roleService.getAllRoles(null, UserStatus.ACTIVE);

        // Then
        assertThat(result).hasSize(2);
        assertThat(result).allMatch(r -> r.getStatus() == UserStatus.ACTIVE);
    }

    @Test
    void getAllRoles_whenBothFilters_shouldFilterByBoth() {
        // Given
        Roles role1 = new Roles();
        role1.setId(1);
        role1.setRoleName("ADMIN");
        role1.setStatus(UserStatus.ACTIVE);

        Roles role2 = new Roles();
        role2.setId(2);
        role2.setRoleName("MANAGER");
        role2.setStatus(UserStatus.ACTIVE);

        Roles role3 = new Roles();
        role3.setId(3);
        role3.setRoleName("EMPLOYEE");
        role3.setStatus(UserStatus.INACTIVE);

        when(rolesRepository.findAll()).thenReturn(List.of(role1, role2, role3));

        // When
        List<Roles> result = roleService.getAllRoles("AD", UserStatus.ACTIVE);

        // Then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getRoleName()).isEqualTo("ADMIN");
    }

    @Test
    void getAllRoles_whenNoMatches_shouldReturnEmptyList() {
        // Given
        Roles role1 = new Roles();
        role1.setId(1);
        role1.setRoleName("ADMIN");
        role1.setStatus(UserStatus.ACTIVE);

        when(rolesRepository.findAll()).thenReturn(List.of(role1));

        // When
        List<Roles> result = roleService.getAllRoles("NONEXISTENT", null);

        // Then
        assertThat(result).isEmpty();
    }

    // ==================== getRoleById() Tests ====================

    @Test
    void getRoleById_whenRoleExists_shouldReturnRole() {
        // Given
        Integer roleId = 1;

        Roles role = new Roles();
        role.setId(roleId);
        role.setRoleName("ADMIN");
        role.setDescription("Quản trị viên");
        role.setStatus(UserStatus.ACTIVE);

        when(rolesRepository.findById(roleId)).thenReturn(Optional.of(role));

        // When
        Roles result = roleService.getRoleById(roleId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(roleId);
        assertThat(result.getRoleName()).isEqualTo("ADMIN");
        assertThat(result.getDescription()).isEqualTo("Quản trị viên");
        assertThat(result.getStatus()).isEqualTo(UserStatus.ACTIVE);
        verify(rolesRepository).findById(roleId);
    }

    @Test
    void getRoleById_whenRoleNotFound_shouldThrowException() {
        // Given
        Integer roleId = 999;

        when(rolesRepository.findById(roleId)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> roleService.getRoleById(roleId))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không tìm thấy vai trò");
    }

    // ==================== deleteRole() Tests ====================

    @Test
    void deleteRole_whenRoleExists_shouldSetStatusToInactive() {
        // Given
        Integer roleId = 1;

        Roles role = new Roles();
        role.setId(roleId);
        role.setRoleName("EMPLOYEE");
        role.setStatus(UserStatus.ACTIVE);

        when(rolesRepository.findById(roleId)).thenReturn(Optional.of(role));
        when(rolesRepository.save(any(Roles.class))).thenReturn(role);

        // When
        roleService.deleteRole(roleId);

        // Then
        assertThat(role.getStatus()).isEqualTo(UserStatus.INACTIVE);
        verify(rolesRepository).findById(roleId);
        verify(rolesRepository).save(role);
    }

    @Test
    void deleteRole_whenRoleNotFound_shouldThrowException() {
        // Given
        Integer roleId = 999;

        when(rolesRepository.findById(roleId)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> roleService.deleteRole(roleId))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không tìm thấy vai trò");
        verify(rolesRepository, never()).save(any(Roles.class));
    }

    @Test
    void deleteRole_whenAlreadyInactive_shouldStillSetToInactive() {
        // Given
        Integer roleId = 1;

        Roles role = new Roles();
        role.setId(roleId);
        role.setRoleName("EMPLOYEE");
        role.setStatus(UserStatus.INACTIVE);

        when(rolesRepository.findById(roleId)).thenReturn(Optional.of(role));
        when(rolesRepository.save(any(Roles.class))).thenReturn(role);

        // When
        roleService.deleteRole(roleId);

        // Then
        assertThat(role.getStatus()).isEqualTo(UserStatus.INACTIVE);
        verify(rolesRepository).save(role);
    }

    // ==================== Edge Cases ====================

    @Test
    void getAllRoles_whenCaseInsensitiveKeyword_shouldMatch() {
        // Given
        Roles role1 = new Roles();
        role1.setId(1);
        role1.setRoleName("ADMIN");
        role1.setStatus(UserStatus.ACTIVE);

        Roles role2 = new Roles();
        role2.setId(2);
        role2.setRoleName("admin");
        role2.setStatus(UserStatus.ACTIVE);

        when(rolesRepository.findAll()).thenReturn(List.of(role1, role2));

        // When
        List<Roles> result = roleService.getAllRoles("admin", null);

        // Then
        assertThat(result).hasSize(2); // Case insensitive matching
    }

    @Test
    void createRole_shouldAlwaysSetStatusToActive() {
        // Given
        CreateRoleRequest request = new CreateRoleRequest();
        request.setRoleName("NEW_ROLE");
        request.setDescription("New role description");

        Roles savedRole = new Roles();
        savedRole.setId(1);
        savedRole.setRoleName("NEW_ROLE");
        savedRole.setStatus(UserStatus.ACTIVE);

        when(rolesRepository.findByRoleName("NEW_ROLE")).thenReturn(Optional.empty());
        when(rolesRepository.save(any(Roles.class))).thenReturn(savedRole);

        // When
        Roles result = roleService.createRole(request);

        // Then
        assertThat(result.getStatus()).isEqualTo(UserStatus.ACTIVE);
    }
}


