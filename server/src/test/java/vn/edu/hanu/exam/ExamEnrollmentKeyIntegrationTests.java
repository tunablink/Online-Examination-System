package vn.edu.hanu.exam;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import tools.jackson.databind.json.JsonMapper;
import vn.edu.hanu.exam.domain.UserRole;
import vn.edu.hanu.exam.exception.AttemptException;
import vn.edu.hanu.exam.exception.ExamManagementException;
import vn.edu.hanu.exam.protocol.ClientMessage;
import vn.edu.hanu.exam.protocol.ServerMessage;
import vn.edu.hanu.exam.service.LoggedInUser;
import vn.edu.hanu.exam.service.attempt.ExamAttemptService;
import vn.edu.hanu.exam.service.catalog.StudentExamCatalogService;
import vn.edu.hanu.exam.service.course.CourseService;
import vn.edu.hanu.exam.service.exam.*;
import vn.edu.hanu.exam.service.question.CreateQuestionCommand;
import vn.edu.hanu.exam.session.AuthenticatedSessionRegistry;
import vn.edu.hanu.exam.session.SessionResumeService;
import vn.edu.hanu.exam.websocket.ExamWebSocketHandler;

@SpringBootTest(properties = "exam.deadline.enabled=false")
@Transactional
class ExamEnrollmentKeyIntegrationTests {
    private static final String KEY = "ExamEntryKey123!";
    @Autowired private NamedParameterJdbcTemplate jdbc;
    @Autowired private PasswordEncoder passwords;
    @Autowired private ExamManagementService exams;
    @Autowired private CourseService courses;
    @Autowired private ExamAttemptService attempts;
    @Autowired private ExamEnrollmentKeyService keys;
    @Autowired private StudentExamCatalogService catalog;
    @Autowired private JsonMapper mapper;
    @Autowired private ExamWebSocketHandler router;
    @Autowired private AuthenticatedSessionRegistry sessions;
    @Autowired private SessionResumeService credentials;

    @Test
    void missingWrongAndCaseChangedKeysDoNotCreateAttempts() {
        Fixture f = fixture();
        exams.publishExam(f.exam(), f.teacher());
        assertEquals("ENROLLMENT_KEY_REQUIRED", assertThrows(AttemptException.class,
                () -> attempts.startExam(f.exam(), f.student())).code());
        assertEquals("INVALID_ENROLLMENT_KEY", assertThrows(AttemptException.class,
                () -> attempts.startExam(f.exam(), f.student(), "WrongExamKey123!")).code());
        assertEquals("INVALID_ENROLLMENT_KEY", assertThrows(AttemptException.class,
                () -> attempts.startExam(f.exam(), f.student(), KEY.toLowerCase())).code());
        assertEquals(0, attemptCount(f.exam()));
    }

    @Test
    void correctKeyStartsAndExistingAttemptResumesWithoutKeyOrDeadlineReset() {
        Fixture f = fixture();
        exams.publishExam(f.exam(), f.teacher());
        var first = attempts.startExam(f.exam(), f.student(), KEY);
        var resumed = attempts.startExam(f.exam(), f.student());
        assertEquals(first.attemptId(), resumed.attemptId());
        assertEquals(first.deadline(), resumed.deadline());
        assertEquals(first.questions(), resumed.questions());
        assertEquals(1, attemptCount(f.exam()));
        assertEquals(first.attemptId(), attempts.getAttempt(first.attemptId(), f.student()).attemptId());
    }

    @Test
    void suppliedWrongKeyIsRejectedEvenWhenAnAttemptWasPreviouslyVerified() {
        Fixture f = fixture();
        exams.publishExam(f.exam(), f.teacher());
        var first = attempts.startExam(f.exam(), f.student(), KEY);
        assertEquals("INVALID_ENROLLMENT_KEY", assertThrows(AttemptException.class,
                () -> attempts.startExam(f.exam(), f.student(), "IncorrectKey123!")).code());
        assertEquals("INVALID_ENROLLMENT_KEY", assertThrows(AttemptException.class,
                () -> attempts.startExam(f.exam(), f.student(), KEY.toLowerCase())).code());
        assertEquals("ENROLLMENT_KEY_REQUIRED", assertThrows(AttemptException.class,
                () -> attempts.startExam(f.exam(), f.student(), "   ")).code());
        var withCorrectKey = attempts.startExam(f.exam(), f.student(), KEY);
        var keylessResume = attempts.startExam(f.exam(), f.student(), "");
        assertEquals(first.attemptId(), withCorrectKey.attemptId());
        assertEquals(first.deadline(), withCorrectKey.deadline());
        assertEquals(first.attemptId(), keylessResume.attemptId());
        assertEquals(first.deadline(), keylessResume.deadline());
        assertEquals(1, attemptCount(f.exam()));
    }

    @Test
    void knowingTheKeyDoesNotBypassCourseMembership() {
        Fixture f = fixture();
        exams.publishExam(f.exam(), f.teacher());
        long outsider = user("STUDENT");
        assertEquals("EXAM_NOT_AVAILABLE", assertThrows(AttemptException.class,
                () -> attempts.startExam(f.exam(), outsider, KEY)).code());
        assertEquals(0, attemptCount(f.exam()));
    }

    @Test
    void hashIsStoredButNeverExposedByExamCatalogOrAttemptResponses() throws Exception {
        Fixture f = fixture();
        String hash = hash(f.exam());
        assertNotEquals(KEY, hash);
        assertTrue(passwords.matches(KEY, hash));
        exams.publishExam(f.exam(), f.teacher());
        var attempt = attempts.startExam(f.exam(), f.student(), KEY);
        for (Object response : List.of(exams.findByIdAndCreatedBy(f.exam(), f.teacher()),
                exams.findAllByCreatedBy(f.teacher()), catalog.findAvailableById(f.exam(), f.student()),
                catalog.findAllAvailable(f.student()), attempt)) {
            String json = mapper.writeValueAsString(response);
            assertFalse(json.contains(KEY));
            assertFalse(json.contains(hash));
            assertFalse(json.contains("enrollmentKey"));
            assertFalse(json.contains("enrollment_key"));
        }
        assertFalse(new CreateExamCommand("Exam", null, 60, OffsetDateTime.now().plusDays(1), KEY).toString().contains(KEY));
    }

    @Test
    void ownerCanReplaceDraftKeyAndOmittingKeyPreservesHash() {
        Fixture f = fixture();
        String original = hash(f.exam());
        exams.updateDraftExam(f.exam(), f.teacher(), new UpdateExamCommand("Updated", null, 60));
        assertEquals(original, hash(f.exam()));
        exams.updateDraftExam(f.exam(), f.teacher(), new UpdateExamCommand("Updated", null, 60,
                null, null, "ReplacementKey123!"));
        assertTrue(passwords.matches("ReplacementKey123!", hash(f.exam())));
        assertFalse(passwords.matches(KEY, hash(f.exam())));
    }

    @Test
    void wrongTeacherPublishedExamAndInvalidKeysCannotChangeHash() {
        Fixture f = fixture();
        String original = hash(f.exam());
        assertEquals("EXAM_NOT_EDITABLE", assertThrows(ExamManagementException.class,
                () -> keys.configureDraft(f.exam(), user("TEACHER"), "ReplacementKey123!")).code());
        for (String invalid : List.of("short", "        ", "界".repeat(25))) {
            assertEquals("INVALID_ENROLLMENT_KEY", assertThrows(ExamManagementException.class,
                    () -> keys.configureDraft(f.exam(), f.teacher(), invalid)).code());
        }
        exams.publishExam(f.exam(), f.teacher());
        assertEquals("EXAM_NOT_EDITABLE", assertThrows(ExamManagementException.class,
                () -> keys.configureDraft(f.exam(), f.teacher(), "ReplacementKey123!")).code());
        assertEquals(original, hash(f.exam()));
    }

    @Test
    void legacyPublishedExamWithoutHashFailsClosed() {
        Fixture f = fixture();
        exams.publishExam(f.exam(), f.teacher());
        jdbc.update("UPDATE exams SET enrollment_key_hash=NULL WHERE id=:id", Map.of("id", f.exam()));
        assertEquals("ENROLLMENT_KEY_NOT_CONFIGURED", assertThrows(AttemptException.class,
                () -> attempts.startExam(f.exam(), f.student(), KEY)).code());
        assertEquals(0, attemptCount(f.exam()));
    }

    @Test
    void websocketStartRequiresTheKeyAndThenAllowsKeylessResume() throws Exception {
        Fixture f = fixture();
        exams.publishExam(f.exam(), f.teacher());
        var socket = mock(WebSocketSession.class);
        String id = UUID.randomUUID().toString();
        when(socket.getId()).thenReturn(id);
        when(socket.isOpen()).thenReturn(true);
        var student = new LoggedInUser(f.student(), "student", "Student", "s@example.com", UserRole.STUDENT);
        try {
            credentials.issue(id, student);
            sessions.authenticate(id, student);
            assertEquals("ENROLLMENT_KEY_REQUIRED", command(socket, Map.of("examId", f.exam())).error().code());
            assertEquals("INVALID_ENROLLMENT_KEY", command(socket,
                    Map.of("examId", f.exam(), "enrollmentKey", "IncorrectKey123!")).error().code());
            assertEquals("EXAM_STARTED", command(socket, Map.of("examId", f.exam(), "enrollmentKey", KEY)).type());
            assertEquals("INVALID_ENROLLMENT_KEY", command(socket,
                    Map.of("examId", f.exam(), "enrollmentKey", "IncorrectKey123!")).error().code());
            assertEquals("EXAM_STARTED", command(socket, Map.of("examId", f.exam())).type());
            assertEquals(1, attemptCount(f.exam()));
        } finally {
            sessions.remove(id);
            credentials.revoke(id);
        }
    }

    @Test
    void futureOpeningBlocksStartEvenWithCorrectKey() {
        Fixture f = fixture();
        exams.publishExam(f.exam(), f.teacher());
        jdbc.update("UPDATE exams SET scheduled_at=:future WHERE id=:id",
                Map.of("id", f.exam(), "future", OffsetDateTime.now().plusHours(1)));
        assertEquals("EXAM_NOT_OPEN", assertThrows(AttemptException.class,
                () -> attempts.startExam(f.exam(), f.student(), KEY)).code());
        assertEquals("EXAM_NOT_OPEN", assertThrows(AttemptException.class,
                () -> attempts.startExam(f.exam(), f.student())).code());
        assertEquals(0, attemptCount(f.exam()));
    }

    @Test
    void legacyUnverifiedAttemptCannotBypassKeyThroughStartGetSaveOrSubmit() {
        Fixture f = fixture();
        exams.publishExam(f.exam(), f.teacher());
        var first = attempts.startExam(f.exam(), f.student(), KEY);
        jdbc.update("UPDATE exam_attempts SET enrollment_verified_at=NULL WHERE id=:id", Map.of("id", first.attemptId()));
        var question = first.questions().getFirst();
        long choice = question.choices().getFirst().id();
        assertEquals("ENROLLMENT_KEY_REQUIRED", assertThrows(AttemptException.class,
                () -> attempts.startExam(f.exam(), f.student())).code());
        assertEquals("ENROLLMENT_KEY_REQUIRED", assertThrows(AttemptException.class,
                () -> attempts.getAttempt(first.attemptId(), f.student())).code());
        assertEquals("ENROLLMENT_KEY_REQUIRED", assertThrows(AttemptException.class,
                () -> attempts.saveAnswer(first.attemptId(), question.id(), choice, f.student())).code());
        assertEquals("ENROLLMENT_KEY_REQUIRED", assertThrows(AttemptException.class,
                () -> attempts.submitExam(first.attemptId(), f.student())).code());
        var resumed = attempts.startExam(f.exam(), f.student(), KEY);
        assertEquals(first.attemptId(), resumed.attemptId());
        assertEquals(first.deadline(), resumed.deadline());
        assertEquals(first.attemptId(), attempts.getAttempt(first.attemptId(), f.student()).attemptId());
        assertEquals(1, attemptCount(f.exam()));
    }

    @Test
    void directRoomSaveAndSubmitCannotBypassOpeningTime() {
        Fixture f = fixture();
        exams.publishExam(f.exam(), f.teacher());
        var first = attempts.startExam(f.exam(), f.student(), KEY);
        jdbc.update("UPDATE exams SET scheduled_at=:future WHERE id=:id",
                Map.of("id", f.exam(), "future", OffsetDateTime.now().plusHours(1)));
        var question = first.questions().getFirst();
        long choice = question.choices().getFirst().id();
        assertEquals("EXAM_NOT_OPEN", assertThrows(AttemptException.class,
                () -> attempts.startExam(f.exam(), f.student(), KEY)).code());
        assertEquals("EXAM_NOT_OPEN", assertThrows(AttemptException.class,
                () -> attempts.getAttempt(first.attemptId(), f.student())).code());
        assertEquals("EXAM_NOT_OPEN", assertThrows(AttemptException.class,
                () -> attempts.saveAnswer(first.attemptId(), question.id(), choice, f.student())).code());
        assertEquals("EXAM_NOT_OPEN", assertThrows(AttemptException.class,
                () -> attempts.submitExam(first.attemptId(), f.student())).code());
        // A terminal legacy attempt must not reveal room questions before opening either.
        jdbc.update("UPDATE exam_attempts SET status='EXPIRED' WHERE id=:id", Map.of("id", first.attemptId()));
        assertEquals("EXAM_NOT_OPEN", assertThrows(AttemptException.class,
                () -> attempts.getAttempt(first.attemptId(), f.student())).code());
    }

    @Test
    void deadlineWorkerStillFinalizesLegacyUnverifiedAttemptsWithoutGrantingAccess() {
        Fixture f = fixture();
        exams.publishExam(f.exam(), f.teacher());
        var first = attempts.startExam(f.exam(), f.student(), KEY);
        jdbc.update("""
                UPDATE exam_attempts SET enrollment_verified_at=NULL,
                    started_at=:started, deadline_at=:deadline WHERE id=:id
                """, Map.of("id", first.attemptId(), "started", OffsetDateTime.now().minusHours(2),
                "deadline", OffsetDateTime.now().minusHours(1)));
        assertTrue(attempts.expireAttempt(first.attemptId(), f.student()));
        assertEquals("EXPIRED", attempts.getAttemptResult(first.attemptId(), f.student()).status().name());
    }

    @Test
    void lateEntryReceivesFullDurationBeyondEntryClosingTime() {
        Fixture f = fixture();
        var closes = OffsetDateTime.now().plusMinutes(5).withNano(0);
        setClosing(f.exam(), closes);
        exams.publishExam(f.exam(), f.teacher());
        var attempt = attempts.startExam(f.exam(), f.student(), KEY);
        assertEquals(60, java.time.Duration.between(attempt.startedAt(), attempt.deadline()).toMinutes());
        assertTrue(attempt.deadline().isAfter(closes));
        assertEquals(closes.toInstant(), catalog.findAvailableById(f.exam(), f.student()).entryClosesAt().toInstant());
    }

    @Test
    void closingRejectsNewAttemptsEvenWithCorrectKey() {
        Fixture f = fixture();
        exams.publishExam(f.exam(), f.teacher());
        setClosing(f.exam(), OffsetDateTime.now().minusSeconds(1));
        assertEquals("EXAM_ENTRY_CLOSED", assertThrows(AttemptException.class,
                () -> attempts.startExam(f.exam(), f.student(), KEY)).code());
        assertEquals("EXAM_ENTRY_CLOSED", assertThrows(AttemptException.class,
                () -> attempts.startExam(f.exam(), f.student())).code());
        assertEquals(0, attemptCount(f.exam()));
    }

    @Test
    void closingDoesNotInterruptVerifiedResumeSaveOrSubmitOrResetDeadline() {
        Fixture f = fixture();
        exams.publishExam(f.exam(), f.teacher());
        setClosing(f.exam(), OffsetDateTime.now().plusMinutes(5));
        var first = attempts.startExam(f.exam(), f.student(), KEY);
        setClosing(f.exam(), OffsetDateTime.now().minusSeconds(1));
        var resumed = attempts.startExam(f.exam(), f.student());
        assertEquals(first.attemptId(), resumed.attemptId());
        assertEquals(first.deadline(), resumed.deadline());
        assertEquals(first.attemptId(), attempts.getAttempt(first.attemptId(), f.student()).attemptId());
        var question = first.questions().getFirst();
        attempts.saveAnswer(first.attemptId(), question.id(), question.choices().getFirst().id(), f.student());
        assertEquals("SUBMITTED", attempts.submitExam(first.attemptId(), f.student()).status().name());
        assertEquals(1, attemptCount(f.exam()));
    }

    @Test
    void legacyUnverifiedAttemptCannotFirstVerifyAfterEntryCloses() {
        Fixture f = fixture();
        exams.publishExam(f.exam(), f.teacher());
        var first = attempts.startExam(f.exam(), f.student(), KEY);
        jdbc.update("UPDATE exam_attempts SET enrollment_verified_at=NULL WHERE id=:id", Map.of("id", first.attemptId()));
        setClosing(f.exam(), OffsetDateTime.now().minusSeconds(1));
        assertEquals("EXAM_ENTRY_CLOSED", assertThrows(AttemptException.class,
                () -> attempts.startExam(f.exam(), f.student(), KEY)).code());
    }

    @Test
    void draftClosingTimePersistsAndRejectsInvalidOrder() {
        Fixture f = fixture();
        var opens = OffsetDateTime.now().plusDays(1).withNano(0);
        var closes = opens.plusHours(2);
        var updated = exams.updateDraftExam(f.exam(), f.teacher(),
                new UpdateExamCommand("Window test", null, 60, opens, "Quiz", null, closes));
        assertEquals(closes.toInstant(), updated.entryClosesAt().toInstant());
        assertEquals(closes.toInstant(), exams.findByIdAndCreatedBy(f.exam(), f.teacher()).entryClosesAt().toInstant());
        assertEquals("INVALID_ENTRY_WINDOW", assertThrows(ExamManagementException.class,
                () -> exams.updateDraftExam(f.exam(), f.teacher(),
                        new UpdateExamCommand("Invalid", null, 60, opens, "Quiz", null, opens))).code());
    }

    @Test
    void creatingWithEntryWindowPersistsBothTimesAndRejectsReversedWindow() {
        long teacher = user("TEACHER");
        var opens = OffsetDateTime.now().plusDays(1).withNano(0);
        var closes = opens.plusHours(2);
        var created = exams.createExam(teacher,
                new CreateExamCommand("Entry window", null, 60, opens, KEY, closes));
        assertEquals(opens.toInstant(), created.scheduledAt().toInstant());
        assertEquals(closes.toInstant(), created.entryClosesAt().toInstant());
        assertEquals(closes.toInstant(), exams.findByIdAndCreatedBy(created.id(), teacher).entryClosesAt().toInstant());
        assertEquals("INVALID_ENTRY_WINDOW", assertThrows(ExamManagementException.class,
                () -> exams.createExam(teacher,
                        new CreateExamCommand("Invalid window", null, 60, opens, KEY, opens.minusMinutes(1)))).code());
    }

    private void setClosing(long exam, OffsetDateTime closes) {
        jdbc.update("UPDATE exams SET entry_closes_at=:closes WHERE id=:id", Map.of("id", exam, "closes", closes));
    }

    private ServerMessage command(WebSocketSession socket, Map<String, Object> payload) throws Exception {
        clearInvocations(socket);
        router.handleMessage(socket, new TextMessage(mapper.writeValueAsString(new ClientMessage("key-test", "START_EXAM", payload))));
        var response = ArgumentCaptor.forClass(TextMessage.class);
        verify(socket).sendMessage(response.capture());
        return mapper.readValue(response.getValue().getPayload(), ServerMessage.class);
    }

    private Fixture fixture() {
        long teacher = user("TEACHER");
        long student = user("STUDENT");
        var course = courses.create(teacher, "KEY-" + UUID.randomUUID().toString().substring(0, 8), "Key test course");
        courses.enroll(course.id(), teacher, student);
        var question = new CreateQuestionCommand(0, "Select A", 2, 0, List.of(
                new CreateQuestionCommand.ChoiceCommand("A", true, 0),
                new CreateQuestionCommand.ChoiceCommand("B", false, 1)));
        var exam = exams.createExamWithQuestions(teacher, course.id(),
                new CreateExamCommand("Key test exam", null, 60, OffsetDateTime.now().plusDays(1), KEY),
                "Quiz", List.of(question));
        // Creation requires a future date; tests below simulate the clock having
        // reached opening time without sleeping or weakening production guards.
        jdbc.update("UPDATE exams SET scheduled_at=:opened WHERE id=:id",
                Map.of("id", exam.id(), "opened", OffsetDateTime.now().minusMinutes(1)));
        return new Fixture(teacher, student, exam.id());
    }

    private long user(String role) {
        String name = "key_" + UUID.randomUUID().toString().replace("-", "");
        return jdbc.queryForObject("""
                INSERT INTO users(username,password_hash,full_name,email,role)
                VALUES(:name,'test-hash','Key Test User',:email,:role) RETURNING id
                """, Map.of("name", name, "email", name + "@example.com", "role", role), Long.class);
    }

    private String hash(long exam) {
        return jdbc.queryForObject("SELECT enrollment_key_hash FROM exams WHERE id=:id", Map.of("id", exam), String.class);
    }

    private int attemptCount(long exam) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM exam_attempts WHERE exam_id=:id", Map.of("id", exam), Integer.class);
    }

    private record Fixture(long teacher, long student, long exam) {}
}
