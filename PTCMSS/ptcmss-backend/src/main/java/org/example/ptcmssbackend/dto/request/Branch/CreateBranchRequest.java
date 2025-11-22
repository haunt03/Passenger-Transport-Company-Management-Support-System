package org.example.ptcmssbackend.dto.request.Branch;

import jakarta.validation.constraints.NotEmpty;
import lombok.Getter;
import lombok.Setter;
import org.example.ptcmssbackend.dto.validator.PhoneNumber;

@Getter
@Setter
public class CreateBranchRequest {

    @NotEmpty(message = "Tên chi nhánh không được để trống")
    private String branchName;

    @NotEmpty(message = "Địa chỉ không được để trống")
    private String location;

    @PhoneNumber(message = "Số điện thoại phải gồm 10 chữ số")
    private String phone;
    private Integer managerId;
}