package org.example.ptcmssbackend.dto.request.Debt;

import lombok.Data;

import java.time.LocalDate;

@Data
public class UpdateDebtInfoRequest {
    private LocalDate promiseToPayDate;

    private String debtLabel; // VIP, TRANH_CHAP, NORMAL

    private String contactNote;
}
