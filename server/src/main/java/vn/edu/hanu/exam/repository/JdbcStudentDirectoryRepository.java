package vn.edu.hanu.exam.repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import vn.edu.hanu.exam.domain.UserRole;
import vn.edu.hanu.exam.service.student.StudentDetails;

@Repository
public class JdbcStudentDirectoryRepository implements StudentDirectoryRepository {
    private static final String STUDENT_ROLE = UserRole.STUDENT.name();
    private static final String SELECT_STUDENT_COLUMNS = """
            SELECT id,
                   institutional_id,
                   full_name,
                   email,
                   department,
                   active,
                   created_at
            FROM users
            """;
    private static final RowMapper<StudentDetails> STUDENT_ROW_MAPPER =
            JdbcStudentDirectoryRepository::mapStudent;

    private final NamedParameterJdbcTemplate jdbcTemplate;

    public JdbcStudentDirectoryRepository(NamedParameterJdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public List<StudentDetails> findAllStudents() {
        String sql = SELECT_STUDENT_COLUMNS + """
                WHERE role = :studentRole AND active = TRUE
                ORDER BY created_at DESC, id DESC
                """;

        return jdbcTemplate.query(
                sql,
                Map.of("studentRole", STUDENT_ROLE),
                STUDENT_ROW_MAPPER);
    }

    @Override
    public Optional<StudentDetails> findStudentById(long studentId) {
        String sql = SELECT_STUDENT_COLUMNS + """
                WHERE id = :studentId
                  AND role = :studentRole
                """;

        List<StudentDetails> students = jdbcTemplate.query(
                sql,
                Map.of("studentId", studentId, "studentRole", STUDENT_ROLE),
                STUDENT_ROW_MAPPER);
        return students.stream().findFirst();
    }

    @Override
    public Optional<StudentDetails> updateStudent(long studentId, String institutionalId, String fullName, String email,
            String department, String passwordHash) {
        int changed = jdbcTemplate.update("""
                UPDATE users SET institutional_id = :institutionalId, full_name = :fullName, email = :email,
                    department = :department, password_hash = COALESCE(:passwordHash, password_hash),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :studentId AND role = :studentRole AND active = TRUE
                """, new MapSqlParameterSource()
                .addValue("studentId", studentId).addValue("studentRole", STUDENT_ROLE)
                .addValue("institutionalId", institutionalId).addValue("fullName", fullName)
                .addValue("email", email).addValue("department", department)
                .addValue("passwordHash", passwordHash));
        return changed == 1 ? findStudentById(studentId) : Optional.empty();
    }

    @Override
    public boolean deactivateStudent(long studentId) {
        return jdbcTemplate.update("""
                UPDATE users SET active = FALSE, updated_at = CURRENT_TIMESTAMP
                WHERE id = :studentId AND role = :studentRole AND active = TRUE
                """, Map.of("studentId", studentId, "studentRole", STUDENT_ROLE)) == 1;
    }

    private static StudentDetails mapStudent(ResultSet resultSet, int rowNumber) throws SQLException {
        return new StudentDetails(
                resultSet.getLong("id"),
                resultSet.getString("institutional_id"),
                resultSet.getString("full_name"),
                resultSet.getString("email"),
                resultSet.getString("department"),
                resultSet.getBoolean("active"),
                resultSet.getObject("created_at", OffsetDateTime.class));
    }
}
