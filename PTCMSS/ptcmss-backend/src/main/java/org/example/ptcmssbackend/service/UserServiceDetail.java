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
     * Hỗ trợ tìm bằng username hoặc email.
     */
    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        log.info("[UserDetailsService] Loading user by username/email: {}", username);

        // Thử tìm bằng username trước
        Users user = userRepository.findByUsername(username)
                .orElse(null);
        
        // Nếu không tìm thấy, thử tìm bằng email
        if (user == null) {
            log.info("[UserDetailsService] User not found by username, trying email: {}", username);
            user = userRepository.findByEmail(username)
                    .orElse(null);
        }
        
        // Nếu vẫn không tìm thấy, throw exception
        if (user == null) {
            log.warn("⚠️ [UserDetailsService] User not found with username or email: {}", username);
            throw new UsernameNotFoundException("User not found with username or email: " + username);
        }

        log.info("[UserDetailsService] User loaded successfully: {} (Role: {})",
                user.getUsername(),
                user.getRole() != null ? user.getRole().getRoleName() : "UNKNOWN");

        return user;
    }
}
