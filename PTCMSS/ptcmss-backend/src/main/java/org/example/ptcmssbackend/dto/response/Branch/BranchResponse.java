package org.example.ptcmssbackend.dto.response.Branch;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;


@Getter
@Setter
@Builder
public class BranchResponse {
    private Integer id;
    private String branchName;
    private String location;
    private String manager;
    private String status;
    private Instant createdAt;
}
