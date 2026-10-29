package vn.edu.hanu.exam.service.exam;

import java.nio.charset.StandardCharsets;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import vn.edu.hanu.exam.exception.AttemptException;
import vn.edu.hanu.exam.exception.ExamManagementException;
import vn.edu.hanu.exam.repository.ExamEnrollmentKeyRepository;

@Service
public class ExamEnrollmentKeyService {
    private final ExamEnrollmentKeyRepository keys;
    private final PasswordEncoder passwords;

    public ExamEnrollmentKeyService(ExamEnrollmentKeyRepository keys, PasswordEncoder passwords) {
        this.keys = keys;
        this.passwords = passwords;
    }

    public void configureDraft(long examId, long teacherId, String key) {
        validateConfiguration(key);
        if (!keys.updateDraftHash(examId, teacherId, passwords.encode(key))) {
            throw new ExamManagementException("EXAM_NOT_EDITABLE",
                    "Only the owning teacher can change a draft exam's enrollment key.");
        }
    }

    public static void validateConfiguration(String key) {
        if (!validLength(key)) {
            throw new ExamManagementException("INVALID_ENROLLMENT_KEY",
                    "Enrollment key must contain at least 8 characters and at most 72 UTF-8 bytes.");
        }
    }

    public void requireValid(long examId, String key) {
        String hash = keys.findHash(examId);
        if (hash == null || hash.isBlank()) {
            throw new AttemptException("ENROLLMENT_KEY_NOT_CONFIGURED",
                    "This exam has no enrollment key. Please contact your teacher.");
        }
        if (key == null || key.isBlank()) {
            throw new AttemptException("ENROLLMENT_KEY_REQUIRED", "Enter the enrollment key provided by your teacher.");
        }
        if (!validLength(key) || !passwords.matches(key, hash)) {
            throw new AttemptException("INVALID_ENROLLMENT_KEY", "The enrollment key is incorrect.");
        }
    }

    private static boolean validLength(String key) {
        return key != null && !key.isBlank() && key.length() >= 8
                && key.length() <= 72 && key.getBytes(StandardCharsets.UTF_8).length <= 72;
    }
}
