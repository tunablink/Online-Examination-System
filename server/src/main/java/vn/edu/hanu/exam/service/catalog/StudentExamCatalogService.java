package vn.edu.hanu.exam.service.catalog;

import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;

import vn.edu.hanu.exam.exception.StudentExamCatalogException;
import vn.edu.hanu.exam.repository.StudentExamCatalogRepository;

@Service
public class StudentExamCatalogService {
    public static final String EXAM_NOT_AVAILABLE = "EXAM_NOT_AVAILABLE";
    public static final String DATABASE_ERROR = "DATABASE_ERROR";

    private final StudentExamCatalogRepository catalogRepository;

    public StudentExamCatalogService(StudentExamCatalogRepository catalogRepository) {
        this.catalogRepository = catalogRepository;
    }

    public AvailableExamList findAllAvailable() {
        try {
            return new AvailableExamList(catalogRepository.findAllPublished());
        } catch (DataAccessException | IllegalStateException exception) {
            throw databaseError(exception);
        }
    }

    public AvailableExamDetails findAvailableById(long examId) {
        if (examId <= 0) {
            throw notAvailable();
        }

        try {
            return catalogRepository.findPublishedById(examId)
                    .orElseThrow(StudentExamCatalogService::notAvailable);
        } catch (DataAccessException | IllegalStateException exception) {
            throw databaseError(exception);
        }
    }

    private static StudentExamCatalogException notAvailable() {
        return new StudentExamCatalogException(EXAM_NOT_AVAILABLE, "Exam is not available.");
    }

    private static StudentExamCatalogException databaseError(RuntimeException cause) {
        return new StudentExamCatalogException(
                DATABASE_ERROR,
                "The exam catalog could not be read.",
                cause);
    }
}
