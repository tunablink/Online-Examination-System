package vn.edu.hanu.exam.websocket.handler;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import tools.jackson.databind.json.JsonMapper;
import vn.edu.hanu.exam.domain.ExamStatus;
import vn.edu.hanu.exam.domain.UserRole;
import vn.edu.hanu.exam.exception.ExamManagementException;
import vn.edu.hanu.exam.protocol.ServerMessage;
import vn.edu.hanu.exam.service.LoggedInUser;
import vn.edu.hanu.exam.service.exam.CreateExamCommand;
import vn.edu.hanu.exam.service.exam.DeletedExamDetails;
import vn.edu.hanu.exam.service.exam.ExamDetails;
import vn.edu.hanu.exam.service.exam.ExamManagementService;
import vn.edu.hanu.exam.service.exam.TeacherExamList;
import vn.edu.hanu.exam.session.AuthenticatedSessionRegistry;
import vn.edu.hanu.exam.service.exam.UpdateExamCommand;
import vn.edu.hanu.exam.service.question.CreateQuestionCommand;

class ExamManagementMessageHandlerTests {
    private static final String SESSION_ID = "session-1";
    private static final String REQUEST_ID = "request-1";

    private ExamManagementService examService;
    private AuthenticatedSessionRegistry sessionRegistry;
    private ExamManagementMessageHandler handler;

    @BeforeEach
    void setUp() {
        examService = mock(ExamManagementService.class);
        sessionRegistry = new AuthenticatedSessionRegistry();
        handler = new ExamManagementMessageHandler(examService, sessionRegistry, JsonMapper.builder().build());
    }

    @Test
    void validCreateReturnsExamCreatedAndPreservesRequestId() {
        authenticate(UserRole.TEACHER);
        ExamDetails exam = sampleExam();
        OffsetDateTime scheduledAt = OffsetDateTime.parse("2026-12-26T17:30:00+07:00");
        when(examService.createExamWithQuestions(eq(10L), eq(3L), any(CreateExamCommand.class),
                eq("Midterm examination"), any())).thenReturn(exam);

        ServerMessage response = handler.handleCreate(SESSION_ID, REQUEST_ID, Map.of(
                "title", "Java Midterm",
                "description", "Core Java",
                "durationMinutes", 60,
                "courseId", 3L, "enrollmentKey", "HandlerKey123!",
                "scheduledAt", scheduledAt.toString(),
                "entryClosesAt", scheduledAt.plusHours(2).toString(),
                "assessmentType", "Midterm examination",
                "questions", List.of(Map.of("content", "Which is Java?", "points", 1,
                        "displayOrder", 0, "choices", List.of(
                                Map.of("content", "A language", "correct", true, "displayOrder", 0),
                                Map.of("content", "A database", "correct", false, "displayOrder", 1))))));

        assertEquals(REQUEST_ID, response.requestId());
        assertEquals("EXAM_CREATED", response.type());
        assertEquals(exam, response.data());
        assertNull(response.error());
        verify(examService).createExamWithQuestions(
                10L,
                3L,
                new CreateExamCommand(
                        "Java Midterm",
                        "Core Java",
                        60,
                        scheduledAt.withOffsetSameInstant(ZoneOffset.UTC), "HandlerKey123!",
                        scheduledAt.plusHours(2).withOffsetSameInstant(ZoneOffset.UTC)),
                "Midterm examination",
                List.of(new CreateQuestionCommand(0, "Which is Java?", 1, 0,
                        List.of(new CreateQuestionCommand.ChoiceCommand("A language", true, 0),
                                new CreateQuestionCommand.ChoiceCommand("A database", false, 1)))));
    }

    @Test
    void missingTitleReturnsServiceValidationCode() {
        authenticate(UserRole.TEACHER);
        when(examService.createExamWithQuestions(eq(10L), eq(3L), any(CreateExamCommand.class),
                eq("Quiz"), any()))
                .thenThrow(new ExamManagementException("INVALID_EXAM_TITLE", "Exam title is required."));

        assertError(handler.handleCreate(
                SESSION_ID, REQUEST_ID, Map.of("durationMinutes", 60, "courseId", 3L, "enrollmentKey", "HandlerKey123!",
                        "entryClosesAt", OffsetDateTime.now().plusDays(2).toString(),
                        "assessmentType", "Quiz", "questions", List.of())), "INVALID_EXAM_TITLE");
    }

    @Test
    void invalidDurationReturnsExpectedCode() {
        authenticate(UserRole.TEACHER);
        when(examService.createExamWithQuestions(eq(10L), eq(3L), any(CreateExamCommand.class),
                eq("Quiz"), any()))
                .thenThrow(new ExamManagementException("INVALID_EXAM_DURATION", "Invalid duration."));

        assertError(handler.handleCreate(SESSION_ID, REQUEST_ID, Map.of(
                "title", "Exam", "durationMinutes", 0, "courseId", 3L, "enrollmentKey", "HandlerKey123!",
                "entryClosesAt", OffsetDateTime.now().plusDays(2).toString(),
                "assessmentType", "Quiz", "questions", List.of())), "INVALID_EXAM_DURATION");
    }

    @Test
    void creatingWithoutAnEnrollmentKeyIsRejectedBeforeServiceCall() {
        authenticate(UserRole.TEACHER);
        assertError(handler.handleCreate(SESSION_ID, REQUEST_ID,
                Map.of("title", "Exam", "courseId", 3L, "durationMinutes", 60)), "INVALID_ENROLLMENT_KEY");
        org.mockito.Mockito.verifyNoInteractions(examService);
    }

    @Test
    void creatingWithoutEntryClosingTimeIsRejectedBeforeServiceCall() {
        authenticate(UserRole.TEACHER);
        assertError(handler.handleCreate(SESSION_ID, REQUEST_ID,
                Map.of("title", "Exam", "courseId", 3L, "durationMinutes", 60,
                        "enrollmentKey", "HandlerKey123!")), "INVALID_ENTRY_WINDOW");
        org.mockito.Mockito.verifyNoInteractions(examService);
    }

    @Test
    void unauthenticatedSessionIsRejected() {
        assertError(handler.handleList("missing", REQUEST_ID), "AUTHENTICATION_REQUIRED");
        verify(examService, never()).findAllByCreatedBy(anyLong());
    }

    @Test
    void studentIsForbidden() {
        authenticate(UserRole.STUDENT);
        assertError(handler.handleList(SESSION_ID, REQUEST_ID), "FORBIDDEN");
        verify(examService, never()).findAllByCreatedBy(anyLong());
    }

    @Test
    void listAndGetUseAuthenticatedTeacherId() {
        authenticate(UserRole.TEACHER);
        when(examService.findAllByCreatedBy(10L)).thenReturn(new TeacherExamList(List.of(sampleExam())));
        when(examService.findByIdAndCreatedBy(1L, 10L)).thenReturn(sampleExam());

        assertEquals("TEACHER_EXAMS", handler.handleList(SESSION_ID, REQUEST_ID).type());
        assertEquals("EXAM_DETAILS", handler.handleGet(
                SESSION_ID, REQUEST_ID, Map.of("examId", 1L)).type());
        verify(examService).findAllByCreatedBy(10L);
        verify(examService).findByIdAndCreatedBy(1L, 10L);
    }

    private void authenticate(UserRole role) {
        sessionRegistry.authenticate(
                SESSION_ID,
                new LoggedInUser(10L, "user", "Test User", "user@example.com", role));
    }

    private ExamDetails sampleExam() {
        OffsetDateTime timestamp = OffsetDateTime.parse("2026-10-22T10:00:00+07:00");
        return new ExamDetails(
                1L, "Java Midterm", "Core Java", 60, ExamStatus.DRAFT, 10L, timestamp, timestamp);
    }

    private void assertError(ServerMessage response, String expectedCode) {
        assertEquals(REQUEST_ID, response.requestId());
        assertEquals("ERROR", response.type());
        assertNull(response.data());
        assertNotNull(response.error());
        assertEquals(expectedCode, response.error().code());
    }

    @Test
    void validUpdateReturnsExamUpdatedAndPreservesRequestId() {
        authenticate(UserRole.TEACHER);

        ExamDetails updatedExam = new ExamDetails(
                1L,
                "Updated Java Midterm",
                "Updated description",
                90,
                ExamStatus.DRAFT,
                10L,
                OffsetDateTime.parse("2026-10-22T10:00:00+07:00"),
                OffsetDateTime.parse("2026-10-22T11:00:00+07:00"));

        when(examService.updateDraftExam(
                eq(1L),
                eq(10L),
                eq(new UpdateExamCommand(
                        "Updated Java Midterm",
                        "Updated description",
                        90))))
                .thenReturn(updatedExam);

        ServerMessage response = handler.handleUpdate(
                SESSION_ID,
                REQUEST_ID,
                Map.of(
                        "examId", 1L,
                        "title", "Updated Java Midterm",
                        "description", "Updated description",
                        "durationMinutes", 90));

        assertEquals(REQUEST_ID, response.requestId());
        assertEquals("EXAM_UPDATED", response.type());
        assertEquals(updatedExam, response.data());
        assertNull(response.error());

        verify(examService).updateDraftExam(
                1L,
                10L,
                new UpdateExamCommand(
                        "Updated Java Midterm",
                        "Updated description",
                        90));
    }

    @Test
    void studentCannotUpdateExam() {
        authenticate(UserRole.STUDENT);

        ServerMessage response = handler.handleUpdate(
                SESSION_ID,
                REQUEST_ID,
                Map.of(
                        "examId", 1L,
                        "title", "Updated exam",
                        "durationMinutes", 90));

        assertError(response, "FORBIDDEN");

        verify(examService, never()).updateDraftExam(
                anyLong(),
                anyLong(),
                any(UpdateExamCommand.class));
    }

    @Test
    void nullUpdatePayloadReturnsInvalidPayload() {
        authenticate(UserRole.TEACHER);

        ServerMessage response = handler.handleUpdate(
                SESSION_ID,
                REQUEST_ID,
                null);

        assertError(response, "INVALID_PAYLOAD");

        verify(examService, never()).updateDraftExam(
                anyLong(),
                anyLong(),
                any(UpdateExamCommand.class));
    }

    @Test
    void updatePreservesServiceErrorCode() {
        authenticate(UserRole.TEACHER);

        when(examService.updateDraftExam(
                eq(1L),
                eq(10L),
                any(UpdateExamCommand.class))).thenThrow(new ExamManagementException(
                        "EXAM_NOT_EDITABLE",
                        "Only a draft exam can be updated."));

        ServerMessage response = handler.handleUpdate(
                SESSION_ID,
                REQUEST_ID,
                Map.of(
                        "examId", 1L,
                        "title", "Updated exam",
                        "durationMinutes", 90));

        assertError(response, "EXAM_NOT_EDITABLE");
    }

    @Test
    void unexpectedUpdateFailureReturnsInternalServerError() {
        authenticate(UserRole.TEACHER);

        when(examService.updateDraftExam(
                eq(1L),
                eq(10L),
                any(UpdateExamCommand.class))).thenThrow(new IllegalArgumentException(
                        "Sensitive internal detail"));

        ServerMessage response = handler.handleUpdate(
                SESSION_ID,
                REQUEST_ID,
                Map.of(
                        "examId", 1L,
                        "title", "Updated exam",
                        "durationMinutes", 90));

        assertError(response, "INTERNAL_SERVER_ERROR");
        assertEquals(
                "An unexpected error occurred.",
                response.error().message());
    }

    @Test
    void unauthenticatedUpdateIsRejected() {
        ServerMessage response = handler.handleUpdate(
                "missing-session",
                REQUEST_ID,
                Map.of(
                        "examId", 1L,
                        "title", "Updated exam",
                        "durationMinutes", 90));

        assertError(response, "AUTHENTICATION_REQUIRED");

        verify(examService, never()).updateDraftExam(
                anyLong(),
                anyLong(),
                any(UpdateExamCommand.class));
    }

    @Test
    void validPublishReturnsExamPublishedAndPreservesRequestId() {
        authenticate(UserRole.TEACHER);

        ExamDetails publishedExam = new ExamDetails(
                1L,
                "Java Midterm",
                "Core Java",
                60,
                ExamStatus.PUBLISHED,
                10L,
                OffsetDateTime.parse("2026-10-22T10:00:00+07:00"),
                OffsetDateTime.parse("2026-10-22T11:00:00+07:00"));

        when(examService.publishExam(1L, 10L)).thenReturn(publishedExam);

        ServerMessage response = handler.handlePublish(
                SESSION_ID,
                REQUEST_ID,
                Map.of("examId", 1L));

        assertEquals(REQUEST_ID, response.requestId());
        assertEquals("EXAM_PUBLISHED", response.type());
        assertEquals(publishedExam, response.data());
        assertNull(response.error());
        verify(examService).publishExam(1L, 10L);
    }

    @Test
    void nullPublishPayloadReturnsInvalidPayload() {
        authenticate(UserRole.TEACHER);

        ServerMessage response = handler.handlePublish(
                SESSION_ID,
                REQUEST_ID,
                null);

        assertError(response, "INVALID_PAYLOAD");
        verify(examService, never()).publishExam(anyLong(), anyLong());
    }

    @Test
    void studentCannotPublishExam() {
        authenticate(UserRole.STUDENT);

        ServerMessage response = handler.handlePublish(
                SESSION_ID,
                REQUEST_ID,
                Map.of("examId", 1L));

        assertError(response, "FORBIDDEN");
        verify(examService, never()).publishExam(anyLong(), anyLong());
    }

    @Test
    void publishPreservesServiceErrorCode() {
        authenticate(UserRole.TEACHER);

        when(examService.publishExam(1L, 10L)).thenThrow(new ExamManagementException(
                "EXAM_HAS_NO_QUESTIONS",
                "The exam must contain at least one question before publication."));

        ServerMessage response = handler.handlePublish(
                SESSION_ID,
                REQUEST_ID,
                Map.of("examId", 1L));

        assertError(response, "EXAM_HAS_NO_QUESTIONS");
    }

    @Test
    void validCloseReturnsExamClosedAndPreservesRequestId() {
        authenticate(UserRole.TEACHER);

        ExamDetails closedExam = new ExamDetails(
                1L,
                "Java Midterm",
                "Core Java",
                60,
                ExamStatus.CLOSED,
                10L,
                OffsetDateTime.parse("2026-10-22T10:00:00+07:00"),
                OffsetDateTime.parse("2026-10-22T12:00:00+07:00"));

        when(examService.closeExam(1L, 10L)).thenReturn(closedExam);

        ServerMessage response = handler.handleClose(
                SESSION_ID,
                REQUEST_ID,
                Map.of("examId", 1L));

        assertEquals(REQUEST_ID, response.requestId());
        assertEquals("EXAM_CLOSED", response.type());
        assertEquals(closedExam, response.data());
        assertNull(response.error());
        verify(examService).closeExam(1L, 10L);
    }

    @Test
    void nullClosePayloadReturnsInvalidPayload() {
        authenticate(UserRole.TEACHER);

        ServerMessage response = handler.handleClose(
                SESSION_ID,
                REQUEST_ID,
                null);

        assertError(response, "INVALID_PAYLOAD");
        verify(examService, never()).closeExam(anyLong(), anyLong());
    }

    @Test
    void studentCannotCloseExam() {
        authenticate(UserRole.STUDENT);

        ServerMessage response = handler.handleClose(
                SESSION_ID,
                REQUEST_ID,
                Map.of("examId", 1L));

        assertError(response, "FORBIDDEN");
        verify(examService, never()).closeExam(anyLong(), anyLong());
    }

    @Test
    void closePreservesServiceErrorCode() {
        authenticate(UserRole.TEACHER);

        when(examService.closeExam(1L, 10L)).thenThrow(new ExamManagementException(
                "EXAM_NOT_CLOSABLE",
                "Only a published exam can be closed."));

        ServerMessage response = handler.handleClose(
                SESSION_ID,
                REQUEST_ID,
                Map.of("examId", 1L));

        assertError(response, "EXAM_NOT_CLOSABLE");
    }

    @Test
    void validDeleteReturnsExamDeletedAndPreservesRequestId() {
        authenticate(UserRole.TEACHER);
        DeletedExamDetails deletedExam = new DeletedExamDetails(1L);
        when(examService.deleteDraftExam(1L, 10L)).thenReturn(deletedExam);

        ServerMessage response = handler.handleDelete(
                SESSION_ID,
                REQUEST_ID,
                Map.of("examId", 1L));

        assertEquals(REQUEST_ID, response.requestId());
        assertEquals("EXAM_DELETED", response.type());
        assertEquals(deletedExam, response.data());
        assertNull(response.error());
        verify(examService).deleteDraftExam(1L, 10L);
    }

    @Test
    void nullDeletePayloadReturnsInvalidPayload() {
        authenticate(UserRole.TEACHER);

        ServerMessage response = handler.handleDelete(
                SESSION_ID,
                REQUEST_ID,
                null);

        assertError(response, "INVALID_PAYLOAD");
        verify(examService, never()).deleteDraftExam(anyLong(), anyLong());
    }

    @Test
    void studentCannotDeleteExam() {
        authenticate(UserRole.STUDENT);

        ServerMessage response = handler.handleDelete(
                SESSION_ID,
                REQUEST_ID,
                Map.of("examId", 1L));

        assertError(response, "FORBIDDEN");
        verify(examService, never()).deleteDraftExam(anyLong(), anyLong());
    }

    @Test
    void deletePreservesServiceErrorCode() {
        authenticate(UserRole.TEACHER);

        when(examService.deleteDraftExam(1L, 10L)).thenThrow(new ExamManagementException(
                "EXAM_NOT_DELETABLE",
                "Only a draft exam can be deleted."));

        ServerMessage response = handler.handleDelete(
                SESSION_ID,
                REQUEST_ID,
                Map.of("examId", 1L));

        assertError(response, "EXAM_NOT_DELETABLE");
    }
}
