package org.example.ptcmssbackend.dto.request.Booking;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class VehicleDetailRequest {
    @NotNull(message = "ID loại xe không được để trống")
    private Integer vehicleCategoryId;

    @NotNull(message = "Số lượng không được để trống")
    @Min(value = 1, message = "Số lượng phải lớn hơn 0")
    private Integer quantity;
}
