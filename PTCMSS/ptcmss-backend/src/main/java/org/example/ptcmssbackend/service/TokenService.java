package org.example.ptcmssbackend.service;

import org.example.ptcmssbackend.entity.Token;
import org.example.ptcmssbackend.exception.ResourceNotFoundException;
import org.example.ptcmssbackend.repository.TokenRepository;
import org.springframework.stereotype.Service;

import java.util.Optional;


@Service
public record TokenService(TokenRepository tokenRepository) {
    /**
     * Get token by username
     *
     * @param username
     * @return token
     */
    public Token getByUsername(String username) {
        return tokenRepository.findByUsername(username).orElseThrow(() -> new ResourceNotFoundException("Not found token"));
    }

    /**
     * Save token to DB
     *
     * @param token
     * @return
     */
    public int save(Token token) {
        Optional<Token> optional = tokenRepository.findByUsername(token.getUsername());
        if (optional.isEmpty()) {
            tokenRepository.save(token);
            return Math.toIntExact(token.getId());
        } else {
            Token t = optional.get();
            t.setAccessToken(token.getAccessToken());
            t.setRefreshToken(token.getRefreshToken());
            tokenRepository.save(t);
            return Math.toIntExact(t.getId());
        }
    }

    /**
     * Delete token by username
     *
     * @param username
     */
    public void delete(String username) {
        Token token = getByUsername(username);
        tokenRepository.delete(token);
    }
}