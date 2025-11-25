package org.example.ptcmssbackend.service;

import org.example.ptcmssbackend.dto.request.Branch.CreateBranchRequest;
import org.example.ptcmssbackend.dto.request.Branch.UpdateBranchRequest;
import org.example.ptcmssbackend.dto.response.Branch.BranchResponse;
import org.example.ptcmssbackend.dto.response.Branch.ManagerDashboardStatsResponse;
import org.example.ptcmssbackend.dto.response.common.PageResponse;

public interface BranchService {
    BranchResponse createBranch(CreateBranchRequest request);
    Integer updateBranch(Integer id, UpdateBranchRequest request);
    PageResponse<?> getAllBranches(String keyword, int pageNo, int pageSize, String sortBy);
    BranchResponse getBranchById(Integer id);
    Integer deleteBranch(Integer id);

    BranchResponse getBranchByUserId(Integer userId);

    ManagerDashboardStatsResponse getManagerDashboardStats(Integer branchId, String period);
}