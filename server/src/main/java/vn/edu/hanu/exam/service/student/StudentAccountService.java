package vn.edu.hanu.exam.service.student;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.nio.charset.StandardCharsets;
import java.util.regex.Pattern;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import vn.edu.hanu.exam.exception.RegistrationException;
import vn.edu.hanu.exam.repository.UserRepository;
import vn.edu.hanu.exam.service.RegisterUserCommand;
import vn.edu.hanu.exam.service.RegisteredUser;
import vn.edu.hanu.exam.service.RegistrationService;

@Service
public class StudentAccountService {
    private static final int MAX_FILE_BYTES = 1024 * 1024;
    private static final int MAX_STUDENTS = 500;
    private static final Pattern INSTITUTIONAL_ID_PATTERN = Pattern.compile("^[a-zA-Z0-9._-]{3,50}$");
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

    private final RegistrationService registrationService;
    private final UserRepository userRepository;
    private final TransactionTemplate importTransaction;

    @Autowired
    public StudentAccountService(RegistrationService registrationService, UserRepository userRepository,
            PlatformTransactionManager transactionManager) {
        this.registrationService = registrationService;
        this.userRepository = userRepository;
        this.importTransaction = new TransactionTemplate(transactionManager);
        this.importTransaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    public StudentAccountService(RegistrationService registrationService, UserRepository userRepository) {
        this.registrationService = registrationService;
        this.userRepository = userRepository;
        this.importTransaction = null;
    }

    @Transactional
    public RegisteredUser create(RegisterUserCommand command, String department) {
        String normalizedDepartment = normalizeDepartment(department);
        RegisteredUser user = registrationService.registerStudent(command);
        if (normalizedDepartment != null) {
            userRepository.updateDepartment(user.id(), normalizedDepartment);
        }
        return user;
    }

    public ImportResult importXlsx(String contentBase64) {
        ParsedRows parsed = readRows(decodeFile(contentBase64), true);
        int imported = 0;
        int skipped = parsed.skippedCount();
        for (NewStudentRow row : parsed.rows()) {
            try {
                if (importTransaction == null) {
                    create(row.command(), row.department());
                } else {
                    importTransaction.executeWithoutResult(status -> create(row.command(), row.department()));
                }
                imported++;
            } catch (RegistrationException exception) {
                skipped++;
            }
        }
        return new ImportResult(imported, skipped);
    }

    public List<NewStudentRow> parseXlsx(String contentBase64) {
        return readRows(decodeFile(contentBase64), false).rows();
    }

    public AccountRows parseCompleteAccountRows(String contentBase64) {
        ParsedRows parsed = readRows(decodeFile(contentBase64), true);
        return new AccountRows(parsed.rows(), parsed.skippedCount());
    }

    private static byte[] decodeFile(String contentBase64) {
        if (contentBase64 == null || contentBase64.isBlank() || contentBase64.length() > MAX_FILE_BYTES * 4 / 3 + 8) {
            throw invalidFile("Excel file is required and must be at most 1 MB.");
        }
        try {
            byte[] bytes = Base64.getDecoder().decode(contentBase64);
            if (bytes.length > MAX_FILE_BYTES) throw invalidFile("Excel file must be at most 1 MB.");
            return bytes;
        } catch (IllegalArgumentException exception) {
            throw invalidFile("Excel file encoding is invalid.");
        }
    }

    private static ParsedRows readRows(byte[] bytes, boolean requireCompleteAccount) {
        try (XSSFWorkbook workbook = new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
            if (workbook.getNumberOfSheets() == 0) {
                throw invalidFile("Excel file has no worksheet.");
            }
            Sheet sheet = workbook.getSheetAt(0);
            if (sheet.getLastRowNum() - sheet.getFirstRowNum() > 5000) {
                throw invalidFile("Excel worksheet has too many rows.");
            }
            Row header = sheet.getRow(sheet.getFirstRowNum());
            Map<String, Integer> columns = readHeaders(header, requireCompleteAccount);
            List<NewStudentRow> rows = new ArrayList<>();
            int skipped = 0;
            int processed = 0;
            for (int index = sheet.getFirstRowNum() + 1; index <= sheet.getLastRowNum(); index++) {
                Row row = sheet.getRow(index);
                if (row == null || rowIsEmpty(row)) continue;
                if (++processed > MAX_STUDENTS) throw invalidFile("Excel file may contain at most 500 students.");
                try {
                    String institutionalId = value(row, columns, "institutionalId");
                    String password = value(row, columns, "password");
                    String fullName = value(row, columns, "fullName");
                    String email = value(row, columns, "email");
                    String department = columns.containsKey("department") ? value(row, columns, "department") : null;
                    if (requireCompleteAccount && !validAccountRow(institutionalId, fullName, email, password,
                            value(row, columns, "confirmPassword"), department)) {
                        skipped++;
                        continue;
                    }
                    rows.add(new NewStudentRow(index + 1,
                            new RegisterUserCommand(institutionalId, password, fullName, email), department));
                } catch (RegistrationException exception) {
                    if (!requireCompleteAccount) throw exception;
                    skipped++;
                }
            }
            if (processed == 0) throw invalidFile("Excel file contains no students.");
            return new ParsedRows(rows, skipped);
        } catch (RegistrationException exception) {
            throw exception;
        } catch (IOException | RuntimeException exception) {
            throw new RegistrationException("INVALID_EXCEL_FILE", "Excel file could not be read.", exception);
        }
    }

    private static Map<String, Integer> readHeaders(Row header, boolean requireCompleteAccount) {
        if (header == null) throw invalidFile("Excel header row is missing.");
        Map<String, Integer> columns = new HashMap<>();
        for (Cell cell : header) {
            String name = cell.toString().trim().replace(" ", "").toLowerCase(Locale.ROOT);
            if (name.equals("fullname")) name = "fullName";
            if (name.equals("confirmpassword")) name = "confirmPassword";
            if (name.equals("studentid") || name.equals("institutionalid")) name = "institutionalId";
            if (columns.putIfAbsent(name, cell.getColumnIndex()) != null) throw invalidFile("Excel headers must be unique.");
        }
        List<String> requiredFields = requireCompleteAccount
                ? List.of("institutionalId", "fullName", "email", "password", "confirmPassword", "department")
                : List.of("institutionalId", "fullName", "email", "password");
        for (String required : requiredFields) {
            if (!columns.containsKey(required)) throw invalidFile(requireCompleteAccount
                    ? "Excel requires studentId (or institutionalId), fullName, email, password, confirmPassword, department headers."
                    : "Excel requires institutionalId, fullName, email, password headers.");
        }
        return columns;
    }

    private static boolean validAccountRow(String institutionalId, String fullName, String email, String password,
            String confirmPassword, String department) {
        return INSTITUTIONAL_ID_PATTERN.matcher(institutionalId).matches()
                && fullName.length() >= 2 && fullName.length() <= 100
                && email.length() <= 255 && EMAIL_PATTERN.matcher(email).matches()
                && password.length() >= 8 && password.getBytes(StandardCharsets.UTF_8).length <= 72
                && password.equals(confirmPassword)
                && department != null && !department.isBlank() && department.length() <= 120;
    }

    private static boolean rowIsEmpty(Row row) {
        for (Cell cell : row) if (cell.getCellType() != CellType.BLANK && !cell.toString().isBlank()) return false;
        return true;
    }

    private static String value(Row row, Map<String, Integer> columns, String name) {
        Cell cell = row.getCell(columns.get(name));
        if (cell == null || cell.getCellType() == CellType.BLANK) return "";
        if (cell.getCellType() != CellType.STRING) {
            throw invalidFile("Row " + (row.getRowNum() + 1) + ": " + name + " must be formatted as text.");
        }
        return cell.getStringCellValue().trim();
    }

    private static String normalizeDepartment(String value) {
        if (value == null || value.isBlank()) return null;
        String department = value.trim();
        if (department.length() > 120) throw new RegistrationException("INVALID_DEPARTMENT", "Department must be at most 120 characters.");
        return department;
    }

    private static RegistrationException invalidFile(String message) {
        return new RegistrationException("INVALID_EXCEL_FILE", message);
    }

    public record NewStudentRow(int rowNumber, RegisterUserCommand command, String department) {}
    public record AccountRows(List<NewStudentRow> rows, int skippedCount) {}

    private record ParsedRows(List<NewStudentRow> rows, int skippedCount) {}
    public record ImportResult(int importedCount, int skippedCount) {
        public ImportResult(int importedCount) {
            this(importedCount, 0);
        }
    }
}
