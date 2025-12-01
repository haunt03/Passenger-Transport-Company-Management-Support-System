package org.example.ptcmssbackend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class QrSettingsUpdateRequest {

    @NotBlank(message = "Mã ngân hàng không được để trống")
    @Size(min = 6, max = 10, message = "Mã ngân hàng phải từ 6-10 ký tự")
    @Pattern(regexp = "^[0-9]+$", message = "Mã ngân hàng chỉ được chứa số")
    private String bankCode;

    @NotBlank(message = "Số tài khoản không được để trống")
    @Size(min = 8, max = 20, message = "Số tài khoản phải từ 8-20 ký tự")
    @Pattern(regexp = "^[0-9]+$", message = "Số tài khoản chỉ được chứa số")
    private String accountNumber;

    @NotBlank(message = "Tên tài khoản không được để trống")
    @Size(min = 3, max = 100, message = "Tên tài khoản phải từ 3-100 ký tự")
    private String accountName;

    @Size(max = 20, message = "Mã mô tả không quá 20 ký tự")
    private String descriptionPrefix;
}
