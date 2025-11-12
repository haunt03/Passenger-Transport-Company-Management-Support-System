package org.example.ptcmssbackend.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ptcmssbackend.dto.request.Branch.CreateBranchRequest;
import org.example.ptcmssbackend.dto.request.Branch.UpdateBranchRequest;
import org.example.ptcmssbackend.dto.response.Branch.BranchResponse;
import org.example.ptcmssbackend.dto.response.common.PageResponse;
import org.example.ptcmssbackend.entity.Branches;
import org.example.ptcmssbackend.entity.Employees;
import org.example.ptcmssbackend.enums.BranchStatus;
import org.example.ptcmssbackend.repository.BranchesRepository;
import org.example.ptcmssbackend.repository.EmployeeRepository;
import org.example.ptcmssbackend.repository.UsersRepository;
import org.example.ptcmssbackend.service.BranchService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j(topic = "BRANCH_SERVICE")
public class BranchServiceImpl implements BranchService {

    private final BranchesRepository branchesRepository;
    private final UsersRepository usersRepository;
    private final EmployeeRepository employeeRepository;

    @Override
    public BranchResponse createBranch(CreateBranchRequest request) {
        Branches branch = new Branches();
        branch.setBranchName(request.getBranchName());
        branch.setLocation(request.getLocation());
        if (request.getManagerId() != null) {
            Employees manager = employeeRepository.findByUserId(request.getManagerId())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy employee tương ứng với userId: " + request.getManagerId()));
            branch.setManager(manager);
        }
        branch.setStatus(BranchStatus.ACTIVE);
        branchesRepository.save(branch);
        return BranchResponse.builder()
                .id(branch.getId())
                .branchName(branch.getBranchName())
                .manager(branch.getManager().getUser().getFullName())
                .location(branch.getLocation())
                .status(branch.getStatus().name())
                .build();
    }

    @Override
    public Integer updateBranch(Integer id, UpdateBranchRequest request) {
        Branches branch = branchesRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Branch not found"));
        branch.setBranchName(request.getBranchName());
        branch.setLocation(request.getLocation());
        branch.setStatus(request.getStatus());
        if (request.getManagerId() != null) {
            Employees manager = employeeRepository.findByUserId(request.getManagerId())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy employee tương ứng với userId: " + request.getManagerId()));
            branch.setManager(manager);
        }
        return branch.getId();
    }

    @Override
    public PageResponse<?> getAllBranches(String keyword, int pageNo, int pageSize, String sortBy) {
        log.info("Find all users with keyword: {}", keyword);
        int p = pageNo > 0 ? pageNo - 1 : 0;
        List<Sort.Order> sorts = new ArrayList<>();
        // Sort by ID
        if (StringUtils.hasLength(sortBy)) {
            Pattern pattern = Pattern.compile("(\\w+?)(:)(.*)");
            Matcher matcher = pattern.matcher(sortBy);
            if (matcher.find()) {
                if (matcher.group(3).equalsIgnoreCase("asc")) {
                    sorts.add(new Sort.Order(Sort.Direction.ASC, matcher.group(1)));
                } else {
                    sorts.add(new Sort.Order(Sort.Direction.DESC, matcher.group(1)));
                }
            }
        }

        //pagging
        Pageable pageable = PageRequest.of(p, pageSize, Sort.by(sorts));
        Page<Branches> page = branchesRepository.findAll(pageable);

        if(StringUtils.hasLength(keyword)) {
            keyword = "%" + keyword + "%";
            page = branchesRepository.findAll(pageable);
        }else {
            page = branchesRepository.findAll(pageable);
        }
        return getBranchPageResponse(pageNo, pageSize, page);
    }

    @Override
    public BranchResponse getBranchById(Integer id) {
        Branches branch = branchesRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Branch not found"));
        return BranchResponse.builder()
                .id(branch.getId())
                .branchName(branch.getBranchName())
                .manager(branch.getManager().getUser().getFullName())
                .location(branch.getLocation())
                .status(branch.getStatus().name())
                .build();
    }

    @Override
    public Integer deleteBranch(Integer id) {
        Branches branch = branchesRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Branch not found"));
        branch.setStatus(BranchStatus.INACTIVE);
        branchesRepository.save(branch);
        return branch.getId();
    }

    private static PageResponse<Object> getBranchPageResponse(int pageNo, int pageSize, Page<Branches> branches) {
        List<BranchResponse> bracnhResponse = branches.stream()
                .map(branch -> BranchResponse.builder()
                        .id(branch.getId())
                        .branchName(branch.getBranchName())
                        .manager(branch.getManager().getUser().getFullName())
                        .location(branch.getLocation())
                        .status(branch.getStatus().name())
                        .build())
                .toList();
        return PageResponse.builder()
                .items(bracnhResponse)
                .totalPages(pageSize)
                .pageNo(pageNo)
                .pageSize(pageSize)
                .build();
    }
}

