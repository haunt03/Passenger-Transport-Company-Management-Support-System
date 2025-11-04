package org.example.ptcmssbackend.dto.response;

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
    private String status;
}