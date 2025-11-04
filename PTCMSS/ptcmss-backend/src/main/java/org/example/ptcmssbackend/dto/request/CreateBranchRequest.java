package org.example.ptcmssbackend.dto.request;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateBranchRequest {
    private String branchName;
    private String location;
    private String phone;
    private Integer managerId;
}