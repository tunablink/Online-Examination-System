package vn.edu.hanu.exam.service;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import vn.edu.hanu.exam.domain.User;
import vn.edu.hanu.exam.exception.AuthenticationException;
import vn.edu.hanu.exam.repository.UserRepository;

@Service
public class LoginService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public LoginService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public LoggedInUser login(LoginCommand command) {
        if (command == null) {
            throw new AuthenticationException("INVALID_CREDENTIALS", "Invalid Student ID / Teacher ID or password.");
        }

        User user = userRepository.findByInstitutionalId(command.institutionalId())
                .orElseThrow(() -> new AuthenticationException(
                        "INVALID_CREDENTIALS", "Invalid Student ID / Teacher ID or password."));

        if (!passwordEncoder.matches(command.password(), user.passwordHash())) {
            throw new AuthenticationException("INVALID_CREDENTIALS", "Invalid Student ID / Teacher ID or password.");
        }

        if (!user.active()) {
            throw new AuthenticationException("ACCOUNT_DISABLED", "This account has been disabled.");
        }

        return LoggedInUser.from(user);
    }
}
