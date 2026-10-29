package vn.edu.hanu.exam.repository;

import java.util.Map;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class JdbcExamEnrollmentKeyRepository implements ExamEnrollmentKeyRepository {
    private final NamedParameterJdbcTemplate jdbc;

    public JdbcExamEnrollmentKeyRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public String findHash(long examId) {
        var hashes = jdbc.query("SELECT enrollment_key_hash FROM exams WHERE id=:id",
                Map.of("id", examId), (rs, row) -> rs.getString("enrollment_key_hash"));
        return hashes.isEmpty() ? null : hashes.getFirst();
    }

    @Override
    public boolean updateDraftHash(long examId, long teacherId, String hash) {
        return jdbc.update("""
                UPDATE exams SET enrollment_key_hash=:hash, updated_at=CURRENT_TIMESTAMP
                WHERE id=:id AND created_by=:teacher AND status='DRAFT'
                """, Map.of("id", examId, "teacher", teacherId, "hash", hash)) == 1;
    }
}
