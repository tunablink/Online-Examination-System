package vn.edu.hanu.exam.repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import vn.edu.hanu.exam.domain.UserRole;
import vn.edu.hanu.exam.service.student.StudentDetails;

@Repository
public class JdbcStudentDirectoryRepository implements StudentDirectoryRepository {
    private static final String STUDENT_ROLE = UserRole.STUDENT.name();
    private static final String SELECT_STUDENT_COLUMNS = """
            SELECT id,
                   username,
                   full_name,
                   email,
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
                WHERE role = :studentRole
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

    private static StudentDetails mapStudent(ResultSet resultSet, int rowNumber) throws SQLException {
        return new StudentDetails(
                resultSet.getLong("id"),
                resultSet.getString("username"),
                resultSet.getString("full_name"),
                resultSet.getString("email"),
                resultSet.getBoolean("active"),
                resultSet.getObject("created_at", OffsetDateTime.class));
    }
}
