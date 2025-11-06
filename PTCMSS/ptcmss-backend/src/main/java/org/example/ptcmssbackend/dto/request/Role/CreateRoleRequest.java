package org.example.ptcmssbackend.dto.request.Role;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateRoleRequest {
    private String roleName;
    private String description;
}