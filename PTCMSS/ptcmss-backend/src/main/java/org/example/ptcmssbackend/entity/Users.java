package org.example.ptcmssbackend.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.example.ptcmssbackend.enums.UserStatus;
import org.hibernate.annotations.CreationTimestamp;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.Instant;
import java.util.Collection;
import java.util.Collections;

@Getter
@Setter
@Entity
@Table(name = "Users")
public class Users implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "userId", nullable = false)
    private Integer id;

    // ✅ Load luôn role để tránh LazyInitializationException khi Spring Security gọi getAuthorities()
    @NotNull
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "roleId", nullable = false)
    private Roles role;

    @Size(max = 100)
    @NotNull
    @Column(name = "fullName", nullable = false, length = 100)
    private String fullName;

    @Size(max = 50)
    @NotNull
    @Column(name = "username", nullable = false, length = 50, unique = true)
    private String username;

    @Size(max = 255)
    @NotNull
    @Column(name = "passwordHash", nullable = false)
    private String passwordHash;

    @Size(max = 100)
    @Column(name = "email", length = 100)
    private String email;

    @Size(max = 20)
    @Column(name = "phone", length = 20)
    private String phone;

    @Size(max = 255)
    @Column(name = "address")
    private String address;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20)
    private UserStatus status = UserStatus.ACTIVE;

    @Column(name = "email_verified")
    private Boolean emailVerified = false;

    @Column(name = "verification_token", length = 64)
    private String verificationToken;

    @CreationTimestamp
    @Column(name = "createdAt", updatable = false)
    private Instant createdAt;

    // ================================================================
    //  Spring Security UserDetails implementation
    // ================================================================

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        // ✅ Role sẽ luôn được load (EAGER), không còn lỗi "no Session"
        String roleName = role != null ? role.getRoleName().toUpperCase() : "USER";
        return Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + roleName));
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public String getUsername() {
        return username;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return status == UserStatus.ACTIVE;
    }
}
