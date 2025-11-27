package org.example.ptcmssbackend.dto.request.User;

import lombok.Getter;
import lombok.Setter;
import org.example.ptcmssbackend.dto.validator.PhoneNumber;

@Getter
@Setter
public class UpdateProfileRequest {
    
    @PhoneNumber(message = "Số điện thoại không hợp lệ")
    private String phone;
    
    private String address;
    
    // Avatar sẽ được upload riêng qua endpoint /users/{id}/avatar
}
