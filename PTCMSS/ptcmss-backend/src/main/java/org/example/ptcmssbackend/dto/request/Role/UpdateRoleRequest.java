package org.example.ptcmssbackend.dto.request.Role;

import lombok.Getter;
import lombok.Setter;
import org.example.ptcmssbackend.enums.UserStatus;


@Getter
@Setter
public class UpdateRoleRequest {
    private String roleName;
    private String description;
    private UserStatus status;
}
