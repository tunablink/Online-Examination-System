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

Phân công dưới đây ghi nhận phần Exam Attempt Core của **Phanh đã hoàn thành và được merge**, đồng thời tách các phần còn lại để có thể làm song song và giảm sửa cùng một file.

| Thành viên | Feature phụ trách | Trạng thái / mức ưu tiên |
| --- | --- | --- |
| Phanh | Exam Attempt Core, randomization và recovery | Đã hoàn thành, đã merge vào `main` |
| Hoàng Yến | Hoàn thiện Real-time Monitoring & Anti-cheating end-to-end | Rất cao |
| Linh | Automatic Deadline Finalizer cho các attempt quá hạn | Cao |
| Hải Yến | Teacher Submission & Result Review end-to-end | Cao |
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

## 3. Phần của Phanh — Exam Attempt Core, randomization và recovery (đã merge)

> **Trạng thái:** Đã hoàn thành và có trong `main`. Commit tích hợp là `927522a` (`Merge branch 'integration/phanh-exam-attempt-resolution'`); phần triển khai chính nằm ở `5a33b52`, sau đó answer saving và exam submission được bổ sung ở `3ffcd68`. Mục này được giữ lại để ghi nhận phạm vi và tiêu chí của phần đã hoàn thành, không phải nhiệm vụ đang chờ Phanh thực hiện.

### 3.1. Mục tiêu

Xây dựng phần lõi của một lượt thi thật. Student có thể bắt đầu hoặc tiếp tục attempt; server tạo deadline, random question/choice và giữ nguyên biến thể đề sau reconnect.

### 3.2. Phạm vi đã triển khai

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

### 3.5. Tiêu chí kiểm thử của phần đã merge

1. Student start published exam thành công.
2. Draft/closed exam bị từ chối.
3. Start hai lần chỉ tạo một active attempt.
4. Student không đọc được attempt của user khác.
5. Question/choice không chứa đáp án đúng trong response student.
6. Random order ổn định khi lấy lại attempt.
7. Deadline do server tạo và hợp lệ.
8. Session chưa login trả `AUTHENTICATION_REQUIRED`; teacher gọi trả `FORBIDDEN`.

### 3.6. Thông tin tích hợp

```text
Feature source: origin/feature/phanh-exam-attempt
Integration branch: integration/phanh-exam-attempt-resolution
Merge commit on main: 927522a
```

## 4. Nhiệm vụ của Hoàng Yến — Hoàn thiện Real-time Monitoring & Anti-cheating end-to-end

### 4.1. Mục tiêu

Hoàn thiện novelty chính của dự án thành một vertical slice có thể demo bằng dữ liệu thật:

```text
Student đang thi
    -> chuyển tab/mất focus/mất kết nối/kết nối lại
    -> React gửi REPORT_ACTIVITY
    -> Java server xác thực session và ownership
    -> PostgreSQL lưu suspicious activity
    -> teacher gọi GET_EXAM_MONITORING
    -> Monitoring Page hiển thị dữ liệu thật
```

Hệ thống chỉ được ghi nhận **suspicious signal** và yêu cầu teacher review; không được tự động kết luận student gian lận.

### 4.2. Nền tảng đã có — không viết lại từ đầu

Source hiện đã có các thành phần nền tảng:

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

Các rule nền tảng hiện gồm:

```text
TAB_HIDDEN
WINDOW_BLUR
DISCONNECTED
RECONNECTED
MULTIPLE_WARNING_THRESHOLD
```

Hoàng Yến phải audit, sửa lỗi và bổ sung các tầng còn thiếu; không tạo một bộ domain/repository/service monitoring thứ hai có chức năng trùng lặp.

### 4.3. Phạm vi bắt buộc

#### A. Database và repository

- Hoàn thiện bảng `suspicious_activities` trong PostgreSQL và index theo `(attempt_id, occurred_at)`.
- Foreign key phải tham chiếu `exam_attempts(id)` và có chính sách xóa phù hợp.
- Thống nhất chính xác tên column với SQL trong `JdbcMonitoringRepository`.
- Không thêm `attempt_activity_logs` nếu không chứng minh được dữ liệu đó khác về mục đích và thật sự cần thiết.
- Mọi SQL phải parameterized.

#### B. Protocol và WebSocket backend

Hoàn thiện hai cặp message bắt buộc:

```text
REPORT_ACTIVITY -> ACTIVITY_RECORDED
GET_EXAM_MONITORING -> EXAM_MONITORING
```

Server-push sau là tùy chọn, chỉ làm sau khi hai flow bắt buộc ổn định:

```text
SUSPICIOUS_ACTIVITY_RECORDED
```

- Route `REPORT_ACTIVITY` và `GET_EXAM_MONITORING` đến `MonitoringMessageHandler`.
- Cập nhật contract test khi bổ sung `MessageType`.
- Response phải giữ đúng `requestId`.
- Không trả stack trace, SQL message hoặc thông tin nội bộ cho client.

#### C. Authorization và business rules

- `REPORT_ACTIVITY` chỉ dành cho authenticated `STUDENT`.
- Student ID phải lấy từ `AuthenticatedSessionRegistry`, không nhận từ payload.
- Attempt phải thuộc đúng student đang đăng nhập.
- `GET_EXAM_MONITORING` chỉ dành cho authenticated `TEACHER`.
- Teacher ID phải lấy từ authenticated session; teacher chỉ xem exam do mình sở hữu.
- `attemptId` và `examId` phải là số nguyên dương.
- `occurredAt` và severity do server tạo; không tin thời gian/severity từ client.
- Student chỉ được report `TAB_HIDDEN`, `WINDOW_BLUR`, `DISCONNECTED`, `RECONNECTED`.
- `MULTIPLE_WARNING_THRESHOLD` phải do server tự tạo, client không được gửi trực tiếp.
- Threshold mặc định là warning thứ ba và chỉ tạo đúng một threshold activity, không tạo lặp ở warning thứ tư trở đi.
- Monitoring không được làm thay đổi hoặc làm hỏng trạng thái attempt đang thi.

#### D. Student client reporting

Hoàn thiện reporting trong Exam Room:

- `visibilitychange` + `document.visibilityState === 'hidden'` gửi `TAB_HIDDEN`.
- `window.blur` gửi `WINDOW_BLUR`.
- Mất kết nối/kết nối lại gửi `DISCONNECTED`/`RECONNECTED` khi có attempt active.
- Listener phải được cleanup khi component unmount.
- Chỉ report khi có `attemptId` hợp lệ, bài còn active và chưa submit/expire.
- Có deduplication/throttle cơ bản để browser event không tạo spam record.
- Report monitoring thất bại không được chặn luồng lưu đáp án hoặc làm student mất bài.

#### E. Teacher Monitoring Page

- Bỏ mock khỏi `ExamMonitoringPage` cho flow được giao.
- Gửi `GET_EXAM_MONITORING` và hiển thị loading/error/empty/success state.
- Hiển thị dữ liệu an toàn: student, attempt status, deadline, warning count, activity gần nhất, severity và server time.
- Luôn hiển thị thông điệp tương đương:

```text
Monitoring signals require teacher review and do not prove cheating.
```

- Không dùng nhãn `Cheater`, `Cheating confirmed` hoặc tự kết luận vi phạm.

### 4.4. Request/response tối thiểu

Student request:

```json
{
  "requestId": "activity-001",
  "type": "REPORT_ACTIVITY",
  "payload": {
    "attemptId": 15,
    "activityType": "TAB_HIDDEN"
  }
}
```

Teacher request:

```json
{
  "requestId": "monitoring-001",
  "type": "GET_EXAM_MONITORING",
  "payload": {
    "examId": 10
  }
}
```

Payload không được chứa `studentId`, `teacherId`, role, severity hoặc server timestamp.

### 4.5. Files được sở hữu

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
client/src/pages/ExamMonitoringPage/**
client/src/pages/ExamRoomPage/**              (chỉ phần report activity)
```

Các file central sau phải cập nhật từ `main` mới nhất và báo leader trước khi sửa để tránh conflict:

```text
server/src/main/java/vn/edu/hanu/exam/protocol/MessageType.java
server/src/main/java/vn/edu/hanu/exam/websocket/ExamWebSocketHandler.java
server/src/main/resources/schema.sql
client/src/websocket/protocol.ts
```

### 4.6. Phạm vi không được sửa

Hoàng Yến không sửa các phần Student History/Result leader đang triển khai:

```text
server/src/main/java/vn/edu/hanu/exam/domain/attempt/AttemptHistoryEntry.java
server/src/main/java/vn/edu/hanu/exam/service/attempt/AttemptHistoryResult.java
server/src/main/java/vn/edu/hanu/exam/service/attempt/StudentAttemptResult.java
server/src/main/java/vn/edu/hanu/exam/websocket/dto/GetAttemptResultPayload.java
client/src/pages/ExamHistoryPage/**
client/src/pages/ExamResultPage/**
```

Không thay đổi logic randomization, save answer, grading, submit exam, exam lifecycle hoặc Question Management. Nếu cần dữ liệu attempt để authorize monitoring thì ưu tiên dùng `MonitoringRepository`, không tự sửa `AttemptRepository` khi chưa thống nhất với leader.

### 4.7. Test bắt buộc

1. Lưu `TAB_HIDDEN` đúng attempt của student sở hữu.
2. Student không report activity cho attempt của student khác.
3. Teacher không report student activity; student không đọc teacher monitoring.
4. Teacher không xem monitoring của exam thuộc teacher khác.
5. Warning count chính xác; warning thứ ba tạo đúng một `MULTIPLE_WARNING_THRESHOLD`.
6. Warning thứ tư không tạo threshold record thứ hai.
7. Invalid/missing `attemptId`, `examId`, `activityType` trả `INVALID_PAYLOAD`.
8. Chưa login trả `AUTHENTICATION_REQUIRED`; sai role trả `FORBIDDEN`.
9. `DISCONNECTED`/`RECONNECTED` không làm thay đổi attempt active.
10. Request thành công giữ đúng `requestId`; response không lộ đáp án đúng, password, session ID hoặc SQL detail.
11. PostgreSQL integration test chứng minh activity được persist và transaction rollback đúng khi có lỗi.
12. Client listener không đăng ký trùng, được cleanup và không report sau khi submit.
13. `mvn test`, `npm run lint`, `npm run build` và `git diff --check` đều pass.

### 4.8. Tiêu chí hoàn thành và bàn giao

Chỉ báo hoàn thành khi activity được lưu thật trong PostgreSQL, teacher page đọc dữ liệu thật, authorization/threshold rule đã được test và phần monitoring không còn phụ thuộc mock.

Branch đề xuất:

```text
feature/hoang-yen-monitoring-end-to-end
```

Commit đề xuất:

```text
feat(server): persist suspicious activity records
feat(server): expose exam monitoring over websocket
feat(client): report exam room activity
feat(client): connect teacher monitoring dashboard
test: cover monitoring authorization and warning threshold
```

Khi bàn giao phải gửi: tên branch, danh sách commit/file sửa, request/response mẫu, thay đổi schema, kết quả test và hướng dẫn manual test.

## 5. Nhiệm vụ của Linh — Automatic Deadline Finalizer

### 5.1. Mục tiêu

Hoàn thiện một module backend tự động kết thúc các exam attempt đã quá hạn. Attempt phải được chuyển từ `IN_PROGRESS` sang `EXPIRED`, chấm điểm từ các đáp án đã lưu và lưu kết quả ngay cả khi student đã đóng trình duyệt hoặc mất kết nối.

Luồng xử lý dự kiến:

```text
AttemptDeadlineScheduler
        -> AttemptDeadlineFinalizer
        -> AttemptDeadlineFinalizationWorker
        -> AttemptRepository / PostgreSQL
```

### 5.2. Phạm vi cần làm

- Tạo scheduler chạy định kỳ bằng Spring Scheduling.
- Mỗi lần chạy, lấy một batch ID của các attempt thỏa mãn:
  - status là `IN_PROGRESS`;
  - `deadline_at <=` thời gian hiện tại của server.
- Với từng attempt, worker phải mở transaction riêng, khóa lại bản ghi và kiểm tra điều kiện lần cuối.
- Tái sử dụng logic chấm điểm hiện có; không viết một công thức tính điểm thứ hai.
- Hoàn tất attempt với status `EXPIRED` và lưu đầy đủ score/result.
- Một attempt lỗi không được làm dừng toàn bộ batch; phải log đủ `attemptId` để debug.
- Cấu hình có default hợp lý, đề xuất delay `1000 ms` và batch size `50`.

### 5.3. Yêu cầu an toàn và concurrency

- PostgreSQL là nguồn sự thật; không dùng `synchronized` làm cơ chế chống race chính.
- Repository phải khóa attempt trước khi finalize, ví dụ `SELECT ... FOR UPDATE`.
- Worker phải kiểm tra lại status và deadline sau khi đã giữ lock.
- Chạy scheduler nhiều lần không được chấm hoặc finalize cùng attempt hai lần.
- Nếu student submit đúng lúc scheduler chạy, chỉ một luồng được finalize thành công.
- Không tin deadline/status gửi từ client và không dùng đồng hồ phía client để quyết định hết giờ.

### 5.4. Files dự kiến sở hữu

```text
server/src/main/java/vn/edu/hanu/exam/config/DeadlineSchedulingConfiguration.java
server/src/main/java/vn/edu/hanu/exam/service/attempt/deadline/AttemptDeadlineScheduler.java
server/src/main/java/vn/edu/hanu/exam/service/attempt/deadline/AttemptDeadlineFinalizer.java
server/src/main/java/vn/edu/hanu/exam/service/attempt/deadline/AttemptDeadlineFinalizationWorker.java
server/src/main/java/vn/edu/hanu/exam/service/attempt/deadline/DeadlineFinalizationSummary.java
server/src/main/java/vn/edu/hanu/exam/repository/AttemptRepository.java
server/src/main/java/vn/edu/hanu/exam/repository/JdbcAttemptRepository.java
server/src/test/java/**/attempt/deadline/**
server/src/test/java/**/AttemptDeadlineFinalizerIntegrationTests.java
server/src/main/resources/application.properties    (chỉ cấu hình scheduler nếu cần)
```

Repository tối thiểu cần hỗ trợ tương đương:

```java
List<Long> findDueAttemptIds(OffsetDateTime currentTime, int limit);

Optional<ExamAttempt> findDueAttemptByIdForUpdate(
        long attemptId,
        OffsetDateTime currentTime);
```

Tên method có thể điều chỉnh theo code hiện tại, nhưng semantics và locking phải được giữ.

### 5.5. Test bắt buộc

1. Không có attempt quá hạn: batch trả về 0 và không sửa database.
2. Attempt quá hạn được chấm điểm và chuyển sang `EXPIRED`.
3. Attempt chưa tới deadline vẫn giữ `IN_PROGRESS`.
4. Attempt đã `SUBMITTED`/`EXPIRED` không bị xử lý lại.
5. Đáp án thiếu hoặc mới trả lời một phần vẫn cho score đúng.
6. Chạy finalizer hai lần vẫn chỉ finalize một lần.
7. Một attempt lỗi không ngăn các attempt khác trong batch hoàn thành.
8. Race giữa student submit và scheduler không tạo kết quả trùng hoặc trạng thái sai.
9. Hai worker cùng xử lý một attempt vẫn chỉ một worker thành công.
10. `mvn test` pass toàn bộ, không chỉ riêng test mới.

### 5.6. Giới hạn phạm vi và bàn giao

- Không sửa client, Monitoring/Anti-cheating, Student History/Result hoặc Question Management.
- Không tự ý sửa `MessageType`, WebSocket router hay schema nếu module không thực sự cần.
- Nếu phải sửa file trung tâm đang được người khác dùng, báo leader trước khi commit.

Branch đề xuất:

```text
feature/linh-deadline-finalizer
```

Nên tách commit theo thứ tự: repository/locking → service/scheduler → tests/config.

## 6. Nhiệm vụ của Hải Yến — Teacher Submission & Result Review

### 6.1. Mục tiêu

Hoàn thiện một vertical slice để teacher xem danh sách bài làm của một exam và xem kết quả chi tiết của từng bài đã kết thúc. Dữ liệu phải đọc từ PostgreSQL, kiểm tra quyền sở hữu exam ở backend và hoạt động end-to-end từ WebSocket đến React UI.

Protocol dự kiến:

```text
GET_EXAM_SUBMISSIONS -> EXAM_SUBMISSIONS
GET_SUBMISSION_RESULT -> SUBMISSION_RESULT
```

### 6.2. Backend cần làm

- Tạo repository riêng để giảm conflict với phần deadline của Linh:

```text
TeacherSubmissionRepository.java
JdbcTeacherSubmissionRepository.java
```

- Không sửa `AttemptRepository` và `JdbcAttemptRepository` cho task này.
- Query phải join `exam_attempts`, `exams`, `users` và kiểm tra ownership ngay trong SQL bằng điều kiện tương đương `exams.created_by = teacherId`.
- Danh sách submission cần tối thiểu:
  - `attemptId`, `examId`, `examTitle`;
  - `studentId`, `username`, `studentFullName`;
  - `status`, `startedAt`, `deadline`, `submittedAt`;
  - `score`, `maxScore`, `correctAnswers`, `totalQuestions`.
- Với attempt chưa hoàn tất, các trường kết quả nullable phải giữ `null`, không biến thành `0`. Có thể dùng `ResultSet#getObject(column, Integer.class)`.
- Result detail chỉ trả về cho attempt terminal (`SUBMITTED` hoặc `EXPIRED`) và exam phải thuộc teacher đang đăng nhập.
- Tạo `TeacherSubmissionService`, các record/model cần thiết và `TeacherSubmissionException` có error code an toàn.
- Tạo DTO `GetExamSubmissionsPayload(Long examId)`, `GetSubmissionResultPayload(Long attemptId)` và `TeacherSubmissionMessageHandler`.
- Handler lấy identity/role từ authenticated session; không tin `teacherId` hay role từ payload.

### 6.3. Frontend cần làm

- Tạo trang danh sách submission cho một exam:

```text
client/src/pages/TeacherSubmissionPage/**
```

- Tạo trang xem một kết quả:

```text
client/src/pages/TeacherSubmissionResultPage/**
```

- Routes đề xuất:

```text
/teacher/exams/:examId/submissions
/teacher/submissions/:attemptId
```

- Trang danh sách cần có loading, error, empty state, tổng số bài, tìm kiếm theo student và filter theo status.
- Chỉ hiện link xem result cho attempt terminal; attempt `IN_PROGRESS` chỉ hiển thị tiến độ/trạng thái.
- Trang result hiển thị thông tin student, exam, thời gian nộp, status và các số liệu tổng hợp.
- Không tự suy luận `PASS/FAIL` vì hệ thống hiện chưa có passing threshold chính thức.
- Bổ sung TypeScript types và runtime validator cho response mới; không ép kiểu mù bằng `as`.

### 6.4. Files dự kiến sở hữu

```text
server/src/main/java/vn/edu/hanu/exam/domain/submission/**
server/src/main/java/vn/edu/hanu/exam/repository/TeacherSubmissionRepository.java
server/src/main/java/vn/edu/hanu/exam/repository/JdbcTeacherSubmissionRepository.java
server/src/main/java/vn/edu/hanu/exam/service/submission/**
server/src/main/java/vn/edu/hanu/exam/websocket/dto/GetExamSubmissionsPayload.java
server/src/main/java/vn/edu/hanu/exam/websocket/dto/GetSubmissionResultPayload.java
server/src/main/java/vn/edu/hanu/exam/websocket/handler/TeacherSubmissionMessageHandler.java
server/src/test/java/**/TeacherSubmission*Tests.java
client/src/pages/TeacherSubmissionPage/**
client/src/pages/TeacherSubmissionResultPage/**
```

Các file trung tâm như `MessageType`, WebSocket router, `client/src/websocket/protocol.ts` và `App.tsx` chỉ sửa sau khi pull/rebase `main` mới nhất; để chúng trong commit tích hợp riêng.

### 6.5. Test và acceptance criteria

1. Teacher xem được submissions của exam do mình tạo.
2. Teacher không xem được exam/submission của teacher khác.
3. Student hoặc session chưa đăng nhập bị từ chối bằng error code an toàn.
4. Attempt `IN_PROGRESS` giữ các trường score/result là `null`.
5. Result của `SUBMITTED` và `EXPIRED` trả đúng số liệu đã lưu.
6. Danh sách có thứ tự xác định, ưu tiên dữ liệu mới nhất.
7. Response không chứa password hash, correct choices hoặc dữ liệu nhạy cảm.
8. Backend tests, `npm run lint`, `npm run build` và manual flow đều pass.

### 6.6. Giới hạn phạm vi và bàn giao

- Không sửa deadline finalizer, Monitoring/Anti-cheating, Student History/Result hoặc ExamRoom.
- Không thay đổi schema nếu có thể lấy đủ dữ liệu từ các bảng hiện tại.
- Nếu cần thêm protocol/router/routes, phải giữ thay đổi nhỏ và báo leader để review conflict.

Branch đề xuất:

```text
feature/hai-yen-teacher-submission-review
```

Nên tách commit theo thứ tự: backend read model/repository → service/handler/tests → frontend → central integration.

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

1. Leader hoàn thiện, kiểm thử và đẩy phần Student History & Result hiện tại lên `main` để chốt baseline.
2. Linh và Hải Yến pull/rebase `main` mới nhất rồi làm trên hai branch riêng; hai task có thể triển khai song song.
3. Merge phần Linh trước; chạy full backend test và kiểm tra scheduler/concurrency với PostgreSQL.
4. Hải Yến rebase lên `main` sau bước 3; merge backend read model trước, sau đó tích hợp protocol/router/routes và frontend.
5. Chạy full backend test, frontend lint/build và manual flow teacher xem submission/result.
6. Hoàng Yến rebase/merge `main` mới nhất, hoàn thiện Monitoring & Anti-cheating end-to-end rồi bàn giao.
7. Merge phần Hoàng Yến; chạy manual flow student → attempt/deadline → result → teacher monitoring/review.
8. Leader cập nhật README và lưu bằng chứng kiểm thử cuối milestone.

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
