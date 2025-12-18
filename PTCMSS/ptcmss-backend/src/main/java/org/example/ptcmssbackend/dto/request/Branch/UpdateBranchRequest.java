package org.example.ptcmssbackend.dto.request.Branch;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import org.example.ptcmssbackend.enums.BranchStatus;

@Getter
@Setter
public class UpdateBranchRequest {
    private String branchName;
    private String location;
    private Integer managerId;
    private BranchStatus status;
}
