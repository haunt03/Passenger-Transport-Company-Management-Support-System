package org.example.ptcmssbackend.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Getter
@Setter
@Entity
@Table(name = "debt_reminder_history")
public class DebtReminderHistory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "reminderId")
    private Integer id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "invoiceId", nullable = false)
    private Invoices invoice;

    @NotNull
    @Column(name = "reminderDate", nullable = false)
    private Instant reminderDate;

    @NotNull
    @Size(max = 20)
    @Column(name = "reminderType", nullable = false, length = 20)
    private String reminderType; // EMAIL, SMS, PHONE

    @Size(max = 100)
    @Column(name = "recipient", length = 100)
    private String recipient;

    @Lob
    @Column(name = "message", columnDefinition = "TEXT")
    private String message;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sentBy")
    private Users sentBy;

    @CreationTimestamp
    @Column(name = "createdAt")
    private Instant createdAt;
}
