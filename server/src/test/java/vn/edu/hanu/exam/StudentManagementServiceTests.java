package vn.edu.hanu.exam;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;

import vn.edu.hanu.exam.exception.StudentManagementException;
import vn.edu.hanu.exam.repository.StudentDirectoryRepository;
import vn.edu.hanu.exam.service.student.StudentDetails;
import vn.edu.hanu.exam.service.student.StudentList;
import vn.edu.hanu.exam.service.student.StudentManagementService;

class StudentManagementServiceTests {
    @Test
    void emptyRepositoryResultIsASuccessfulImmutableList() {
        StudentDirectoryRepository repository = mock(StudentDirectoryRepository.class);
        when(repository.findAllStudents()).thenReturn(List.of());
        StudentManagementService service = new StudentManagementService(repository);

        StudentList result = service.findAllStudents();

        assertEquals(List.of(), result.students());
        assertThrows(UnsupportedOperationException.class, () -> result.students().add(sampleStudent()));
    }

    @Test
    void resultCopiesTheRepositoryList() {
        StudentDirectoryRepository repository = mock(StudentDirectoryRepository.class);
        List<StudentDetails> repositoryResult = new ArrayList<>();
        repositoryResult.add(sampleStudent());
        when(repository.findAllStudents()).thenReturn(repositoryResult);
        StudentManagementService service = new StudentManagementService(repository);

        StudentList result = service.findAllStudents();
        repositoryResult.clear();

        assertEquals(1, result.students().size());
    }

    @Test
    void invalidAndMissingIdsUseTheSameNotFoundError() {
        StudentDirectoryRepository repository = mock(StudentDirectoryRepository.class);
        when(repository.findStudentById(99L)).thenReturn(java.util.Optional.empty());
        StudentManagementService service = new StudentManagementService(repository);

        assertCode("STUDENT_NOT_FOUND", () -> service.findStudentById(0));
        assertCode("STUDENT_NOT_FOUND", () -> service.findStudentById(-1));
        assertCode("STUDENT_NOT_FOUND", () -> service.findStudentById(99));
    }

    @Test
    void databaseFailureIsMappedToSafeError() {
        StudentDirectoryRepository repository = mock(StudentDirectoryRepository.class);
        when(repository.findAllStudents())
                .thenThrow(new DataAccessResourceFailureException("secret database details"));
        StudentManagementService service = new StudentManagementService(repository);

        StudentManagementException exception = assertThrows(
                StudentManagementException.class,
                service::findAllStudents);

        assertEquals("DATABASE_ERROR", exception.code());
        assertEquals("The student directory could not be read.", exception.getMessage());
        assertFalse(exception.getMessage().contains("secret"));
    }

    @Test
    void studentReadModelContainsSafeFieldsOnly() {
        Set<String> componentNames = Arrays.stream(StudentDetails.class.getRecordComponents())
                .map(component -> component.getName())
                .collect(Collectors.toSet());

        assertEquals(Set.of(
                "id",
                "username",
                "fullName",
                "email",
                "active",
                "createdAt"), componentNames);
        assertFalse(componentNames.contains("password"));
        assertFalse(componentNames.contains("passwordHash"));
        assertFalse(componentNames.contains("role"));
        assertFalse(componentNames.contains("sessionId"));
    }

    private static StudentDetails sampleStudent() {
        return new StudentDetails(
                12L,
                "student01",
                "Nguyen Van A",
                "student01@hanu.edu.vn",
                true,
                OffsetDateTime.parse("2026-10-26T10:00:00Z"));
    }

    private static void assertCode(String expectedCode, Runnable operation) {
        StudentManagementException exception = assertThrows(
                StudentManagementException.class,
                operation::run);
        assertEquals(expectedCode, exception.code());
    }
}
