package org.example.ptcmssbackend.dto.response.User;


import lombok.*;


@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class UserResponse {
    private Integer id;
    private String fullName;
    private String email;
    private String phone;
    private String roleName;
    private Integer roleId; // Thêm roleId để frontend có thể hiển thị
    private String imgUrl;
    private String status;
    private String address;
    private Integer branchId; // Thêm branchId
    private String branchName; // Thêm branchName để hiển thị
}


