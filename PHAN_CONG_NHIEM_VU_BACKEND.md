# Phân công triển khai — Milestone Exam Flow & Anti-cheating

## 1. Mục tiêu milestone

Hoàn thiện các luồng có giá trị nhất cho Online Examination System theo kiến trúc **React + WebSocket + Spring Boot + PostgreSQL**:

```text
Teacher tạo đề → thêm câu hỏi → publish
                              ↓
Student xem đề → bắt đầu/tiếp tục attempt → lưu đáp án → nộp bài
                              ↓
Teacher theo dõi tiến độ và suspicious activity theo thời gian thực
```

Phân công dưới đây được thiết kế để làm song song, giảm sửa cùng một file và ưu tiên hai phần quan trọng nhất cho **Phanh** và **Hoàng Yến**.

| Thành viên | Feature phụ trách | Mức ưu tiên |
| --- | --- | --- |
| Phanh | Exam Attempt Core, randomization và recovery | Rất cao |
| Hoàng Yến | Real-time monitoring và anti-cheating foundation | Rất cao |
| Linh | Question Management end-to-end: update/delete | Cao |
| Hải Yến | Teacher Exam Lifecycle UI: update/publish/close/delete | Cao |
| Leader | Review, tích hợp protocol/router/schema, Student Catalog UI và quality gate | Rất cao |

## 2. Quy tắc làm việc chung

1. Server là nguồn quyết định duy nhất về identity, role, ownership, deadline, trạng thái attempt và điểm số. Client không được tự quyết các dữ liệu này.
2. Không nhận `teacherId`, `studentId`, role hoặc status từ client để phân quyền. Mọi authorization lấy từ `AuthenticatedSessionRegistry`.
3. SQL phải parameterized; không nối input người dùng trực tiếp vào SQL string.
4. Không trả về password, password hash, stack trace, SQL error, session ID hoặc đáp án đúng cho student.
5. Handler không viết SQL trực tiếp; repository không phụ thuộc vào WebSocket DTO.
6. Một thao tác thay đổi nhiều bảng phải chạy trong transaction; lỗi giữa chừng phải rollback.
7. Response phải giữ đúng `requestId` của request.
8. Không commit mật khẩu database. Chạy test dùng biến môi trường `DB_PASSWORD`.
9. Mỗi Pull Request phải có: phạm vi thay đổi, request/response mẫu, danh sách test và kết quả test.
10. Không tự sửa các file central sau nếu chưa báo leader:

```text
server/src/main/java/vn/edu/hanu/exam/protocol/MessageType.java
server/src/main/java/vn/edu/hanu/exam/websocket/ExamWebSocketHandler.java
client/src/websocket/protocol.ts
server/src/main/resources/schema.sql
```

Người thực hiện ghi rõ phần bổ sung cần tích hợp vào PR; leader review và tích hợp các file central để tránh conflict.

## 3. Nhiệm vụ của Phanh — Exam Attempt Core, randomization và recovery

### 3.1. Mục tiêu

Xây dựng phần lõi của một lượt thi thật. Student có thể bắt đầu hoặc tiếp tục attempt; server tạo deadline, random question/choice và giữ nguyên biến thể đề sau reconnect.

### 3.2. Phạm vi cần làm

- Thiết kế schema cho các bảng cần thiết:
  - `exam_attempts`
  - `attempt_questions`
  - `attempt_choices`
  - có thể thêm `attempt_answers` nếu cần cho recovery cơ bản.
- Tạo domain model, repository Spring JDBC và service cho exam attempt.
- Thêm command/response đề xuất:

```text
START_EXAM -> EXAM_STARTED
GET_EXAM_ATTEMPT -> EXAM_ATTEMPT_DETAILS
```

- Khi nhận `START_EXAM`, server phải:
  - xác thực session và role `STUDENT`;
  - chỉ cho phép exam `PUBLISHED`;
  - tạo attempt mới hoặc trả lại attempt active của cùng student/exam;
  - tạo `startedAt` và `deadline` ở server;
  - random câu hỏi và choices đúng một lần khi tạo attempt;
  - lưu mapping randomization để reconnect luôn nhận cùng thứ tự;
  - tuyệt đối không trả `correct` cho student.
- Bổ sung test unit/integration và test handler cho luồng trên.

### 3.3. Quy tắc nghiệp vụ bắt buộc

- Một student không có hai attempt `IN_PROGRESS` cho cùng một exam.
- Student A không thể đọc hoặc tiếp tục attempt của student B.
- Không thể bắt đầu exam `DRAFT` hoặc `CLOSED`.
- Client không gửi deadline, score hay thứ tự random để server tin tưởng.
- Randomization phải ổn định trong cùng attempt nhưng có thể khác giữa hai attempt/student khác nhau.

### 3.4. Files dự kiến sở hữu

```text
server/src/main/java/vn/edu/hanu/exam/domain/attempt/**
server/src/main/java/vn/edu/hanu/exam/repository/AttemptRepository.java
server/src/main/java/vn/edu/hanu/exam/repository/JdbcAttemptRepository.java
server/src/main/java/vn/edu/hanu/exam/service/attempt/**
server/src/main/java/vn/edu/hanu/exam/exception/AttemptException.java
server/src/main/java/vn/edu/hanu/exam/websocket/dto/StartExamPayload.java
server/src/main/java/vn/edu/hanu/exam/websocket/dto/GetExamAttemptPayload.java
server/src/main/java/vn/edu/hanu/exam/websocket/handler/AttemptMessageHandler.java
server/src/test/java/**/Attempt*Tests.java
```

Phanh đề xuất phần thay đổi cho `schema.sql`, `MessageType.java` và `ExamWebSocketHandler.java` trong PR; leader sẽ tích hợp sau review.

### 3.5. Test bắt buộc

1. Student start published exam thành công.
2. Draft/closed exam bị từ chối.
3. Start hai lần chỉ tạo một active attempt.
4. Student không đọc được attempt của user khác.
5. Question/choice không chứa đáp án đúng trong response student.
6. Random order ổn định khi lấy lại attempt.
7. Deadline do server tạo và hợp lệ.
8. Session chưa login trả `AUTHENTICATION_REQUIRED`; teacher gọi trả `FORBIDDEN`.

### 3.6. Bàn giao

Branch đề xuất:

```text
feature/phanh-exam-attempt
```

## 4. Nhiệm vụ của Hoàng Yến — Real-time Monitoring & Anti-cheating foundation

### 4.1. Mục tiêu

Xây dựng novelty của đề tài: ghi nhận suspicious activity có rule rõ ràng và cung cấp dữ liệu monitoring cho teacher. Hệ thống chỉ đánh dấu **suspicious**, không được tự kết luận student gian lận.

### 4.2. Phạm vi cần làm

- Thiết kế schema cho:
  - `suspicious_activities`;
  - có thể thêm `attempt_activity_logs` nếu thực sự cần lưu event thô.
- Tạo model, repository, service và handler riêng cho monitoring.
- Xây dựng các rule nền tảng:

```text
TAB_HIDDEN
WINDOW_BLUR
DISCONNECTED
RECONNECTED
MULTIPLE_WARNING_THRESHOLD
```

- Thêm protocol đề xuất:

```text
REPORT_ACTIVITY -> ACTIVITY_RECORDED
GET_EXAM_MONITORING -> EXAM_MONITORING
SUSPICIOUS_ACTIVITY_RECORDED  (server-push event cho teacher, nếu cần)
```

- `REPORT_ACTIVITY` phải kiểm tra student có sở hữu `attemptId` hay không.
- `GET_EXAM_MONITORING` chỉ cho phép teacher sở hữu exam đó.
- Monitoring response nên gồm: student an toàn để hiển thị, attempt status, deadline, warning count, suspicious activity gần nhất.

### 4.3. Phụ thuộc với Phanh

Hoàng Yến và Phanh phải thống nhất trước tên/ý nghĩa tối thiểu của các field:

```text
attemptId
examId
studentId (server-side only)
attempt status
deadline
```

Nếu attempt core chưa merge, Hoàng Yến vẫn có thể làm schema, repository, service rule và unit test trước; phần handler tích hợp sau khi contract attempt đã chốt.

### 4.4. Files dự kiến sở hữu

```text
server/src/main/java/vn/edu/hanu/exam/domain/monitoring/**
server/src/main/java/vn/edu/hanu/exam/repository/MonitoringRepository.java
server/src/main/java/vn/edu/hanu/exam/repository/JdbcMonitoringRepository.java
server/src/main/java/vn/edu/hanu/exam/service/monitoring/**
server/src/main/java/vn/edu/hanu/exam/exception/MonitoringException.java
server/src/main/java/vn/edu/hanu/exam/websocket/dto/ReportActivityPayload.java
server/src/main/java/vn/edu/hanu/exam/websocket/dto/GetExamMonitoringPayload.java
server/src/main/java/vn/edu/hanu/exam/websocket/handler/MonitoringMessageHandler.java
server/src/test/java/**/Monitoring*Tests.java
```

Hoàng Yến ghi rõ phần cần tích hợp vào `schema.sql`, `MessageType.java` và router central trong PR; leader merge phần central.

### 4.5. Test bắt buộc

1. Activity được persist đúng với attempt của student sở hữu.
2. Student không report activity cho attempt người khác.
3. Teacher không xem monitoring của exam teacher khác.
4. Rule threshold tạo suspicious activity đúng số lần warning.
5. `DISCONNECTED`/`RECONNECTED` không làm hỏng attempt đang active.
6. Response không lộ đáp án đúng, password hay dữ liệu nội bộ.

### 4.6. Bàn giao

Branch đề xuất:

```text
feature/hoang-yen-monitoring-anti-cheating
```

## 5. Nhiệm vụ của Linh — Question Management end-to-end

### 5.1. Mục tiêu

Hoàn thiện việc teacher sửa và xóa question trên UI với dữ liệu thật. Backend update/delete đã có nền tảng; nhiệm vụ là bảo đảm protocol, routing, test và React UI hoạt động end-to-end.

### 5.2. Phạm vi cần làm

- Hoàn thiện command/response:

```text
UPDATE_QUESTION -> QUESTION_UPDATED
DELETE_QUESTION -> QUESTION_DELETED
```

- Hoàn thiện DTO `UpdateQuestionPayload`, `DeleteQuestionPayload` và handler.
- Nối command vào central protocol/router thông qua hướng dẫn của leader.
- Cập nhật `QuestionManagementPage`:
  - Edit mở form chứa dữ liệu cũ;
  - validate content, points, choice count và exactly one correct choice;
  - save bằng `UPDATE_QUESTION`;
  - delete phải có confirmation;
  - chỉ reload/update UI sau response success từ server;
  - status không phải `DRAFT` thì không hiển thị thao tác edit/delete.
- Cập nhật TypeScript protocol liên quan và thêm loading/error/success feedback.

### 5.3. Business rules bắt buộc

- Teacher chỉ sửa/xóa question của exam do mình tạo.
- Chỉ question của exam `DRAFT` được sửa/xóa.
- Question phải có 2–6 choices, content không rỗng và đúng một đáp án correct.
- Update replacement choices và delete question/choices phải dùng transaction.

### 5.4. Files dự kiến sở hữu

```text
server/src/main/java/vn/edu/hanu/exam/repository/QuestionRepository.java
server/src/main/java/vn/edu/hanu/exam/repository/JdbcQuestionRepository.java
server/src/main/java/vn/edu/hanu/exam/service/question/**
server/src/main/java/vn/edu/hanu/exam/websocket/dto/UpdateQuestionPayload.java
server/src/main/java/vn/edu/hanu/exam/websocket/dto/DeleteQuestionPayload.java
server/src/main/java/vn/edu/hanu/exam/websocket/handler/QuestionManagementMessageHandler.java
server/src/test/java/**/QuestionManagement*Tests.java
client/src/pages/QuestionManagementPage/**
```

### 5.5. Test bắt buộc

1. Update question hợp lệ thành công.
2. Invalid content/points/choices bị từ chối.
3. Teacher không sửa/xóa question của teacher khác.
4. Published/closed exam không cho sửa/xóa.
5. Delete xóa cả question và choices, rollback khi lỗi.
6. `mvn test`, `npm run lint`, `npm run build` pass.

### 5.6. Bàn giao

Branch đề xuất:

```text
feature/linh-question-management-ui
```

## 6. Nhiệm vụ của Hải Yến — Teacher Exam Lifecycle UI

### 6.1. Mục tiêu

Hoàn thiện giao diện quản lý vòng đời exam để teacher thao tác với backend đã có: update draft, publish, close và delete draft.

### 6.2. Phạm vi cần làm

- Hoàn thiện `ExamManagementPage` và `ExamOverviewPage` cho các command:

```text
GET_EXAM
UPDATE_EXAM -> EXAM_UPDATED
PUBLISH_EXAM -> EXAM_PUBLISHED
CLOSE_EXAM -> EXAM_CLOSED
DELETE_EXAM -> EXAM_DELETED
```

- UI requirements:
  - Edit/Delete chỉ hiện khi status `DRAFT`;
  - Publish chỉ hiện với `DRAFT`;
  - Close chỉ hiện với `PUBLISHED`;
  - Close/Delete có confirmation rõ ràng;
  - response success mới update/reload UI;
  - có loading, disabled state, error/success feedback;
  - giải thích lỗi publish từ server, ví dụ chưa có question hoặc choices không hợp lệ.

### 6.3. Giới hạn phạm vi

- Không sửa business logic backend exam lifecycle nếu không thật sự phát hiện bug.
- Không sửa Question Management hoặc Attempt/Monitoring.
- Không dùng mock/local state làm nguồn dữ liệu sau reload; phải đọc lại từ server.

### 6.4. Files dự kiến sở hữu

```text
client/src/pages/ExamManagementPage/**
client/src/pages/ExamOverviewPage/**
client/src/components/**                 (chỉ component dùng lại cho lifecycle)
client/src/websocket/protocol.ts         (chỉ các kiểu lifecycle còn thiếu)
```

### 6.5. Test/verification bắt buộc

1. Update draft thành công và refresh vẫn đúng dữ liệu PostgreSQL.
2. Publish hợp lệ thành công; publish thiếu readiness hiển thị lỗi server.
3. Close chỉ hoạt động với published exam.
4. Delete chỉ hoạt động với draft exam.
5. Action không hợp lệ không được hiển thị hoặc phải bị disabled.
6. `npm run lint`, `npm run build` và manual flow pass.

### 6.6. Bàn giao

Branch đề xuất:

```text
feature/hai-yen-exam-lifecycle-ui
```

## 7. Trách nhiệm của leader

Leader phụ trách các phần tích hợp và các task đang triển khai:

- Nối Student Dashboard và Exam Detail với:

```text
GET_AVAILABLE_EXAMS -> AVAILABLE_EXAMS
GET_AVAILABLE_EXAM -> AVAILABLE_EXAM_DETAILS
```

- Review và tích hợp schema/protocol/router của các thành viên.
- Chốt contract `attemptId`, `deadline`, attempt status giữa Phanh và Hoàng Yến.
- Kiểm tra security: không lộ đáp án correct cho student, không tin role/owner/deadline từ client.
- Chạy full quality gate sau từng merge.

## 8. Quy trình merge và kiểm tra

Thứ tự khuyến nghị:

1. Merge phần Linh; chạy backend/client quality gate.
2. Merge phần Hải Yến; chạy backend/client quality gate.
3. Review contract attempt, merge phần Phanh; chạy full backend test.
4. Merge phần Hoàng Yến và nối với attempt; chạy full backend test.
5. Leader test thủ công end-to-end và cập nhật README.

Mỗi người trước khi gửi PR chạy:

```powershell
cd server
$env:DB_PASSWORD = '<local-postgresql-password>'
mvn test

cd ..\client
npm run lint
npm run build

cd ..
git diff --check
git status --short
```

Không commit `.env`, mật khẩu, file database local, `target/`, `node_modules/` hoặc file IDE cá nhân.
