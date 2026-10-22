# PHÂN CÔNG NHIỆM VỤ BACKEND – GIAI ĐOẠN EXAM MANAGEMENT

## Online Examination System

Tài liệu này thay thế toàn bộ bản phân công backend cũ. Trong giai đoạn hiện tại, hai thành viên được giao việc là **Phanh** và **Hải Yến**.

Mục tiêu của giai đoạn là chuyển hai khu vực quan trọng trên React client từ mock data sang dữ liệu PostgreSQL thật:

1. Teacher tạo và xem đề thi.
2. Teacher thêm và xem câu hỏi/lựa chọn của đề thi.

Phạm vi được giới hạn để hai thành viên có thể làm song song, viết test đầy đủ và hạn chế conflict. Các phần exam attempt, auto-save, submit, grading, recovery, monitoring, anti-cheating và randomization chưa thuộc nhiệm vụ của hai thành viên trong giai đoạn này.

---

## 1. Trạng thái dự án trước khi bắt đầu

Các foundation đã có trong source:

- Java 21, Spring Boot, Maven và Spring WebSocket.
- PostgreSQL, Spring JDBC và HikariCP.
- WebSocket endpoint `/ws` trên cổng `8081`.
- Message envelope gồm `requestId`, `type`, `payload`, `data` và `error`.
- Các message `CONNECTED`, `PING`, `PONG`, `REGISTER`, `REGISTERED`, `LOGIN`, `LOGGED_IN`, `ERROR`.
- `RegistrationService` và `LoginService`.
- `AuthenticatedSessionRegistry` gắn user đã đăng nhập với WebSocket `sessionId`.
- Schema và domain model cơ bản cho `users`, `exams`, `questions`, `choices`.
- React client đã có `CreateExamPage`, `ExamManagementPage`, `ExamOverviewPage` và `QuestionManagementPage`, nhưng các trang nghiệp vụ exam/question vẫn đang dùng mock/local state.

Giai đoạn này không thiết kế lại auth hoặc schema hiện có. Nếu phát hiện foundation có lỗi, thành viên phải báo leader trước khi mở rộng phạm vi.

---

## 2. Bảng phân công

| Thành viên | Nhiệm vụ | Đầu ra chính | Branch đề xuất |
| --- | --- | --- | --- |
| Phanh | Exam Management Backend | Tạo đề, lấy danh sách đề của teacher, lấy chi tiết đề | `feature/exam-management-backend` |
| Hải Yến | Question Management Backend | Tạo câu hỏi kèm choices, lấy danh sách câu hỏi của một đề | `feature/question-management-backend` |
| Leader | Chốt contract, review, tích hợp protocol/dispatcher và nối frontend | `MessageType`, `ExamWebSocketHandler`, React protocol và thay mock | Thực hiện sau khi nhận hai nhánh |

Thứ tự merge dự kiến:

1. Phanh – Exam Management Backend.
2. Chạy toàn bộ server test.
3. Hải Yến – Question Management Backend.
4. Chạy toàn bộ server test.
5. Leader thêm message type, nối dispatcher và tích hợp React client.

Hai thành viên có thể code song song, nhưng Exam Management nên được merge trước vì Question Management phụ thuộc khái niệm ownership và trạng thái của exam.

---

## 3. Quy ước chung bắt buộc

### 3.1. Authentication và authorization

Mọi command trong tài liệu này chỉ dành cho teacher.

Handler/service phải tuân theo thứ tự:

1. Lấy user từ `AuthenticatedSessionRegistry` bằng WebSocket `sessionId`.
2. Không tìm thấy user thì trả `AUTHENTICATION_REQUIRED`.
3. User không có role `TEACHER` thì trả `FORBIDDEN`.
4. Teacher ID/creator ID phải lấy từ authenticated session.
5. Không tin `teacherId`, `createdBy` hoặc role do client gửi lên.
6. Khi truy cập exam, phải kiểm tra exam thuộc teacher hiện tại.
7. Nếu resource không tồn tại hoặc không thuộc teacher, trả `EXAM_NOT_FOUND`; không làm lộ rằng resource của người khác tồn tại.

Ví dụ không được chấp nhận:

```json
{
  "createdBy": 123,
  "role": "TEACHER"
}
```

Server phải dùng user đã được xác thực trong session registry.

### 3.2. Message envelope

Client command:

```json
{
  "requestId": "uuid",
  "type": "MESSAGE_TYPE",
  "payload": {}
}
```

Response thành công:

```json
{
  "requestId": "uuid",
  "type": "SUCCESS_TYPE",
  "data": {},
  "error": null
}
```

Response lỗi:

```json
{
  "requestId": "uuid",
  "type": "ERROR",
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "message": "Safe error message"
  }
}
```

Không trả stack trace, SQL, password hash hoặc exception message nội bộ cho client.

### 3.3. File trung tâm không được tự sửa

Trong lúc làm việc riêng, Phanh và Hải Yến không tự sửa các file sau:

```text
server/src/main/java/vn/edu/hanu/exam/protocol/MessageType.java
server/src/main/java/vn/edu/hanu/exam/websocket/ExamWebSocketHandler.java
server/src/main/resources/schema.sql
client/src/websocket/protocol.ts
client/src/App.tsx
README.md
```

Lý do:

- Cả hai cùng thêm enum sẽ conflict trong `MessageType.java`.
- Cả hai cùng thêm `switch case` sẽ conflict trong `ExamWebSocketHandler.java`.
- Schema `exams`, `questions`, `choices` đã tồn tại.
- Leader chịu trách nhiệm đảm bảo contract client/server thống nhất.

Mỗi người phải tạo message handler riêng. Leader sẽ nối các handler vào `ExamWebSocketHandler` sau khi merge.

### 3.4. Coding và database

- Dùng constructor injection.
- Không dùng field injection.
- Dùng named SQL parameters cho truy vấn có nhiều tham số.
- Không nối chuỗi để tạo SQL.
- Không trả trực tiếp exception database cho client.
- Service giữ validation và business rule.
- Repository chỉ giữ persistence/query logic.
- WebSocket handler parse payload, gọi service và chuyển kết quả/lỗi thành `ServerMessage`.
- Integration test phải dùng transaction/cleanup hợp lý để không để lại dữ liệu rác.
- Không commit password database.

---

## 4. Phanh – Exam Management Backend

### 4.1. Mục tiêu

Hiện thực vertical slice cho teacher tạo và đọc đề thi bằng dữ liệu PostgreSQL thật:

```text
Authenticated Teacher
        ↓
CREATE_EXAM / GET_TEACHER_EXAMS / GET_EXAM
        ↓
ExamManagementMessageHandler
        ↓
ExamManagementService
        ↓
ExamRepository
        ↓
PostgreSQL exams
```

Sau nhiệm vụ này, leader phải có thể nối React `CreateExamPage`, `ExamManagementPage` và `ExamOverviewPage` vào backend.

### 4.2. Phạm vi message

| Client → Server | Server → Client | Chức năng |
| --- | --- | --- |
| `CREATE_EXAM` | `EXAM_CREATED` | Tạo exam mới ở trạng thái `DRAFT` |
| `GET_TEACHER_EXAMS` | `TEACHER_EXAMS` | Lấy toàn bộ exam do teacher hiện tại tạo |
| `GET_EXAM` | `EXAM_DETAILS` | Lấy chi tiết một exam thuộc teacher hiện tại |

Không làm trong nhiệm vụ này:

- `UPDATE_EXAM`.
- `DELETE_EXAM`.
- `PUBLISH_EXAM`.
- `CLOSE_EXAM`.
- Question CRUD.
- Student exam list.
- Exam attempt/session.
- Scheduler, monitoring hoặc anti-cheating.

### 4.3. Contract `CREATE_EXAM`

Request:

```json
{
  "requestId": "uuid",
  "type": "CREATE_EXAM",
  "payload": {
    "title": "Java Programming Midterm",
    "description": "Midterm examination for JSD",
    "durationMinutes": 60
  }
}
```

`createdBy` không xuất hiện trong payload. Server lấy teacher ID từ authenticated session.

Response:

```json
{
  "requestId": "uuid",
  "type": "EXAM_CREATED",
  "data": {
    "id": 1,
    "title": "Java Programming Midterm",
    "description": "Midterm examination for JSD",
    "durationMinutes": 60,
    "status": "DRAFT",
    "createdBy": 10,
    "createdAt": "2026-10-22T10:00:00+07:00",
    "updatedAt": "2026-10-22T10:00:00+07:00"
  },
  "error": null
}
```

### 4.4. Contract `GET_TEACHER_EXAMS`

Request:

```json
{
  "requestId": "uuid",
  "type": "GET_TEACHER_EXAMS",
  "payload": {}
}
```

Repository phải lọc theo:

```sql
created_by = :teacherId
```

Response:

```json
{
  "requestId": "uuid",
  "type": "TEACHER_EXAMS",
  "data": {
    "exams": [
      {
        "id": 1,
        "title": "Java Programming Midterm",
        "description": "Midterm examination for JSD",
        "durationMinutes": 60,
        "status": "DRAFT",
        "createdBy": 10,
        "createdAt": "2026-10-22T10:00:00+07:00",
        "updatedAt": "2026-10-22T10:00:00+07:00"
      }
    ]
  },
  "error": null
}
```

### 4.5. Contract `GET_EXAM`

Request:

```json
{
  "requestId": "uuid",
  "type": "GET_EXAM",
  "payload": {
    "examId": 1
  }
}
```

Query phải kiểm tra đồng thời:

```sql
id = :examId
AND created_by = :teacherId
```

Không được query chỉ bằng `examId` rồi trả resource cho bất kỳ teacher nào.

### 4.6. File Phanh được tạo

Cấu trúc gợi ý:

```text
server/src/main/java/vn/edu/hanu/exam/
├── exception/
│   └── ExamManagementException.java
├── repository/
│   ├── ExamRepository.java
│   └── JdbcExamRepository.java
├── service/exam/
│   ├── CreateExamCommand.java
│   ├── ExamDetails.java
│   └── ExamManagementService.java
└── websocket/
    ├── dto/
    │   ├── CreateExamPayload.java
    │   └── GetExamPayload.java
    └── handler/
        └── ExamManagementMessageHandler.java
```

Test:

```text
server/src/test/java/vn/edu/hanu/exam/
├── ExamManagementServiceIntegrationTests.java
└── websocket/handler/
    └── ExamManagementMessageHandlerTests.java
```

Tên DTO có thể điều chỉnh nếu vẫn giữ đúng trách nhiệm và không trùng class hiện có.

### 4.7. Repository contract gợi ý

```java
public interface ExamRepository {

    Exam create(
            String title,
            String description,
            int durationMinutes,
            long createdBy
    );

    List<Exam> findAllByCreatedBy(
            long createdBy
    );

    Optional<Exam> findByIdAndCreatedBy(
            long examId,
            long createdBy
    );
}
```

Có thể dùng command object cho `create`, nhưng không thiết kế abstraction phức tạp hơn nhu cầu hiện tại.

### 4.8. Validation bắt buộc

- Session phải authenticated.
- User phải có role `TEACHER`.
- `title` không null, không blank và không vượt giới hạn database.
- `description` có thể null.
- `durationMinutes > 0`.
- Exam mới luôn có status `DRAFT`.
- `createdBy` lấy từ authenticated session.
- Teacher chỉ đọc được exam do chính mình tạo.
- Không để SQL exception đi thẳng ra WebSocket response.

Error code đề xuất:

```text
AUTHENTICATION_REQUIRED
FORBIDDEN
INVALID_EXAM_TITLE
INVALID_EXAM_DURATION
EXAM_NOT_FOUND
DATABASE_ERROR
```

Nếu muốn thêm hoặc đổi error code, Phanh phải báo leader để đồng bộ với React client.

### 4.9. Test bắt buộc

`ExamManagementServiceIntegrationTests` tối thiểu phải kiểm tra:

1. Tạo exam hợp lệ và persist thành công.
2. Exam mới có status `DRAFT`.
3. `createdBy` đúng teacher đã authenticated.
4. Title blank bị từ chối.
5. Duration bằng `0` hoặc âm bị từ chối.
6. `findAllByCreatedBy` không trả exam của teacher khác.
7. `findByIdAndCreatedBy` không cho teacher khác đọc exam.

`ExamManagementMessageHandlerTests` tối thiểu phải kiểm tra:

1. Payload đúng trả `EXAM_CREATED`.
2. Payload thiếu title trả `ERROR`.
3. Duration sai trả error code đúng.
4. Session chưa đăng nhập trả `AUTHENTICATION_REQUIRED`.
5. Student gọi command dành cho teacher trả `FORBIDDEN`.
6. Response giữ nguyên `requestId` của request.

### 4.10. Điều kiện nghiệm thu

Phanh chỉ báo hoàn thành khi:

- [ ] Tạo exam thật trong PostgreSQL.
- [ ] Query lại được exam vừa tạo.
- [ ] Không nhận `createdBy` từ payload.
- [ ] Có kiểm tra role `TEACHER`.
- [ ] Teacher không đọc được exam của teacher khác.
- [ ] Có integration test và handler test.
- [ ] Test riêng chạy thành công.
- [ ] Không sửa file trung tâm thuộc leader.
- [ ] Không mở rộng sang question/attempt/monitoring.

Lệnh test riêng trong PowerShell:

```powershell
cd server
$env:DB_PASSWORD = '<database-password>'
mvn "-Dtest=ExamManagementServiceIntegrationTests,ExamManagementMessageHandlerTests" test
```

Không ghi mật khẩu thật vào tài liệu hoặc source.

---

## 5. Hải Yến – Question Management Backend

### 5.1. Mục tiêu

Hiện thực vertical slice cho teacher thêm và xem câu hỏi/lựa chọn bằng dữ liệu PostgreSQL thật:

```text
Authenticated Teacher
        ↓
CREATE_QUESTION / GET_EXAM_QUESTIONS
        ↓
QuestionManagementMessageHandler
        ↓
QuestionManagementService
        ↓
QuestionRepository
        ↓
PostgreSQL questions + choices
```

Sau nhiệm vụ này, leader phải có thể thay `MOCK_EDITOR_QUESTIONS` trong React `QuestionManagementPage` bằng dữ liệu backend.

### 5.2. Phạm vi message

| Client → Server | Server → Client | Chức năng |
| --- | --- | --- |
| `CREATE_QUESTION` | `QUESTION_CREATED` | Tạo question và toàn bộ choices trong một transaction |
| `GET_EXAM_QUESTIONS` | `EXAM_QUESTIONS` | Lấy questions/choices của exam thuộc teacher hiện tại |

Không làm trong nhiệm vụ này:

- `UPDATE_QUESTION`.
- `DELETE_QUESTION`.
- Question bank/import file.
- Student question DTO.
- Randomization.
- Save answer hoặc grading.
- Exam attempt/session.

### 5.3. Contract `CREATE_QUESTION`

Request:

```json
{
  "requestId": "uuid",
  "type": "CREATE_QUESTION",
  "payload": {
    "examId": 1,
    "content": "Which keyword is used to inherit a class in Java?",
    "points": 2,
    "displayOrder": 0,
    "choices": [
      {
        "content": "extends",
        "correct": true,
        "displayOrder": 0
      },
      {
        "content": "implements",
        "correct": false,
        "displayOrder": 1
      },
      {
        "content": "inherits",
        "correct": false,
        "displayOrder": 2
      },
      {
        "content": "super",
        "correct": false,
        "displayOrder": 3
      }
    ]
  }
}
```

Response dành cho teacher:

```json
{
  "requestId": "uuid",
  "type": "QUESTION_CREATED",
  "data": {
    "id": 100,
    "examId": 1,
    "content": "Which keyword is used to inherit a class in Java?",
    "points": 2,
    "displayOrder": 0,
    "choices": [
      {
        "id": 1001,
        "content": "extends",
        "correct": true,
        "displayOrder": 0
      },
      {
        "id": 1002,
        "content": "implements",
        "correct": false,
        "displayOrder": 1
      }
    ]
  },
  "error": null
}
```

Teacher response có thể chứa `correct` để phục vụ chỉnh sửa đề. Không được tái sử dụng DTO này cho Student Exam Room.

### 5.4. Contract `GET_EXAM_QUESTIONS`

Request:

```json
{
  "requestId": "uuid",
  "type": "GET_EXAM_QUESTIONS",
  "payload": {
    "examId": 1
  }
}
```

Response:

```json
{
  "requestId": "uuid",
  "type": "EXAM_QUESTIONS",
  "data": {
    "examId": 1,
    "questions": [
      {
        "id": 100,
        "content": "Which keyword is used to inherit a class in Java?",
        "points": 2,
        "displayOrder": 0,
        "choices": []
      }
    ]
  },
  "error": null
}
```

Questions và choices phải được sắp xếp theo `display_order` để response ổn định.

### 5.5. File Hải Yến được tạo

Cấu trúc gợi ý:

```text
server/src/main/java/vn/edu/hanu/exam/
├── exception/
│   └── QuestionManagementException.java
├── repository/
│   ├── QuestionRepository.java
│   └── JdbcQuestionRepository.java
├── service/question/
│   ├── CreateChoiceCommand.java
│   ├── CreateQuestionCommand.java
│   ├── QuestionDetails.java
│   ├── TeacherChoiceDetails.java
│   └── QuestionManagementService.java
└── websocket/
    ├── dto/
    │   ├── CreateChoicePayload.java
    │   ├── CreateQuestionPayload.java
    │   └── GetExamQuestionsPayload.java
    └── handler/
        └── QuestionManagementMessageHandler.java
```

Test:

```text
server/src/test/java/vn/edu/hanu/exam/
├── QuestionManagementServiceIntegrationTests.java
└── websocket/handler/
    └── QuestionManagementMessageHandlerTests.java
```

### 5.6. Transaction bắt buộc

Tạo question và choices phải nằm trong cùng transaction:

```java
@Transactional
public QuestionDetails createQuestion(
        long teacherId,
        CreateQuestionCommand command
) {
    // Validate ownership và exam status.
    // Insert question.
    // Insert toàn bộ choices.
    // Trả QuestionDetails.
}
```

Nếu insert một choice thất bại thì question và mọi choice đã insert trước đó phải rollback. Không được để database có question thiếu choices.

### 5.7. Authorization và ownership

Trước khi tạo hoặc đọc question, service/repository phải xác minh:

```sql
SELECT id, status
FROM exams
WHERE id = :examId
  AND created_by = :teacherId
```

Quy tắc:

- Không có kết quả thì trả `EXAM_NOT_FOUND`.
- Chỉ exam `DRAFT` được thêm question.
- Exam `PUBLISHED` hoặc `CLOSED` trả `EXAM_NOT_EDITABLE`.
- Không tiết lộ exam thuộc teacher khác.

### 5.8. Validation bắt buộc

- Session phải authenticated.
- User phải có role `TEACHER`.
- `examId` phải hợp lệ.
- Exam phải thuộc teacher hiện tại.
- Exam phải có trạng thái `DRAFT` khi tạo question.
- Question `content` không null/blank.
- `points > 0`.
- `displayOrder >= 0`.
- Có ít nhất hai choices.
- Choice content không null/blank.
- Choice display order không âm.
- Chính xác một choice có `correct = true`.

Ví dụ kiểm tra số đáp án đúng:

```java
long correctChoiceCount = command.choices().stream()
        .filter(CreateChoiceCommand::correct)
        .count();

if (correctChoiceCount != 1) {
    throw new QuestionManagementException(
            "INVALID_CORRECT_CHOICE_COUNT",
            "A question must have exactly one correct choice."
    );
}
```

Error code đề xuất:

```text
AUTHENTICATION_REQUIRED
FORBIDDEN
EXAM_NOT_FOUND
EXAM_NOT_EDITABLE
INVALID_QUESTION_CONTENT
INVALID_QUESTION_POINTS
INVALID_DISPLAY_ORDER
TOO_FEW_CHOICES
INVALID_CHOICE_CONTENT
INVALID_CORRECT_CHOICE_COUNT
DATABASE_ERROR
```

Nếu muốn thêm hoặc đổi error code, Hải Yến phải báo leader để đồng bộ React client.

### 5.9. Bảo mật Choice DTO

Domain record `Choice` có trường `correct`, là dữ liệu nhạy cảm khi Student làm bài.

Quy tắc:

- Teacher DTO được phép có `correct`.
- Student DTO sau này phải là class/record riêng và không chứa `correct`.
- Không serialize trực tiếp domain `Choice` cho Student.
- Không tạo một DTO dùng chung cho cả Teacher Question Management và Student Exam Room.

### 5.10. Test bắt buộc

`QuestionManagementServiceIntegrationTests` tối thiểu phải kiểm tra:

1. Tạo question và choices hợp lệ.
2. `question_id` của choices đúng.
3. Question blank bị từ chối.
4. Points bằng `0` hoặc âm bị từ chối.
5. Ít hơn hai choices bị từ chối.
6. Không có correct choice bị từ chối.
7. Có nhiều hơn một correct choice bị từ chối.
8. Teacher không được tạo question cho exam của teacher khác.
9. Không được thêm question khi exam là `PUBLISHED` hoặc `CLOSED`.
10. Insert choice lỗi làm rollback cả question và choices.
11. Danh sách trả questions/choices đúng `display_order`.

`QuestionManagementMessageHandlerTests` tối thiểu phải kiểm tra:

1. Payload đúng trả `QUESTION_CREATED`.
2. Payload thiếu `examId` trả `ERROR`.
3. Payload choices sai trả error code đúng.
4. Session chưa đăng nhập trả `AUTHENTICATION_REQUIRED`.
5. Student gọi command dành cho teacher trả `FORBIDDEN`.
6. Response giữ nguyên `requestId` của request.

### 5.11. Điều kiện nghiệm thu

Hải Yến chỉ báo hoàn thành khi:

- [ ] Question và choices được lưu thật trong PostgreSQL.
- [ ] Insert question/choices chạy trong một transaction.
- [ ] Chỉ teacher sở hữu exam `DRAFT` được thêm question.
- [ ] Có ít nhất hai choices và chính xác một đáp án đúng.
- [ ] Không serialize domain `Choice` cho Student.
- [ ] Test ownership và transaction rollback pass.
- [ ] Có integration test và handler test.
- [ ] Test riêng chạy thành công.
- [ ] Không sửa file trung tâm thuộc leader.
- [ ] Không mở rộng sang update/delete/randomization/attempt/grading.

Lệnh test riêng trong PowerShell:

```powershell
cd server
$env:DB_PASSWORD = '<database-password>'
mvn "-Dtest=QuestionManagementServiceIntegrationTests,QuestionManagementMessageHandlerTests" test
```

Không ghi mật khẩu thật vào tài liệu hoặc source.

---

## 6. Phần leader chịu trách nhiệm

Leader không giao hai thành viên tự tích hợp vào file trung tâm để tránh conflict. Sau khi review và merge, leader thực hiện:

### 6.1. Thêm message type phía Java

Các type dự kiến:

```text
CREATE_EXAM
EXAM_CREATED
GET_TEACHER_EXAMS
TEACHER_EXAMS
GET_EXAM
EXAM_DETAILS

CREATE_QUESTION
QUESTION_CREATED
GET_EXAM_QUESTIONS
EXAM_QUESTIONS
```

Leader phải đặt `acceptedFromClient` đúng:

- Command client gửi: `true`.
- Response server gửi: `false`.

### 6.2. Nối `ExamWebSocketHandler`

Pseudo-code tích hợp:

```java
case CREATE_EXAM ->
        examManagementMessageHandler.handleCreate(session, clientMessage);

case GET_TEACHER_EXAMS ->
        examManagementMessageHandler.handleList(session, clientMessage);

case GET_EXAM ->
        examManagementMessageHandler.handleGet(session, clientMessage);

case CREATE_QUESTION ->
        questionManagementMessageHandler.handleCreate(session, clientMessage);

case GET_EXAM_QUESTIONS ->
        questionManagementMessageHandler.handleList(session, clientMessage);
```

Tên method cuối cùng phụ thuộc implementation đã review, nhưng không được đưa toàn bộ business logic vào `ExamWebSocketHandler`.

### 6.3. Đồng bộ React protocol

Leader thêm các message type tương ứng vào:

```text
client/src/websocket/protocol.ts
```

Sau đó nối frontend theo thứ tự:

1. `CreateExamPage` gửi `CREATE_EXAM`.
2. `ExamManagementPage` gửi `GET_TEACHER_EXAMS`.
3. `ExamOverviewPage` gửi `GET_EXAM`.
4. `QuestionManagementPage` gửi `GET_EXAM_QUESTIONS` và `CREATE_QUESTION`.
5. Chỉ xóa mock ở từng trang sau khi flow server thật hoạt động và xử lý loading/error/empty state đầy đủ.

### 6.4. Full test sau merge

```powershell
cd server
$env:DB_PASSWORD = '<database-password>'
mvn test
```

Sau đó kiểm tra client:

```powershell
cd ..\client
npm.cmd run lint
npm.cmd run build
```

Từ repository root:

```powershell
git diff --check
```

---

## 7. Quy trình làm việc và bàn giao

### 7.1. Trước khi code

Mỗi thành viên phải:

1. Đọc `README.md` phần architecture, protocol, database và current status.
2. Đọc `schema.sql` và domain record hiện tại.
3. Đọc `AuthenticatedSessionRegistry` và cách `ExamWebSocketHandler` xử lý login/error.
4. Xác nhận lại payload/response/error code với leader trước khi tạo DTO.
5. Không tự mở rộng scope.

### 7.2. Trong khi code

- Commit theo từng phần nhỏ: repository, service, handler, test.
- Không trộn format/refactor file không liên quan.
- Nếu cần thay file leader-owned, dừng và báo leader.
- Nếu contract cần đổi, cập nhật leader trước khi frontend dựa vào contract cũ.
- Không bỏ qua authorization chỉ để test chức năng nhanh.

### 7.3. Khi bàn giao

Mỗi thành viên gửi cho leader:

1. Tên branch.
2. Danh sách file đã tạo/sửa.
3. Message contract cuối cùng.
4. Error code cuối cùng.
5. Lệnh test đã chạy.
6. Output `BUILD SUCCESS` của test riêng.
7. Các giới hạn/chưa làm.
8. Hướng dẫn test thủ công nếu có.

Không chỉ nhắn “xong rồi” mà không có bằng chứng test.

---

## 8. Lịch triển khai đề xuất

### Ngày 1

Phanh:

- Chốt `ExamRepository` contract.
- Viết test create/list/get.
- Hiện thực `JdbcExamRepository`.

Hải Yến:

- Chốt nested DTO/command cho question và choices.
- Viết validation test.
- Hiện thực repository transaction cơ bản.

### Ngày 2

Phanh:

- Hiện thực `ExamManagementService`.
- Thêm ownership/role validation.
- Hoàn thiện integration test.

Hải Yến:

- Hiện thực `QuestionManagementService`.
- Thêm ownership/exam-status validation.
- Hoàn thiện rollback test.

### Ngày 3

Cả hai:

- Hoàn thiện message handler riêng.
- Hoàn thiện handler unit test.
- Chạy test riêng.
- Tự review và bàn giao branch.

Leader:

- Review Phanh trước và merge Exam Management.
- Chạy full server test.
- Review Hải Yến và merge Question Management.
- Chạy full server test lần nữa.
- Tích hợp protocol/dispatcher/frontend.

---

## 9. Definition of Done chung

Một nhiệm vụ chỉ được coi là hoàn thành nếu đáp ứng tất cả điều kiện liên quan:

- [ ] Code compile.
- [ ] Test được viết và chạy thành công.
- [ ] Có `BUILD SUCCESS`.
- [ ] Không hard-code database password.
- [ ] Không tin teacher ID/role từ payload.
- [ ] Có authentication và authorization.
- [ ] Có ownership check.
- [ ] Không trả stack trace/SQL/internal exception cho client.
- [ ] Response giữ nguyên request ID.
- [ ] Không sửa file ngoài scope nếu chưa báo leader.
- [ ] Không làm hỏng các test auth/registration/protocol hiện có.
- [ ] `git diff --check` không báo lỗi whitespace.
- [ ] Leader review và chấp nhận contract.

---

## 10. Phần chưa giao trong giai đoạn này

Các phần dưới đây vẫn do leader giữ hoặc sẽ phân công ở giai đoạn sau:

- Exam update/publish/close/delete.
- Question update/delete và question bank.
- Student assigned-exam query.
- Exam attempt/session.
- Question/choice randomization theo attempt.
- Server-authoritative deadline.
- Auto-save answer.
- Reconnect và exam recovery.
- Idempotent submit/finalization.
- Grading/result/leaderboard.
- Real-time monitoring.
- Suspicious-activity/anti-cheating rules.
- Concurrency test và load test.

Không tự triển khai các phần này trong branch hiện tại vì sẽ làm tăng conflict, thay đổi contract chưa chốt và vượt quá giới hạn nhiệm vụ.
