package com.deepakrajs.user.component;


import com.deepakrajs.user.model.User;
import com.deepakrajs.user.repo.UserRepo;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
@RequiredArgsConstructor
public class JwtFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final UserRepo userRepository; // ✅ FIXED

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");

        if (authHeader != null && authHeader.startsWith("Bearer ")) {

            String token = authHeader.substring(7);

            try {
                if (jwtUtil.validateToken(token)) {

                    String email = jwtUtil.extractEmail(token);

                    User user = userRepository.findByEmail(email)
                            .orElseThrow(() -> new RuntimeException("User not found"));

                    String role = user.getRole().name();

                    var authorities = List.of(
                            new SimpleGrantedAuthority("ROLE_" + role)
                    );

                    var auth = new UsernamePasswordAuthenticationToken(
                            email,
                            null,
                            authorities
                    );

                    SecurityContextHolder.getContext().setAuthentication(auth);
                } else {
                    SecurityContextHolder.clearContext();
                }

            } catch (Exception e) {
                SecurityContextHolder.clearContext();
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                return;
            }
        }

        filterChain.doFilter(request, response);
    }
}
