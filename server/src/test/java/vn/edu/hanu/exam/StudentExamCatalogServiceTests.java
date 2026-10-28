package vn.edu.hanu.exam;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;

import vn.edu.hanu.exam.exception.StudentExamCatalogException;
import vn.edu.hanu.exam.repository.StudentExamCatalogRepository;
import vn.edu.hanu.exam.service.catalog.AvailableExamDetails;
import vn.edu.hanu.exam.service.catalog.AvailableExamList;
import vn.edu.hanu.exam.service.catalog.StudentExamCatalogService;

class StudentExamCatalogServiceTests {
    @Test
    void emptyRepositoryResultIsASuccessfulImmutableList() {
        StudentExamCatalogRepository repository = mock(StudentExamCatalogRepository.class);
        when(repository.findAllPublished()).thenReturn(List.of());
        StudentExamCatalogService service = new StudentExamCatalogService(repository);

        AvailableExamList result = service.findAllAvailable();

        assertEquals(List.of(), result.exams());
        assertThrows(UnsupportedOperationException.class, () -> result.exams().add(sampleExam()));
    }

    @Test
    void resultCopiesTheRepositoryList() {
        StudentExamCatalogRepository repository = mock(StudentExamCatalogRepository.class);
        List<AvailableExamDetails> repositoryResult = new ArrayList<>();
        repositoryResult.add(sampleExam());
        when(repository.findAllPublished()).thenReturn(repositoryResult);
        StudentExamCatalogService service = new StudentExamCatalogService(repository);

        AvailableExamList result = service.findAllAvailable();
        repositoryResult.clear();

        assertEquals(1, result.exams().size());
    }

    @Test
    void databaseFailureIsMappedToSafeCatalogError() {
        StudentExamCatalogRepository repository = mock(StudentExamCatalogRepository.class);
        when(repository.findAllPublished())
                .thenThrow(new DataAccessResourceFailureException("secret database details"));
        StudentExamCatalogService service = new StudentExamCatalogService(repository);

        StudentExamCatalogException exception = assertThrows(
                StudentExamCatalogException.class,
                service::findAllAvailable);

        assertEquals("DATABASE_ERROR", exception.code());
        assertEquals("The exam catalog could not be read.", exception.getMessage());
    }

    @Test
    void studentReadModelContainsMetadataOnly() {
        Set<String> componentNames = Arrays.stream(AvailableExamDetails.class.getRecordComponents())
                .map(component -> component.getName())
                .collect(Collectors.toSet());

        assertEquals(Set.of(
                "id",
                "title",
                "description",
                "durationMinutes",
                "questionCount",
                "totalPoints",
                "scheduledAt",
                "courseName",
                "assessmentType"), componentNames);
        assertFalse(componentNames.contains("questions"));
        assertFalse(componentNames.contains("choices"));
        assertFalse(componentNames.contains("correct"));
    }

    private static AvailableExamDetails sampleExam() {
        return new AvailableExamDetails(1, "Published exam", null, 60, 0, 0);
    }
}
