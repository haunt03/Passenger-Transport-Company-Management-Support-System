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
    private String imgUrl;
    private String status;
    private String address;
}

