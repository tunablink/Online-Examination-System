package vn.edu.hanu.exam.websocket.handler;

import java.math.BigInteger;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;
import vn.edu.hanu.exam.domain.UserRole;
import vn.edu.hanu.exam.exception.QuestionManagementException;
import vn.edu.hanu.exam.protocol.ClientMessage;
import vn.edu.hanu.exam.protocol.ServerMessage;
import vn.edu.hanu.exam.service.LoggedInUser;
import vn.edu.hanu.exam.service.question.CreateQuestionCommand;
import vn.edu.hanu.exam.service.question.QuestionManagementService;
import vn.edu.hanu.exam.service.question.UpdateQuestionCommand;
import vn.edu.hanu.exam.session.AuthenticatedSessionRegistry;
import vn.edu.hanu.exam.websocket.dto.CreateQuestionPayload;
import vn.edu.hanu.exam.websocket.dto.DeleteQuestionPayload;
import vn.edu.hanu.exam.websocket.dto.GetExamQuestionsPayload;
import vn.edu.hanu.exam.websocket.dto.UpdateQuestionPayload;

@Component
public class QuestionManagementMessageHandler {
    static final String TYPE_QUESTION_CREATED =
            "QUESTION_CREATED";

    static final String TYPE_QUESTION_UPDATED =
            "QUESTION_UPDATED";

    static final String TYPE_QUESTION_DELETED =
            "QUESTION_DELETED";

    static final String TYPE_EXAM_QUESTIONS =
            "EXAM_QUESTIONS";

    static final String CODE_AUTHENTICATION_REQUIRED =
            "AUTHENTICATION_REQUIRED";

    static final String CODE_FORBIDDEN =
            "FORBIDDEN";

    static final String CODE_INVALID_PAYLOAD =
            "INVALID_PAYLOAD";

    static final String CODE_INTERNAL_SERVER_ERROR =
            "INTERNAL_SERVER_ERROR";

    private static final Logger LOGGER =
            LoggerFactory.getLogger(
                    QuestionManagementMessageHandler.class
            );

    private final QuestionManagementService questionService;
    private final AuthenticatedSessionRegistry sessionRegistry;
    private final JsonMapper jsonMapper;

    public QuestionManagementMessageHandler(
            QuestionManagementService questionService,
            AuthenticatedSessionRegistry sessionRegistry,
            JsonMapper jsonMapper
    ) {
        this.questionService = questionService;
        this.sessionRegistry = sessionRegistry;
        this.jsonMapper = jsonMapper;
    }

    public ServerMessage handleCreate(
            WebSocketSession session,
            ClientMessage message
    ) {
        return handleCreate(
                session.getId(),
                message.requestId(),
                message.payload()
        );
    }

    public ServerMessage handleList(
            WebSocketSession session,
            ClientMessage message
    ) {
        return handleList(
                session.getId(),
                message.requestId(),
                message.payload()
        );
    }

    public ServerMessage handleCreate(
            String sessionId,
            String requestId,
            Map<String, Object> payload
    ) {
        return withTeacher(
                sessionId,
                requestId,
                teacher -> {
                    CreateQuestionPayload input =
                            convertCreatePayload(payload);

                    List<CreateQuestionCommand.ChoiceCommand>
                            choices = input.choices().stream()
                                    .map(choice ->
                                            new CreateQuestionCommand
                                                    .ChoiceCommand(
                                                    choice.content(),
                                                    choice.correct(),
                                                    choice.displayOrder()
                                            )
                                    )
                                    .toList();

                    CreateQuestionCommand command =
                            new CreateQuestionCommand(
                                    input.examId(),
                                    input.content(),
                                    input.points(),
                                    input.displayOrder(),
                                    choices
                            );

                    return ServerMessage.success(
                            requestId,
                            TYPE_QUESTION_CREATED,
                            questionService.createQuestion(
                                    teacher.id(),
                                    command
                            )
                    );
                }
        );
    }

    public ServerMessage handleList(
            String sessionId,
            String requestId,
            Map<String, Object> payload
    ) {
        return withTeacher(
                sessionId,
                requestId,
                teacher -> {
                    GetExamQuestionsPayload input =
                            convertGetPayload(payload);

                    return ServerMessage.success(
                            requestId,
                            TYPE_EXAM_QUESTIONS,
                            questionService.findAllByExamId(
                                    teacher.id(),
                                    input.examId()
                            )
                    );
                }
        );
    }

    public ServerMessage handleUpdate(
            WebSocketSession session,
            ClientMessage message
    ) {
        return handleUpdate(
                session.getId(),
                message.requestId(),
                message.payload()
        );
    }

    public ServerMessage handleUpdate(
            String sessionId,
            String requestId,
            Map<String, Object> payload
    ) {
        return withTeacher(
                sessionId,
                requestId,
                teacher -> {
                    UpdateQuestionPayload input =
                            convertUpdatePayload(payload);

                    List<UpdateQuestionCommand.ChoiceCommand> choices =
                            input.choices().stream()
                                    .map(choice ->
                                            new UpdateQuestionCommand
                                                    .ChoiceCommand(
                                                    choice.content(),
                                                    choice.correct(),
                                                    choice.displayOrder()
                                            )
                                    )
                                    .toList();

                    UpdateQuestionCommand command =
                            new UpdateQuestionCommand(
                                    input.questionId(),
                                    input.content(),
                                    input.points(),
                                    input.displayOrder(),
                                    choices
                            );

                    return ServerMessage.success(
                            requestId,
                            TYPE_QUESTION_UPDATED,
                            questionService.updateQuestion(
                                    teacher.id(),
                                    command
                            )
                    );
                }
        );
    }

    public ServerMessage handleDelete(
            WebSocketSession session,
            ClientMessage message
    ) {
        return handleDelete(
                session.getId(),
                message.requestId(),
                message.payload()
        );
    }

    public ServerMessage handleDelete(
            String sessionId,
            String requestId,
            Map<String, Object> payload
    ) {
        return withTeacher(
                sessionId,
                requestId,
                teacher -> {
                    DeleteQuestionPayload input =
                            convertDeletePayload(payload);

                    return ServerMessage.success(
                            requestId,
                            TYPE_QUESTION_DELETED,
                            questionService.deleteQuestion(
                                    teacher.id(),
                                    input.questionId()
                            )
                    );
                }
        );
    }

    private ServerMessage withTeacher(
            String sessionId,
            String requestId,
            Function<LoggedInUser, ServerMessage> operation
    ) {
        LoggedInUser user = sessionRegistry
                .findUser(sessionId)
                .orElse(null);

        if (user == null) {
            return ServerMessage.error(
                    requestId,
                    CODE_AUTHENTICATION_REQUIRED,
                    "Authentication is required."
            );
        }

        if (user.role() != UserRole.TEACHER) {
            return ServerMessage.error(
                    requestId,
                    CODE_FORBIDDEN,
                    "This operation is only available to teachers."
            );
        }

        try {
            return operation.apply(user);
        } catch (InvalidPayloadException exception) {
            return ServerMessage.error(
                    requestId,
                    CODE_INVALID_PAYLOAD,
                    "The request payload is invalid."
            );
        } catch (QuestionManagementException exception) {
            LOGGER.info(
                    "Question operation rejected: "
                            + "requestId={}, code={}",
                    requestId,
                    exception.code()
            );

            return ServerMessage.error(
                    requestId,
                    exception.code(),
                    exception.getMessage()
            );
        } catch (RuntimeException exception) {
            LOGGER.error(
                    "Unexpected question operation error: "
                            + "requestId={}",
                    requestId,
                    exception
            );

            return ServerMessage.error(
                    requestId,
                    CODE_INTERNAL_SERVER_ERROR,
                    "An unexpected error occurred."
            );
        }
    }

    private CreateQuestionPayload convertCreatePayload(
            Map<String, Object> payload
    ) {
        if (payload == null) {
            throw new InvalidPayloadException();
        }

        validateIntegralField(payload.get("examId"));
        validateIntegralField(payload.get("points"));
        validateIntegralField(payload.get("displayOrder"));

        validateOptionalString(payload.get("content"));

        Object rawChoices = payload.get("choices");

        if (!(rawChoices instanceof List<?> choices)) {
            throw new InvalidPayloadException();
        }

        for (Object rawChoice : choices) {
            validateRawChoice(rawChoice);
        }

        try {
            CreateQuestionPayload input =
                    jsonMapper.convertValue(
                            payload,
                            CreateQuestionPayload.class
                    );

            if (input.examId() == null
                    || input.points() == null
                    || input.displayOrder() == null
                    || input.choices() == null) {
                throw new InvalidPayloadException();
            }

            for (CreateQuestionPayload.ChoicePayload choice
                    : input.choices()) {
                if (choice == null
                        || choice.correct() == null
                        || choice.displayOrder() == null) {
                    throw new InvalidPayloadException();
                }
            }

            return input;
        } catch (JacksonException | IllegalArgumentException exception) {
            throw new InvalidPayloadException();
        }
    }

    private GetExamQuestionsPayload convertGetPayload(
            Map<String, Object> payload
    ) {
        if (payload == null) {
            throw new InvalidPayloadException();
        }

        validateIntegralField(payload.get("examId"));

        try {
            GetExamQuestionsPayload input =
                    jsonMapper.convertValue(
                            payload,
                            GetExamQuestionsPayload.class
                    );

            if (input.examId() == null) {
                throw new InvalidPayloadException();
            }

            return input;
        } catch (JacksonException | IllegalArgumentException exception) {
            throw new InvalidPayloadException();
        }
    }

    private UpdateQuestionPayload convertUpdatePayload(
            Map<String, Object> payload
    ) {
        if (payload == null) {
            throw new InvalidPayloadException();
        }

        validateIntegralField(payload.get("questionId"));
        validateIntegralField(payload.get("points"));
        validateIntegralField(payload.get("displayOrder"));

        validateOptionalString(payload.get("content"));

        Object rawChoices = payload.get("choices");

        if (!(rawChoices instanceof List<?> choices)) {
            throw new InvalidPayloadException();
        }

        for (Object rawChoice : choices) {
            validateRawChoice(rawChoice);
        }

        try {
            UpdateQuestionPayload input =
                    jsonMapper.convertValue(
                            payload,
                            UpdateQuestionPayload.class
                    );

            if (input.questionId() == null
                    || input.points() == null
                    || input.displayOrder() == null
                    || input.choices() == null) {
                throw new InvalidPayloadException();
            }

            for (UpdateQuestionPayload.ChoicePayload choice
                    : input.choices()) {
                if (choice == null
                        || choice.correct() == null
                        || choice.displayOrder() == null) {
                    throw new InvalidPayloadException();
                }
            }

            return input;
        } catch (JacksonException | IllegalArgumentException exception) {
            throw new InvalidPayloadException();
        }
    }

    private DeleteQuestionPayload convertDeletePayload(
            Map<String, Object> payload
    ) {
        if (payload == null) {
            throw new InvalidPayloadException();
        }

        validateIntegralField(payload.get("questionId"));

        try {
            DeleteQuestionPayload input =
                    jsonMapper.convertValue(
                            payload,
                            DeleteQuestionPayload.class
                    );

            if (input.questionId() == null) {
                throw new InvalidPayloadException();
            }

            return input;
        } catch (JacksonException | IllegalArgumentException exception) {
            throw new InvalidPayloadException();
        }
    }

    private void validateRawChoice(Object rawChoice) {
        if (!(rawChoice instanceof Map<?, ?> choiceMap)) {
            throw new InvalidPayloadException();
        }

        validateOptionalString(choiceMap.get("content"));
        validateIntegralField(choiceMap.get("displayOrder"));

        if (!(choiceMap.get("correct") instanceof Boolean)) {
            throw new InvalidPayloadException();
        }
    }

    private void validateIntegralField(Object value) {
        if (!isIntegralNumber(value)) {
            throw new InvalidPayloadException();
        }
    }

    private void validateOptionalString(Object value) {
        if (value != null && !(value instanceof String)) {
            throw new InvalidPayloadException();
        }
    }

    private static boolean isIntegralNumber(Object value) {
        return value instanceof Byte
                || value instanceof Short
                || value instanceof Integer
                || value instanceof Long
                || value instanceof BigInteger;
    }

    private static final class InvalidPayloadException
            extends RuntimeException {
    }
}