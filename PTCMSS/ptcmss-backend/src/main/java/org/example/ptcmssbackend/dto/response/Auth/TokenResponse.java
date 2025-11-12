package org.example.ptcmssbackend.dto.response.Auth;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;


@Getter
@Setter
@Builder
public class TokenResponse {
    private String AccessToken;
    private String RefreshToken;
    private String username;
    private Integer userId;
    private String roleName;
}
