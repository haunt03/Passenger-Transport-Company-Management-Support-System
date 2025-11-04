package org.example.ptcmssbackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ptcmssbackend.entity.Users;
import org.example.ptcmssbackend.repository.UsersRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j(topic = "USER_DETAILS_SERVICE")
public class UserServiceDetail implements UserDetailsService {

    private final UsersRepository userRepository;

    /**
     * Hàm này được Spring Security tự động gọi khi xác thực user.
     * Nó sẽ tìm user trong DB và trả về đối tượng UserDetails (chính là entity Users của bạn).
     */
    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        log.info("[UserDetailsService] Loading user by username: {}", username);

        Users user = userRepository.findByUsername(username)
                .orElseThrow(() -> {
                    log.warn("⚠️ [UserDetailsService] User not found with username: {}", username);
                    return new UsernameNotFoundException("User not found with username: " + username);
                });

        log.info("[UserDetailsService] User loaded successfully: {} (Role: {})",
                user.getUsername(),
                user.getRole() != null ? user.getRole().getRoleName() : "UNKNOWN");

        return user;
    }
}
