package org.example.ptcmssbackend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
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
@Table(name = "branches")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Branches {
    @Id
    @Column(name = "branchId", nullable = false)
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Size(max = 100)
    @NotNull
    @Column(name = "branchName", nullable = false, length = 100)
    private String branchName;

    @Size(max = 255)
    @Column(name = "location")
    private String location;

    // FIX: tránh vòng lặp JSON và validation
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "managerId")
    @JsonIgnore
    private Employees manager;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private BranchStatus status = BranchStatus.ACTIVE;

    @CreationTimestamp
    @Column(name = "createdAt")
    private Instant createdAt;

}