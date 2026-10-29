package vn.edu.hanu.exam.repository;

public interface ExamEnrollmentKeyRepository {
    String findHash(long examId);
    boolean updateDraftHash(long examId, long teacherId, String hash);
}
