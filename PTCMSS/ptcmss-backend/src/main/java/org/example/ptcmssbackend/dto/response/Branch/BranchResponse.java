package org.example.ptcmssbackend.dto.response.Branch;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BranchResponse {
    private Integer id;
    private String branchName;
    private String location;
    private Integer managerId;
    private String managerName;
    private String status;
}

