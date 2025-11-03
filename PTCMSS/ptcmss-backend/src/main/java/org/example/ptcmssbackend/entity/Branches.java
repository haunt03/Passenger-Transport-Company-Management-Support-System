package org.example.ptcmssbackend.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.example.ptcmssbackend.enums.BranchStatus;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Getter
@Setter
@Entity
public class Branches {
    @Id
    @Column(name = "branchId", nullable = false)
    private Integer id;

    @Size(max = 100)
    @NotNull
    @Column(name = "branchName", nullable = false, length = 100)
    private String branchName;

    @Size(max = 255)
    @Column(name = "location")
    private String location;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "managerId")
    private Employees manager;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private BranchStatus status = BranchStatus.ACTIVE;

    @CreationTimestamp
    @Column(name = "createdAt")
    private Instant createdAt;

}