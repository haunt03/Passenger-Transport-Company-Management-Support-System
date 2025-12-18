package org.example.ptcmssbackend.dto.request.Driver;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDate;

@Data
@Schema(description = "Request cập nhật hồ sơ tài xế")
public class DriverProfileUpdateRequest {

    @Schema(description = "Số điện thoại", example = "0912345678")
    private String phone;

    @Schema(description = "Địa chỉ nơi ở", example = "123 Lê Lợi, Quận Ninh Kiều, Cần Thơ")
    private String address;

    @Schema(description = "Ghi chú", example = "Đang làm tài xế chính ca sáng")
    private String note;

    @Schema(description = "Ngày kiểm tra sức khỏe gần nhất", example = "2025-10-01")
    private LocalDate healthCheckDate;

    @Schema(description = "Số giấy phép lái xe", example = "DN-D001")
    private String licenseNumber;

    @Schema(description = "Hạng giấy phép lái xe", example = "D")
    private String licenseClass;

    @Schema(description = "Ngày hết hạn GPLX", example = "2028-12-31")
    private LocalDate licenseExpiry;

    @Schema(description = "Trạng thái tài xế", example = "AVAILABLE")
    private String status;
}
