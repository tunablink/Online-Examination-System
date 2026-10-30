package vn.edu.hanu.exam.service.student;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.OffsetDateTime;
import java.util.Base64;

import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import vn.edu.hanu.exam.domain.UserRole;
import vn.edu.hanu.exam.exception.RegistrationException;
import vn.edu.hanu.exam.repository.UserRepository;
import vn.edu.hanu.exam.service.RegisterUserCommand;
import vn.edu.hanu.exam.service.RegisteredUser;
import vn.edu.hanu.exam.service.RegistrationService;

class StudentAccountServiceTests {
    private final RegistrationService registration = mock(RegistrationService.class);
    private final UserRepository users = mock(UserRepository.class);
    private final StudentAccountService accounts = new StudentAccountService(registration, users);

    @Test
    void importReadsRowsAndCreatesStudentsWithDepartments() throws IOException {
        when(registration.registerStudent(any())).thenReturn(new RegisteredUser(1, "student1", "Student One",
                "student@example.com", UserRole.STUDENT, true, OffsetDateTime.now()));
        String file = workbook(new String[][] {
                {"studentId", "fullName", "email", "password", "confirmPassword", "department"},
                {"student1", "Student One", "student1@example.com", "StrongPassword123", "StrongPassword123", "Math"},
                {"student2", "Student Two", "student2@example.com", "StrongPassword456", "StrongPassword456", "Science"}
        });

        assertEquals(2, accounts.importXlsx(file).importedCount());
        ArgumentCaptor<RegisterUserCommand> commands = ArgumentCaptor.forClass(RegisterUserCommand.class);
        verify(registration, times(2)).registerStudent(commands.capture());
        assertEquals("student1", commands.getAllValues().get(0).institutionalId());
        assertEquals("StrongPassword456", commands.getAllValues().get(1).password());
        verify(users).updateDepartment(1, "Math");
        verify(users).updateDepartment(1, "Science");
    }

    @Test
    void importSkipsIncompleteRowAndStillCreatesCompleteStudent() throws IOException {
        when(registration.registerStudent(any())).thenReturn(new RegisteredUser(1, "student2", "Student Two",
                "student2@example.com", UserRole.STUDENT, true, OffsetDateTime.now()));
        String file = workbook(new String[][] {
                {"institutionalId", "fullName", "email", "password", "confirmPassword", "department"},
                {"student1", "Student One", "", "StrongPassword123", "StrongPassword123", "Math"},
                {"student2", "Student Two", "student2@example.com", "StrongPassword123", "StrongPassword123", "Science"}
        });

        StudentAccountService.ImportResult result = accounts.importXlsx(file);
        assertEquals(1, result.importedCount());
        assertEquals(1, result.skippedCount());
        verify(registration, times(1)).registerStudent(any());
    }

    @Test
    void importSkipsDuplicateAccountAndContinuesWithNextRow() throws IOException {
        when(registration.registerStudent(any())).thenAnswer(invocation -> {
            RegisterUserCommand command = invocation.getArgument(0);
            if (command.institutionalId().equals("student1")) {
                throw new RegistrationException("INSTITUTIONAL_ID_ALREADY_EXISTS", "InstitutionalId already exists.");
            }
            return new RegisteredUser(2, command.institutionalId(), command.fullName(), command.email(),
                    UserRole.STUDENT, true, OffsetDateTime.now());
        });
        String file = workbook(new String[][] {
                {"studentId", "fullName", "email", "password", "confirmPassword", "department"},
                {"student1", "Student One", "student1@example.com", "StrongPassword123", "StrongPassword123", "Math"},
                {"student2", "Student Two", "student2@example.com", "StrongPassword456", "StrongPassword456", "Science"}
        });

        StudentAccountService.ImportResult result = accounts.importXlsx(file);
        assertEquals(1, result.importedCount());
        assertEquals(1, result.skippedCount());
        verify(users).updateDepartment(2, "Science");
    }

    private static String workbook(String[][] data) throws IOException {
        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            var sheet = workbook.createSheet();
            for (int rowIndex = 0; rowIndex < data.length; rowIndex++) {
                var row = sheet.createRow(rowIndex);
                for (int column = 0; column < data[rowIndex].length; column++) {
                    row.createCell(column).setCellValue(data[rowIndex][column]);
                }
            }
            workbook.write(output);
            return Base64.getEncoder().encodeToString(output.toByteArray());
        }
    }
}
