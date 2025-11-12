package org.example.ptcmssbackend.dto.response.Employee;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmployeeResponse {
    private Integer id;
    private Integer userId;
    private String userFullName;
    private Integer branchId;
    private String branchName;
    private Integer roleId;
    private String roleName;
    private String status;
}
