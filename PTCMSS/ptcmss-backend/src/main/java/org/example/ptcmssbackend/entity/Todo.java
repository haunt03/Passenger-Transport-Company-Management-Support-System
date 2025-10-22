package org.example.ptcmssbackend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity @Table(name = "todo")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Todo {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false)
    private boolean done = false;

    @Column(length = 500)
    private String note;
}