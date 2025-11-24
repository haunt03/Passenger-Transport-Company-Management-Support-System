package org.example.ptcmssbackend.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Getter
@Setter
@Entity
@Table(name = "notifications")
public class Notifications {
    @Id
    @Column(name = "notificationId", nullable = false)
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "userId", nullable = false)
    private Users user;

    @Size(max = 100)
    @Column(name = "title", length = 100)
    private String title;

    @Size(max = 500)
    @Column(name = "message", length = 500)
    private String message;

    @CreationTimestamp
    @Column(name = "createdAt")
    private Instant createdAt;

    @ColumnDefault("0")
    @Column(name = "isRead")
    private Boolean isRead;

}