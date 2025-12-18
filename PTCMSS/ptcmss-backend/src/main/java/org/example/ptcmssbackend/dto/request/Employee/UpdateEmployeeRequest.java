package org.example.ptcmssbackend.dto.request.Employee;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UpdateEmployeeRequest {

    @NotNull(message = "Branch ID is required")
    private Integer branchId;

    @NotNull(message = "Role ID is required")
    private Integer roleId;

    private String status; // ACTIVE or INACTIVE

    @Size(max = 255, message = "Full name must be less than 255 characters")
    private String fullName;

    @Email(message = "Email is invalid")
    @Size(max = 255, message = "Email must be less than 255 characters")
    private String email;

    @Pattern(regexp = "^(|[0-9]{9,15})$", message = "Phone must contain 9-15 digits")
    private String phone;

    @Size(max = 500, message = "Address must be less than 500 characters")
    private String address;
}
