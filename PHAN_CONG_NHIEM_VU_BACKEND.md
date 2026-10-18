# Phân công nhiệm vụ backend

## Online Examination System

Tài liệu này phân công bốn nhiệm vụ backend có giới hạn cho **Phanh, Linh, Hải Yến và Hoàng Yến**. Mỗi người sở hữu một khu vực code riêng, có đầu ra và tiêu chí kiểm tra cụ thể. Leader chịu trách nhiệm chốt contract, review, tích hợp và xử lý các phần concurrency quan trọng.

Ngày cập nhật: `18/10/2026`.

## 1. Tổng quan phân công

| Thành viên | Nhiệm vụ | Đầu ra chính | Branch |
| --- | --- | --- | --- |
| Phanh | Login service | Service xác thực và integration test | `feature/login-service` |
| Linh | WebSocket registration | Handler `REGISTER` và unit test | `feature/websocket-registration` |
| Hải Yến | WebSocket error handling | Error envelope, xử lý JSON lỗi và regression test | `fix/websocket-error-handling` |
| Hoàng Yến | Exam database foundation | Schema và domain model cho exam, question, choice | `feature/exam-schema` |

## 2. Quy tắc làm việc chung

- Chỉ sửa file thuộc phạm vi được giao. Nếu cần sửa file của người khác, phải báo leader trước.
- Không commit mật khẩu, file `.env`, database dump, thư mục `target`, log chứa secret hoặc dữ liệu nhạy cảm.
- Không tự refactor toàn bộ module hoặc thêm framework/dependency mới khi chưa được leader duyệt.
- Không đổi WebSocket contract dùng chung khi chưa thống nhất với leader.
- Trước khi tạo pull request, phải chạy test liên quan và ghi rõ lệnh đã chạy cùng kết quả thực tế.
- Pull request phải có danh sách file thay đổi, mô tả flow, giới hạn còn lại và log test nếu cần.
- Mọi response gửi client không được chứa password, password hash, stack trace hoặc đáp án đúng.
- Không ghi `catch` rỗng và không nuốt exception mà không log hoặc xử lý.
- Thành viên phải có khả năng tự giải thích các class, method, SQL và test do mình viết.

---

## 3. Phanh làm Login Service

### 3.1. Mục tiêu

Xây dựng logic đăng nhập ở tầng service bằng `UserRepository` và `PasswordEncoder`. Nhiệm vụ chỉ xử lý xác thực username/password; chưa làm WebSocket, token hoặc session.

Branch:

```text
feature/login-service
```

### 3.2. File ownership

Phanh được tạo các file sau:

```text
server/src/main/java/vn/edu/hanu/exam/service/LoginCommand.java
server/src/main/java/vn/edu/hanu/exam/service/LoggedInUser.java
server/src/main/java/vn/edu/hanu/exam/service/LoginService.java
server/src/main/java/vn/edu/hanu/exam/exception/AuthenticationException.java
server/src/test/java/vn/edu/hanu/exam/LoginServiceIntegrationTests.java
```

Nếu cần sửa file ngoài danh sách trên, phải báo leader trước.

### 3.3. Yêu cầu thực hiện

1. Tạo `LoginCommand` nhận `username` và `password`.
2. Validate command, username và password; không chấp nhận giá trị `null` hoặc rỗng.
3. Chuẩn hóa username bằng `trim()` và lowercase với `Locale.ROOT`.
4. Tìm user bằng `UserRepository.findByUsername(...)`.
5. Kiểm tra mật khẩu bằng `PasswordEncoder.matches(rawPassword, passwordHash)`.
6. Không được so sánh raw password với password hash bằng `equals()`.
7. Username không tồn tại và mật khẩu sai phải cùng trả:

```text
Code: INVALID_CREDENTIALS
Message: Invalid username or password.
```

8. Từ chối tài khoản có `active == false` bằng mã `ACCOUNT_DISABLED`.
9. Tạo `LoggedInUser` chỉ chứa:

```text
id
username
fullName
email
role
```

10. Không đưa `password` hoặc `passwordHash` vào `LoggedInUser`.

### 3.4. Kiểm thử tối thiểu

- Username và password đúng thì đăng nhập thành công.
- Password sai thì trả `INVALID_CREDENTIALS`.
- Username không tồn tại thì trả `INVALID_CREDENTIALS`.
- Tài khoản bị vô hiệu hóa thì trả `ACCOUNT_DISABLED`.
- Kết quả đăng nhập không chứa password hash.

### 3.5. Ngoài phạm vi

Phanh không làm các phần sau trong nhiệm vụ này:

- WebSocket `LOGIN`.
- Token, JWT hoặc persistent session.
- Logout.
- Authorization cho exam.
- React client.
- Sửa `RegistrationService`.
- Sửa schema exam.

### 3.6. Tiêu chí nghiệm thu

- [ ] `LoginService` dùng `UserRepository` abstraction.
- [ ] Mật khẩu được kiểm tra bằng `PasswordEncoder.matches()`.
- [ ] Không làm lộ password hoặc password hash.
- [ ] Error code đúng và không làm lộ username có tồn tại hay không.
- [ ] Integration test chạy thành công với đúng `DB_PASSWORD`.
- [ ] Pull request có giải thích ngắn flow đăng nhập.

---

## 4. Linh làm WebSocket Registration

### 4.1. Mục tiêu

Nối message `REGISTER` với `RegistrationService` hiện có. Linh không viết lại validation, BCrypt hoặc logic lưu database.

Flow cần đạt được:

```text
Client REGISTER
    -> RegistrationMessageHandler
    -> RegistrationService
    -> UserRepository
    -> PostgreSQL
    -> REGISTERED hoặc ERROR
```

Branch:

```text
feature/websocket-registration
```

### 4.2. File ownership

Linh được tạo các file sau:

```text
server/src/main/java/vn/edu/hanu/exam/websocket/dto/RegisterPayload.java
server/src/main/java/vn/edu/hanu/exam/websocket/handler/RegistrationMessageHandler.java
server/src/test/java/vn/edu/hanu/exam/websocket/handler/RegistrationMessageHandlerTests.java
```

Nếu cần thêm `REGISTER` hoặc `REGISTERED` vào `MessageType.java`, phải báo leader trước. Linh không tự sửa switch chính trong `ExamWebSocketHandler`; leader sẽ thực hiện bước tích hợp sau khi merge.

### 4.3. Contract dự kiến

Client gửi:

```json
{
  "requestId": "register-001",
  "type": "REGISTER",
  "payload": {
    "username": "student01",
    "password": "StrongPassword_123!",
    "fullName": "Student One",
    "email": "student01@example.com"
  }
}
```

Server trả thành công:

```json
{
  "requestId": "register-001",
  "type": "REGISTERED",
  "data": {
    "id": 1,
    "username": "student01",
    "fullName": "Student One",
    "email": "student01@example.com",
    "role": "STUDENT",
    "active": true,
    "createdAt": "2026-10-18T16:00:00+07:00"
  },
  "error": null
}
```

Server trả lỗi:

```json
{
  "requestId": "register-001",
  "type": "ERROR",
  "data": null,
  "error": {
    "code": "USERNAME_ALREADY_EXISTS",
    "message": "Username already exists."
  }
}
```

### 4.4. Yêu cầu thực hiện

1. Tạo `RegisterPayload` gồm `username`, `password`, `fullName` và `email`.
2. Chuyển payload thành `RegisterUserCommand`.
3. Gọi `RegistrationService.registerStudent(...)`.
4. Khi thành công, trả `ServerMessage` type `REGISTERED` và data là `RegisteredUser`.
5. Khi nhận `RegistrationException`, chuyển thành `ServerMessage.error(...)`.
6. Giữ nguyên `requestId` trong response.
7. Response không được chứa raw password hoặc password hash.
8. Tách `RegistrationMessageHandler` thành class riêng để giảm logic trong `ExamWebSocketHandler`.

### 4.5. Kiểm thử tối thiểu

- Payload hợp lệ trả `REGISTERED`.
- Username trùng trả `USERNAME_ALREADY_EXISTS`.
- Email trùng trả `EMAIL_ALREADY_EXISTS`.
- Payload thiếu dữ liệu trả `ERROR` phù hợp.
- Response thành công không chứa password hoặc password hash.

Có thể mock `RegistrationService` trong unit test để test chỉ tập trung vào việc chuyển đổi message.

### 4.6. Ngoài phạm vi

Linh không làm các phần sau trong nhiệm vụ này:

- Không sửa validation trong `RegistrationService`.
- Không sửa SQL trong `JdbcUserRepository`.
- Không tự refactor `ExamWebSocketHandler`.
- Không làm login, token hoặc session.
- Không làm React client.
- Không làm schema exam.

### 4.7. Tiêu chí nghiệm thu

- [ ] Mapping payload sang `RegisterUserCommand` đúng.
- [ ] Thành công trả `REGISTERED`.
- [ ] `RegistrationException` được chuyển thành `ERROR` đúng code.
- [ ] Không làm lộ dữ liệu mật khẩu.
- [ ] Unit test của handler chạy thành công.
- [ ] Pull request không tự thay đổi handler trung tâm khi chưa được leader duyệt.

---

## 5. Hải Yến làm WebSocket Error Handling

### 5.1. Mục tiêu

Làm WebSocket server trả lỗi nhất quán và không im lặng khi JSON hoặc message type không hợp lệ. Phần `CONNECTED`, `PING` và `PONG` hiện có phải tiếp tục hoạt động.

Branch:

```text
fix/websocket-error-handling
```

### 5.2. File ownership

Hải Yến được sửa hoặc tạo các file sau:

```text
server/src/main/java/vn/edu/hanu/exam/protocol/ServerMessage.java
server/src/main/java/vn/edu/hanu/exam/websocket/ExamWebSocketHandler.java
server/src/test/java/vn/edu/hanu/exam/websocket/WebSocketErrorHandlingTests.java
```

### 5.3. Yêu cầu thực hiện

1. Đổi error message type từ `Error` thành `ERROR`.
2. Ưu tiên dùng `MessageType.ERROR.name()` thay cho hard-code string.
3. Message không có `type` hoặc `type` rỗng phải trả:

```text
MISSING_MESSAGE_TYPE
```

4. Message type chưa hỗ trợ phải trả:

```text
UNSUPPORTED_MESSAGE_TYPE
```

5. JSON không hợp lệ phải trả:

```text
INVALID_JSON
```

6. Thay `catch` rỗng bằng logging an toàn.
7. Không gửi stack trace hoặc nội dung exception nội bộ cho client.
8. JSON lỗi không được làm chết server hoặc ảnh hưởng các WebSocket session khác.
9. Giữ nguyên hành vi của `CONNECTED`, `PING` và `PONG`.

Error envelope thống nhất:

```json
{
  "requestId": "request-001",
  "type": "ERROR",
  "data": null,
  "error": {
    "code": "UNSUPPORTED_MESSAGE_TYPE",
    "message": "The message type is not supported."
  }
}
```

### 5.4. Kiểm thử tối thiểu

- JSON không hợp lệ trả `INVALID_JSON`.
- Type `null` trả `MISSING_MESSAGE_TYPE`.
- Type rỗng trả `MISSING_MESSAGE_TYPE`.
- Type không hỗ trợ trả `UNSUPPORTED_MESSAGE_TYPE`.
- `PING` hợp lệ vẫn trả `PONG` với cùng `requestId`.

### 5.5. Phối hợp với Linh

- Hải Yến sở hữu việc sửa `ExamWebSocketHandler` trong giai đoạn này.
- Linh tạo `RegistrationMessageHandler` riêng và không tự sửa handler trung tâm.
- Sau khi hai nhánh được merge, leader sẽ nối `REGISTER` vào switch của `ExamWebSocketHandler`.

### 5.6. Ngoài phạm vi

Hải Yến không làm các phần sau trong nhiệm vụ này:

- Registration logic.
- Login logic.
- Database schema.
- Token hoặc session.
- Reconnect.
- Exam message.
- Anti-cheating.
- Refactor toàn bộ protocol.

### 5.7. Tiêu chí nghiệm thu

- [ ] Không còn `catch` rỗng.
- [ ] Mọi error response dùng type `ERROR`.
- [ ] Error có code và message rõ ràng.
- [ ] Client input sai không làm chết server.
- [ ] Không gửi stack trace cho client.
- [ ] Regression test `PING` và `PONG` chạy thành công.

---

## 6. Hoàng Yến làm Exam Database Foundation

### 6.1. Mục tiêu

Tạo nền tảng database và domain model cho đề thi trắc nghiệm trước khi xây repository và service. Phạm vi chỉ gồm `exams`, `questions` và `choices`.

Branch:

```text
feature/exam-schema
```

### 6.2. File ownership

Hoàng Yến được sửa hoặc tạo các file sau:

```text
server/src/main/resources/schema.sql
server/src/main/java/vn/edu/hanu/exam/domain/Exam.java
server/src/main/java/vn/edu/hanu/exam/domain/ExamStatus.java
server/src/main/java/vn/edu/hanu/exam/domain/Question.java
server/src/main/java/vn/edu/hanu/exam/domain/Choice.java
server/src/test/java/vn/edu/hanu/exam/ExamSchemaIntegrationTests.java
```

### 6.3. Bảng exams

Các cột tối thiểu:

```text
id
title
description
duration_minutes
status
created_by
created_at
updated_at
```

Yêu cầu:

- `created_by` tham chiếu `users(id)`.
- `title` không được null hoặc rỗng.
- `duration_minutes > 0`.
- `status` chỉ nhận `DRAFT`, `PUBLISHED` hoặc `CLOSED`.
- Có index cho `created_by`.

### 6.4. Bảng questions

Các cột tối thiểu:

```text
id
exam_id
content
points
display_order
created_at
updated_at
```

Yêu cầu:

- `exam_id` tham chiếu `exams(id)`.
- `content` không được null hoặc rỗng.
- `points > 0`.
- `display_order >= 0`.
- Có index cho `exam_id`.

### 6.5. Bảng choices

Các cột tối thiểu:

```text
id
question_id
content
correct
display_order
```

Yêu cầu:

- `question_id` tham chiếu `questions(id)`.
- `content` không được null hoặc rỗng.
- `correct` là boolean và mặc định `FALSE` nếu cần.
- `display_order >= 0`.
- Có index cho `question_id`.

### 6.6. Domain model

Tạo các model:

- `ExamStatus`: `DRAFT`, `PUBLISHED`, `CLOSED`.
- `Exam`: ánh xạ thông tin trong bảng `exams`.
- `Question`: ánh xạ thông tin trong bảng `questions`.
- `Choice`: ánh xạ thông tin trong bảng `choices`.

Trường `correct` chỉ được sử dụng phía server. Sau này không được trả trực tiếp `Choice` chứa `correct` cho student client.

### 6.7. Yêu cầu schema

- Có primary key cho cả ba bảng.
- Có foreign key đúng quan hệ.
- Có `NOT NULL` và check constraint trong phạm vi.
- Có index cho các foreign key.
- Dùng `CREATE TABLE IF NOT EXISTS` và `CREATE INDEX IF NOT EXISTS`.
- Schema phải chạy lại được khi Spring Boot khởi động.
- Kiểu dữ liệu Java phải khớp kiểu dữ liệu PostgreSQL.

### 6.8. Kiểm thử tối thiểu

- Insert một teacher vào bảng `users`.
- Insert một exam thuộc teacher.
- Insert một question thuộc exam.
- Insert các choice thuộc question.
- Foreign key `exams.created_by` hoạt động.
- Foreign key `questions.exam_id` hoạt động.
- Foreign key `choices.question_id` hoạt động.
- `duration_minutes <= 0` bị từ chối.
- `points <= 0` bị từ chối.
- Test sử dụng `@Transactional` để rollback dữ liệu.

### 6.9. Ngoài phạm vi

Hoàng Yến không làm các phần sau trong nhiệm vụ này:

- Repository CRUD cho exam/question/choice.
- Exam service.
- WebSocket exam handler.
- `exam_attempts`.
- `student_answers`.
- Grading.
- Deadline scheduler.
- Randomization.
- Auto-save.
- React client.

### 6.10. Tiêu chí nghiệm thu

- [ ] Có ba bảng `exams`, `questions`, `choices`.
- [ ] Có primary key, foreign key, constraint và index trong phạm vi.
- [ ] Schema có thể chạy lại an toàn.
- [ ] Domain model khớp schema.
- [ ] Không làm lộ đáp án đúng cho student client.
- [ ] Integration test schema chạy thành công.

---

## 7. Trách nhiệm của leader

Leader giữ quyền quyết định các contract dùng chung và chịu trách nhiệm chạy test toàn hệ thống sau khi merge.

Các phần leader giữ:

- Chốt message contract `REGISTER`, `REGISTERED`, `LOGIN`, `LOGGED_IN` và `ERROR`.
- Nối `RegistrationMessageHandler` của Linh vào `ExamWebSocketHandler` sau khi merge phần Hải Yến.
- Nối `LoginService` của Phanh vào WebSocket `LOGIN` trong bước tiếp theo.
- Review schema của Hoàng Yến.
- Bảo đảm server không làm lộ password hash hoặc đáp án đúng.
- Resolve conflict giữa các branch.
- Chạy toàn bộ test sau khi merge.
- Cập nhật README theo trạng thái thực tế.
- Giữ các phần trọng tâm Topic 4 gồm `ExamAttempt`, deadline scheduler, submit race condition, auto-save, recovery, shared state và anti-cheating.

## 8. Thứ tự merge đề xuất

1. Merge Hải Yến: WebSocket error handling.
2. Merge Phanh: Login service.
3. Merge Hoàng Yến: Exam schema và domain.
4. Merge Linh: Registration message handler.
5. Leader nối handler vào luồng chung và chạy regression test.

## 9. Checklist pull request

Mỗi thành viên phải tự kiểm tra các mục sau trước khi gửi pull request:

- [ ] Code chỉ nằm trong phạm vi được giao.
- [ ] Không sửa file thuộc ownership của người khác khi chưa được duyệt.
- [ ] Danh sách file tạo mới và file sửa đổi đã được ghi rõ.
- [ ] Flow chính được giải thích bằng ngôn ngữ của người viết.
- [ ] Code compile thành công.
- [ ] Test trong phạm vi chạy thành công.
- [ ] Lệnh test và kết quả thực tế được ghi trong pull request.
- [ ] Không còn debug code, `catch` rỗng hoặc dead code đã biết.
- [ ] Không commit password, `.env`, database dump, log nhạy cảm hoặc build output.
- [ ] Không trả password, password hash, stack trace hoặc đáp án đúng cho client.
- [ ] Những giới hạn hoặc việc chưa làm đã được ghi rõ.

## 10. Quy tắc nghiệm thu chung

Một nhiệm vụ chỉ được xem là hoàn thành khi:

1. Code compile thành công.
2. Test trong phạm vi chạy thành công.
3. Pull request không vượt quá ownership được giao.
4. Không làm hỏng các chức năng đã có.
5. Thành viên có thể tự giải thích code và cách test.
6. Leader đã review và chấp nhận pull request.

