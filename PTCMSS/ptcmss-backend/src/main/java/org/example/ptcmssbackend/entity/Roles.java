package org.example.ptcmssbackend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
public class Roles {
    @Id
    @Column(name = "roleId", nullable = false)
    private Integer id;

    @Size(max = 50)
    @NotNull
    @Column(name = "roleName", nullable = false, length = 50)
    private String roleName;

    @Size(max = 255)
    @Column(name = "description")
    private String description;

}