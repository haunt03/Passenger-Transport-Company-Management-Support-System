package org.example.ptcmssbackend.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import org.example.ptcmssbackend.enums.EmployeeStatus;

@Getter
@Setter
@Entity
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Employees {
    @Id
    @Column(name = "employeeId", nullable = false)
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer employeeId;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "userId", nullable = false)
    private Users user;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "branchId", nullable = false)
    private Branches branch;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "roleId", nullable = false)
    private Roles role;


    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private EmployeeStatus status= EmployeeStatus.ACTIVE;
}