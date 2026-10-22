# PHÂN CÔNG BACKEND – GIAI ĐOẠN TIẾP THEO

## 1. Mục tiêu của giai đoạn

Giai đoạn này tập trung hoàn thiện hai phần backend gần nhau nhưng có ranh giới rõ ràng:

- **Phanh:** hoàn thiện trọn vẹn `Teacher Exam Lifecycle Management`.
- **Leader:** tự triển khai `Question Management`, giữ các file tích hợp trung tâm và kết nối frontend.

Code Exam Management cơ bản của Phanh đã được merge vào `main`. Phần hiện có gồm:

- Tạo kỳ thi.
- Lấy danh sách kỳ thi do giáo viên hiện tại tạo.
- Lấy chi tiết một kỳ thi theo ownership.
- Repository dùng Spring JDBC.
- Service validation cơ bản.
- WebSocket message handler độc lập.
- Unit test cho handler và integration test cho service.

Nhiệm vụ tiếp theo của Phanh là mở rộng đúng module này, không chuyển sang một module mới.

---

## 2. Kiến trúc và nguyên tắc chung

Kiến trúc dự án:

```text
React client
    ↕ WebSocket + JSON
Java Spring Boot server
    ↕ Spring JDBC
PostgreSQL
```

Các nguyên tắc bắt buộc:

1. Client không quyết định quyền, ownership hoặc trạng thái hợp lệ của kỳ thi.
2. Mọi command phải được xác thực và phân quyền tại server.
3. Không tin `teacherId` do client gửi; luôn lấy user từ `AuthenticatedSessionRegistry`.
4. Mọi câu SQL phải dùng parameter binding, không nối chuỗi từ input.
5. Không trả stack trace, SQL hoặc thông tin nhạy cảm về client.
6. Không hard-code mật khẩu PostgreSQL.
7. Không đưa business logic vào `ExamWebSocketHandler` trung tâm.
8. Các thao tác gồm nhiều câu SQL và cần tính nguyên tử phải chạy trong transaction.
9. Mỗi response phải giữ nguyên `requestId` của request khi request có `requestId`.
10. Tất cả test cũ phải tiếp tục chạy sau thay đổi.

---

# 3. NHIỆM VỤ CỦA PHANH

## 3.1. Tên nhiệm vụ

**Hoàn thiện Teacher Exam Lifecycle Management**

Phanh tiếp tục phát triển module Exam Management đã được merge. Phạm vi cuối cùng của module gồm:

```text
Create exam
List teacher exams
Get exam details
Update draft exam
Publish exam
Close exam
Delete draft exam
```

Luồng trạng thái hợp lệ:

```text
DRAFT → PUBLISHED → CLOSED
```

Không triển khai chuyển trạng thái ngược trong giai đoạn này:

```text
PUBLISHED → DRAFT       không hợp lệ
CLOSED → PUBLISHED      không hợp lệ
CLOSED → DRAFT          không hợp lệ
```

---

## 3.2. Phần đã có và phải được giữ ổn định

Các command/response hiện tại phải tiếp tục hoạt động:

```text
CREATE_EXAM
EXAM_CREATED

GET_TEACHER_EXAMS
TEACHER_EXAMS

GET_EXAM
EXAM_DETAILS
```

Không được làm hỏng các test hiện tại của:

- `ExamManagementServiceIntegrationTests`.
- `ExamManagementMessageHandlerTests`.
- Authentication và session registry.
- Registration và login.
- WebSocket error handling.

---

## 3.3. Cập nhật kỳ thi nháp

### Protocol

```text
UPDATE_EXAM
→ EXAM_UPDATED
```

Payload đề xuất:

```json
{
  "requestId": "req-update-exam-1",
  "type": "UPDATE_EXAM",
  "payload": {
    "examId": 12,
    "title": "Advanced Java Programming",
    "description": "Updated examination description",
    "durationMinutes": 90
  }
}
```

Response thành công phải trả đầy đủ thông tin kỳ thi sau cập nhật và không trả dữ liệu không cần thiết.

### Validation bắt buộc

- Session đã đăng nhập.
- User có role `TEACHER`.
- `examId` hợp lệ.
- Kỳ thi tồn tại và thuộc teacher hiện tại.
- Kỳ thi đang ở trạng thái `DRAFT`.
- `title` sau khi `strip()` không được rỗng.
- `title` không dài quá 255 ký tự.
- `durationMinutes > 0`.
- `description` có thể null hoặc rỗng.
- Cập nhật `updated_at` khi update thành công.

Không được cho phép sửa kỳ thi `PUBLISHED` hoặc `CLOSED`.

---

## 3.4. Publish kỳ thi

### Protocol

```text
PUBLISH_EXAM
→ EXAM_PUBLISHED
```

Payload đề xuất:

```json
{
  "requestId": "req-publish-exam-1",
  "type": "PUBLISH_EXAM",
  "payload": {
    "examId": 12
  }
}
```

### Điều kiện publish

Chỉ publish khi toàn bộ điều kiện sau đúng:

- Session đã đăng nhập.
- User có role `TEACHER`.
- Kỳ thi thuộc teacher hiện tại.
- Kỳ thi đang là `DRAFT`.
- Kỳ thi có ít nhất một question.
- Mỗi question có ít nhất hai choices.
- Mỗi question có chính xác một choice có `correct = TRUE`.

Phanh được phép đọc các bảng `questions` và `choices` để kiểm tra publish readiness, nhưng không triển khai chức năng tạo/sửa/xóa question.

Publish phải thay đổi trạng thái bằng câu update có điều kiện, ví dụ về ý tưởng:

```sql
UPDATE exams
SET status = 'PUBLISHED',
    updated_at = CURRENT_TIMESTAMP
WHERE id = :examId
  AND created_by = :teacherId
  AND status = 'DRAFT';
```

Service không được chỉ đọc trạng thái rồi update vô điều kiện. Số dòng bị ảnh hưởng phải được kiểm tra để hạn chế race condition và phát hiện trạng thái đã thay đổi.

### Các lỗi dự kiến

```text
AUTHENTICATION_REQUIRED
FORBIDDEN
EXAM_NOT_FOUND
EXAM_NOT_EDITABLE
EXAM_HAS_NO_QUESTIONS
QUESTION_HAS_TOO_FEW_CHOICES
QUESTION_HAS_INVALID_CORRECT_CHOICE_COUNT
DATABASE_ERROR
INTERNAL_SERVER_ERROR
```

---

## 3.5. Đóng kỳ thi

### Protocol

```text
CLOSE_EXAM
→ EXAM_CLOSED
```

Chỉ chấp nhận phép chuyển:

```text
PUBLISHED → CLOSED
```

Phải từ chối:

- `DRAFT → CLOSED`.
- `CLOSED → CLOSED`.
- Teacher khác đóng kỳ thi.
- Student gửi command.
- Session chưa đăng nhập.

Update trạng thái phải dùng điều kiện `status = 'PUBLISHED'` ngay trong câu SQL và kiểm tra số dòng bị ảnh hưởng.

---

## 3.6. Xóa kỳ thi nháp

### Protocol

```text
DELETE_EXAM
→ EXAM_DELETED
```

Chỉ được xóa khi:

- User đã đăng nhập và có role `TEACHER`.
- Kỳ thi thuộc teacher hiện tại.
- Kỳ thi đang là `DRAFT`.

Không được xóa:

- Kỳ thi của teacher khác.
- Kỳ thi `PUBLISHED`.
- Kỳ thi `CLOSED`.

Nếu draft exam đã có questions và choices, thao tác xóa phải chạy trong một transaction và theo thứ tự phù hợp với foreign key:

```text
DELETE choices
→ DELETE questions
→ DELETE exam
```

Nếu một bước thất bại thì toàn bộ transaction phải rollback. Không được để database còn dữ liệu mồ côi hoặc chỉ xóa một phần.

Không tự ý sửa foreign key thành `ON DELETE CASCADE` trong `schema.sql`. Nếu muốn dùng cascade, phải trao đổi với leader trước.

---

## 3.7. Repository contract

Phanh được mở rộng `ExamRepository` với các operation có tên rõ nghĩa. Ví dụ định hướng:

```java
Exam updateDraft(
        long examId,
        long teacherId,
        String title,
        String description,
        int durationMinutes
);

ExamPublishReadiness getPublishReadiness(
        long examId,
        long teacherId
);

Exam publish(long examId, long teacherId);

Exam close(long examId, long teacherId);

void deleteDraft(long examId, long teacherId);
```

Tên và kiểu trả về cuối cùng có thể điều chỉnh cho phù hợp code hiện tại, nhưng phải bảo đảm:

- Repository không phụ thuộc WebSocket DTO.
- Service không viết SQL trực tiếp.
- Handler không gọi JDBC trực tiếp.
- Có cách phân biệt `not found`, sai ownership và sai state mà không tiết lộ dữ liệu của teacher khác.

Có thể tạo một record chỉ dùng nội bộ server, ví dụ:

```java
public record ExamPublishReadiness(
        int questionCount,
        int invalidChoiceCount,
        int invalidCorrectChoiceCount
) {
    public boolean canPublish() {
        return questionCount > 0
                && invalidChoiceCount == 0
                && invalidCorrectChoiceCount == 0;
    }
}
```

Đây chỉ là gợi ý thiết kế, không bắt buộc sao chép nguyên văn nếu có thiết kế rõ ràng hơn.

---

## 3.8. Service contract

`ExamManagementService` chịu trách nhiệm:

- Validate input.
- Kiểm tra ownership mà không lộ dữ liệu teacher khác.
- Kiểm tra state transition.
- Kiểm tra publish readiness.
- Điều phối repository.
- Chuyển lỗi database thành error code an toàn.
- Bảo đảm delete nhiều bảng chạy trong transaction.

Không truyền `LoggedInUser`, `WebSocketSession`, `ClientMessage` hoặc JSON object xuống repository.

Không dùng exception message từ PostgreSQL làm message trả trực tiếp cho client.

---

## 3.9. WebSocket handler

Mở rộng `ExamManagementMessageHandler` bằng các method độc lập:

```text
handleUpdate(...)
handlePublish(...)
handleClose(...)
handleDelete(...)
```

Mỗi method phải:

1. Lấy authenticated user từ `AuthenticatedSessionRegistry`.
2. Từ chối session chưa đăng nhập.
3. Từ chối user không phải `TEACHER`.
4. Convert payload an toàn.
5. Gọi service tương ứng.
6. Giữ nguyên `requestId`.
7. Trả response hoặc `ERROR` theo protocol.
8. Không làm đóng WebSocket khi một request nghiệp vụ thất bại.

Thống nhất mã lỗi không xác định là:

```text
INTERNAL_SERVER_ERROR
```

Không tạo thêm biến thể `INTERNAL_ERROR`.

---

## 3.10. Test bắt buộc

### Service/repository integration tests

Tối thiểu phải có các trường hợp:

1. Update một `DRAFT` exam hợp lệ.
2. Title blank bị từ chối.
3. Title dài hơn 255 ký tự bị từ chối.
4. Duration bằng `0` hoặc âm bị từ chối.
5. Teacher không update được exam của teacher khác.
6. Không update `PUBLISHED` hoặc `CLOSED`.
7. Publish exam có question/choices hợp lệ.
8. Không publish exam không có question.
9. Không publish khi một question có ít hơn hai choices.
10. Không publish khi một question không có correct choice.
11. Không publish khi một question có nhiều correct choices.
12. Teacher không publish được exam của teacher khác.
13. Close `PUBLISHED` exam thành công.
14. Không close trực tiếp một `DRAFT` exam.
15. Không close lại exam đã `CLOSED`.
16. Delete `DRAFT` exam không có question.
17. Delete `DRAFT` exam cùng questions và choices.
18. Lỗi ở giữa delete làm rollback toàn bộ transaction.
19. Không delete `PUBLISHED` hoặc `CLOSED`.
20. Teacher không delete được exam của teacher khác.

### Handler unit tests

Tối thiểu phải có:

1. Update hợp lệ trả `EXAM_UPDATED`.
2. Publish hợp lệ trả `EXAM_PUBLISHED`.
3. Close hợp lệ trả `EXAM_CLOSED`.
4. Delete hợp lệ trả `EXAM_DELETED`.
5. Payload null hoặc sai kiểu trả `INVALID_PAYLOAD`.
6. Thiếu `examId` trả error phù hợp.
7. Session chưa đăng nhập trả `AUTHENTICATION_REQUIRED`.
8. User `STUDENT` trả `FORBIDDEN`.
9. Ownership/state error giữ đúng error code.
10. Response giữ nguyên `requestId`.
11. Internal exception trả `INTERNAL_SERVER_ERROR`, không trả stack trace.

Không viết test chỉ để tăng số lượng. Mỗi test phải kiểm tra behavior quan trọng bằng assertion rõ ràng.

---

## 3.11. File Phanh được phép sửa

```text
server/src/main/java/vn/edu/hanu/exam/exception/ExamManagementException.java
server/src/main/java/vn/edu/hanu/exam/repository/ExamRepository.java
server/src/main/java/vn/edu/hanu/exam/repository/JdbcExamRepository.java
server/src/main/java/vn/edu/hanu/exam/service/exam/**
server/src/main/java/vn/edu/hanu/exam/websocket/dto/*Exam*.java
server/src/main/java/vn/edu/hanu/exam/websocket/handler/ExamManagementMessageHandler.java
server/src/test/java/**/exam/**
server/src/test/java/**/ExamManagementMessageHandlerTests.java
```

Phanh có thể tạo thêm class/record trong đúng package Exam Management nếu cần.

---

## 3.12. File Phanh không được sửa

Để tránh conflict, Phanh không sửa:

```text
server/src/main/java/vn/edu/hanu/exam/protocol/MessageType.java
server/src/main/java/vn/edu/hanu/exam/websocket/ExamWebSocketHandler.java
server/src/main/resources/schema.sql
README.md
PHAN_CONG_NHIEM_VU_BACKEND.md
client/**
```

Phanh cũng không sửa:

- Question Management của leader.
- Attempt/session.
- Auto-save answer.
- Submission/grading.
- Monitoring.
- Anti-cheating.
- Frontend React.

Nếu phát hiện cần sửa file ngoài phạm vi, Phanh phải báo leader trước, không tự ý mở rộng scope.

---

## 3.13. Git workflow dành cho Phanh

Trước khi bắt đầu, đồng bộ từ `main` và tạo branch riêng. Tên branch đề xuất:

```text
feature/phanh-exam-lifecycle
```

Không commit:

- Mật khẩu database.
- File IDE cá nhân.
- `target/`.
- Log runtime.
- Thay đổi frontend.
- Thay đổi ngoài phạm vi nhiệm vụ.

Trước khi gửi Pull Request, chạy:

```powershell
cd server
$env:DB_PASSWORD = '<local-database-password>'
mvn test
cd ..
git diff --check
git status
```

Phanh phải gửi cho leader:

- Branch hoặc Pull Request.
- Commit hash cuối cùng.
- Danh sách file đã thay đổi.
- Kết quả `mvn test`.
- Mô tả protocol/request/response thực tế.
- Mọi điểm khác so với tài liệu này, nếu có.

Không merge trực tiếp vào `main` khi leader chưa review.

---

## 3.14. Definition of Done của Phanh

Phanh chỉ báo hoàn thành khi tất cả mục sau đạt:

- [ ] Create/list/get cũ vẫn hoạt động.
- [ ] Update `DRAFT` exam hoạt động.
- [ ] Publish validation kiểm tra dữ liệu questions/choices thật.
- [ ] Chỉ cho phép `DRAFT → PUBLISHED`.
- [ ] Chỉ cho phép `PUBLISHED → CLOSED`.
- [ ] Delete chỉ cho phép với `DRAFT`.
- [ ] Delete questions/choices/exam chạy trong một transaction.
- [ ] Authentication, role và ownership được kiểm tra tại server.
- [ ] Không nhận `teacherId` từ client làm nguồn quyền hạn.
- [ ] SQL dùng parameter binding.
- [ ] Handler giữ nguyên `requestId`.
- [ ] Error code thống nhất, không lộ thông tin nội bộ.
- [ ] Test mới bao phủ success, validation, authorization, state và rollback.
- [ ] Toàn bộ test cũ và mới đều pass.
- [ ] `git diff --check` không báo lỗi.
- [ ] Không sửa các file bị cấm.
- [ ] Không còn debug code hoặc dead code.
- [ ] Pull Request mô tả rõ thay đổi và bằng chứng test.

---

# 4. PHẦN LEADER TỰ TRIỂN KHAI

Leader tự chịu trách nhiệm cho:

## 4.1. Question Management

- Question repository và JDBC implementation.
- Choice persistence.
- Tạo question cùng choices trong transaction.
- Danh sách questions của một exam.
- Update/delete question nếu được đưa vào milestone.
- Kiểm tra ownership của exam.
- Chỉ cho sửa question khi exam còn `DRAFT`.
- Validation ít nhất hai choices và chính xác một correct choice.
- Teacher DTO có thể chứa `correct`; student DTO tuyệt đối không được chứa đáp án đúng.
- Test service/repository/handler và rollback.

## 4.2. Tích hợp trung tâm

Leader giữ quyền sửa:

```text
MessageType.java
ExamWebSocketHandler.java
schema.sql
README.md
client/**
```

Sau khi review và merge module Exam Lifecycle cùng Question Management, leader mới thêm protocol vào `MessageType` và nối handler vào `ExamWebSocketHandler`.

Các message dự kiến phải đồng bộ:

```text
CREATE_EXAM
EXAM_CREATED
GET_TEACHER_EXAMS
TEACHER_EXAMS
GET_EXAM
EXAM_DETAILS
UPDATE_EXAM
EXAM_UPDATED
PUBLISH_EXAM
EXAM_PUBLISHED
CLOSE_EXAM
EXAM_CLOSED
DELETE_EXAM
EXAM_DELETED
CREATE_QUESTION
QUESTION_CREATED
GET_EXAM_QUESTIONS
EXAM_QUESTIONS
```

Leader chịu trách nhiệm cập nhật React sau khi backend contract đã ổn định.

---

# 5. Thứ tự phối hợp và merge

Thứ tự thực hiện đề xuất:

1. Leader gửi tài liệu này cho Phanh.
2. Phanh xác nhận payload, response và error code trước khi code.
3. Phanh làm trên branch `feature/phanh-exam-lifecycle`.
4. Song song, leader triển khai Question Management trên branch/worktree của leader.
5. Phanh chạy toàn bộ test và mở Pull Request.
6. Leader review file scope, SQL, transaction, authorization và test.
7. Leader merge Exam Lifecycle vào `main`.
8. Leader chạy toàn bộ backend test với PostgreSQL thật.
9. Leader tích hợp `MessageType` và `ExamWebSocketHandler`.
10. Leader kết nối các trang React Teacher với backend thật.
11. Chỉ xóa mock data của từng trang sau khi flow thật đã hoạt động và có loading/error/empty state.

---

# 6. Những phần chưa giao trong giai đoạn này

Không tự mở rộng sang các phần sau:

- Student available-exam query.
- Exam attempt/session.
- Question/choice randomization theo attempt.
- Server-authoritative deadline.
- Auto-save answer.
- Reconnect và exam recovery.
- Idempotent submit/finalization.
- Grading, result và leaderboard.
- Real-time monitoring.
- Suspicious activity và anti-cheating rules.
- Concurrency/load test toàn hệ thống.

Các phần này sẽ được chia theo milestone sau khi Teacher Exam Lifecycle và Question Management chạy end-to-end.

---

# 7. Điều kiện trước khi bắt đầu milestone tiếp theo

Chỉ chuyển sang attempt/submission/anti-cheating khi:

- Teacher tạo được exam thật từ React.
- Teacher xem và cập nhật exam thật.
- Teacher tạo và xem questions/choices thật.
- Publish validation hoạt động với dữ liệu PostgreSQL thật.
- Teacher publish và close exam đúng state transition.
- Delete draft rollback an toàn khi có lỗi.
- Backend full test trả `BUILD SUCCESS`.
- Client chạy `npm run lint` và `npm run build` thành công.
- README phản ánh đúng trạng thái thực tế, không đánh dấu hoàn thành sớm.
