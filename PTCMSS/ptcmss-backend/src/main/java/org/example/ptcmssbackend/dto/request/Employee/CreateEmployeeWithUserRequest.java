package org.example.ptcmssbackend.dto.request.Employee;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CreateEmployeeWithUserRequest {

    // User information
    @NotBlank(message = "Username is required")
    @Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters")
    private String username;

    // Password không cần nữa - sẽ tạo sau khi verify email
    // @NotBlank(message = "Password is required")
    // @Size(min = 6, message = "Password must be at least 6 characters")
    // private String password;

    @NotBlank(message = "Full name is required")
    @Size(max = 100, message = "Full name must not exceed 100 characters")
    private String fullName;

    @NotBlank(message = "Email is required for verification")
    @Email(message = "Invalid email format")
    @Size(max = 100, message = "Email must not exceed 100 characters")
    private String email;

    @Size(max = 20, message = "Phone must not exceed 20 characters")
    private String phone;

    private String address;

    // Employee information
    @NotNull(message = "Branch ID is required")
    private Integer branchId;

    @NotNull(message = "Role ID is required")
    private Integer roleId;

    private String status; // ACTIVE or INACTIVE (default: ACTIVE)

    // Driver-specific information (optional, only for Driver role)
    private String licenseNumber;
}
