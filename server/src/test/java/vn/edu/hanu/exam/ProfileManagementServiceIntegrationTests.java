package vn.edu.hanu.exam;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.boot.test.context.SpringBootTest;

import vn.edu.hanu.exam.domain.UserRole;
import vn.edu.hanu.exam.service.profile.ProfileDetails;
import vn.edu.hanu.exam.service.profile.ProfileManagementService;

@SpringBootTest
@Transactional
@Sql(scripts = "classpath:schema.sql")
class ProfileManagementServiceIntegrationTests {
    @Autowired
    private JdbcClient jdbcClient;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ProfileManagementService profileService;

    @Test
    void readsStudentProfileWithoutExposingPassword() {
        long userId = insertUser(UserRole.STUDENT, null, "student-password");

        ProfileDetails profile = profileService.getProfile(userId);

        assertEquals(userId, profile.id());
        assertEquals(UserRole.STUDENT, profile.role());
        assertNull(profile.department());
        assertNotNull(profile.createdAt());
    }

    @Test
    void teacherDepartmentUpdateIsPersisted() {
        long userId = insertUser(UserRole.TEACHER, null, "teacher-password");

        ProfileDetails updated = profileService.updateDepartment(
                userId,
                UserRole.TEACHER,
                "  Department   of Computer Science  ");

        assertEquals("Department of Computer Science", updated.department());
        assertEquals(
                "Department of Computer Science",
                jdbcClient.sql("SELECT department FROM users WHERE id = :id")
                        .param("id", userId)
                        .query(String.class)
                        .single());
    }

    @Test
    void passwordChangeVerifiesCurrentPasswordAndPersistsOnlyTheNewHash() {
        long userId = insertUser(UserRole.STUDENT, null, "current-password");

        profileService.changePassword(userId, "current-password", "new-secure-password");

        String storedHash = jdbcClient.sql("SELECT password_hash FROM users WHERE id = :id")
                .param("id", userId)
                .query(String.class)
                .single();

        assertTrue(passwordEncoder.matches("new-secure-password", storedHash));
    }

    private long insertUser(UserRole role, String department, String rawPassword) {
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        String username = role.name().toLowerCase() + "_profile_" + suffix;

        return jdbcClient.sql("""
                INSERT INTO users (username, password_hash, full_name, email, department, role)
                VALUES (:username, :passwordHash, :fullName, :email, :department, :role)
                RETURNING id
                """)
                .param("username", username)
                .param("passwordHash", passwordEncoder.encode(rawPassword))
                .param("fullName", role == UserRole.TEACHER ? "Integration Teacher" : "Integration Student")
                .param("email", username + "@university.edu")
                .param("department", department)
                .param("role", role.name())
                .query(Long.class)
                .single();
    }
}
