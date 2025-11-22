package org.example.ptcmssbackend.dto.request.Role;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateRoleRequest {
    @NotNull
    private String roleName;
    private String description;
}