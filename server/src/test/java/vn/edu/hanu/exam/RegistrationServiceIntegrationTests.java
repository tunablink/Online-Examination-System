package vn.edu.hanu.exam;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import vn.edu.hanu.exam.domain.User;
import vn.edu.hanu.exam.domain.UserRole;
import vn.edu.hanu.exam.repository.UserRepository;
import vn.edu.hanu.exam.service.RegisterUserCommand;
import vn.edu.hanu.exam.service.RegisteredUser;
import vn.edu.hanu.exam.service.RegistrationService;

@SpringBootTest 
@Transactional 
public class RegistrationServiceIntegrationTests {
    @Autowired 
    private RegistrationService registrationService;

    @Autowired 
    private UserRepository userRepository;

    @Autowired 
    private PasswordEncoder passwordEncoder;

    @Test 
    void registerStudentHashesPasswordAndPersistsUser(){
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 10);

        String institutionalId = "student_" + suffix;
        String email = institutionalId + "@example.com";
        String rawPassword = "StrongPassword_123!";

        RegisterUserCommand command = new RegisterUserCommand(institutionalId, rawPassword, "Integration Test Student", email);

        RegisteredUser registeredUser = registrationService.registerStudent(command);

        assertEquals(institutionalId, registeredUser.institutionalId());
        assertEquals(email, registeredUser.email());
        assertEquals(UserRole.STUDENT,registeredUser.role());
        assertTrue(registeredUser.active());

        User storedUser = userRepository.findByInstitutionalId(institutionalId).orElseThrow();

        assertNotEquals(rawPassword, storedUser.passwordHash());
        assertTrue(passwordEncoder.matches(rawPassword, storedUser.passwordHash()));
        assertFalse(storedUser.passwordHash().isBlank());
    }
}
