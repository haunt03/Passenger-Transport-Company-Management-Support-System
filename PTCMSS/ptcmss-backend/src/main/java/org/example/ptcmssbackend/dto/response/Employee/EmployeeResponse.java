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
    private String userEmail;
    private String userPhone;
    private String userAddress;
    // Đường dẫn avatar (nếu user có ảnh đại diện)
    private String userAvatar;
    private Integer branchId;
    private String branchName;
    private Integer roleId;
    private String roleName;
    private String status;
}

