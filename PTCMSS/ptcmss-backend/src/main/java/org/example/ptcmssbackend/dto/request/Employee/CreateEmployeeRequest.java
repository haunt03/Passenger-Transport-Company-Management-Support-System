package org.example.ptcmssbackend.dto.request.Employee;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CreateEmployeeRequest {

    @NotNull(message = "User ID is required")
    private Integer userId;

    @NotNull(message = "Branch ID is required")
    private Integer branchId;

    @NotNull(message = "Role ID is required")
    private Integer roleId;

    private String status; // ACTIVE or INACTIVE
}