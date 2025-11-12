package org.example.ptcmssbackend.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmployeeDTO {
    private Integer id;
    private Integer userId;
    private String userFullName;
    private Integer branchId;
    private String branchName;
    private Integer roleId;
    private String roleName;
    private String status;
}