# Phân công Backend – Milestone hiện tại

## 1. Mục tiêu

Hai nhiệm vụ dưới đây được chọn để có phạm vi vừa phải, hỗ trợ trực tiếp cho luồng hiện tại và ít gây conflict khi làm song song.

```text
Linh:     Question Management — update và delete question
Hải Yến:  Teacher Student Directory — xem danh sách/chi tiết sinh viên
Hoàng Yến: Teacher Dashboard Summary — backend, WebSocket và giao diện dashboard
Leader:   Review, merge, hỗ trợ tích hợp và giữ các phần không được giao
```

Các chức năng đã có như tạo đề, publish, close, delete draft exam, tạo question, lấy question và student exam catalog phải tiếp tục hoạt động bình thường.

## 2. Quy tắc chung

1. Client không quyết định quyền, ownership hoặc trạng thái hợp lệ; server phải kiểm tra lại.
2. Không lấy `teacherId`, `studentId`, role hay status từ client để phân quyền.
3. SQL phải dùng named parameters/parameter binding; không nối input vào SQL string.
4. Không trả password hash, password, stack trace, SQL error hoặc thông tin nội bộ cho client.
5. Handler không viết SQL trực tiếp; repository không phụ thuộc WebSocket DTO.
6. Khi một thao tác sửa/xóa gồm nhiều SQL statements, phải dùng transaction.
7. Response phải giữ nguyên `requestId` của request.
8. Không tự sửa `MessageType.java`, `ExamWebSocketHandler.java`, `client/**` hoặc `README.md`; leader sẽ tích hợp các file trung tâm sau khi review.
9. Trước khi bàn giao phải chạy toàn bộ test và `git diff --check`.

---

# 3. Nhiệm vụ của Linh

## 3.1. Tên nhiệm vụ

**Hoàn thiện Update và Delete Question ở backend**

Module hiện tại đã có:

```text
CREATE_QUESTION -> QUESTION_CREATED
GET_EXAM_QUESTIONS -> EXAM_QUESTIONS
```

Linh bổ sung:

```text
UPDATE_QUESTION -> QUESTION_UPDATED
DELETE_QUESTION -> QUESTION_DELETED
```

## 3.2. Update question

Teacher có thể sửa content, points, display order và toàn bộ choices của một question.

Payload đề xuất:

```json
{
  "requestId": "req-update-question-1",
  "type": "UPDATE_QUESTION",
  "payload": {
    "questionId": 15,
    "content": "Which keyword is used to inherit a Java class?",
    "points": 1,
    "displayOrder": 0,
    "choices": [
      { "content": "extends", "correct": true, "displayOrder": 0 },
      { "content": "implements", "correct": false, "displayOrder": 1 }
    ]
  }
}
```

Server phải kiểm tra:

- Session đã đăng nhập và user có role `TEACHER`.
- Question tồn tại và thuộc exam do teacher hiện tại tạo.
- Exam phải có status `DRAFT`.
- Question content không rỗng.
- `points > 0`.
- Có từ 2 đến 6 choices.
- Mỗi choice có content không rỗng.
- Có chính xác một choice `correct = true`.
- `displayOrder >= 0`.

Việc sửa question và choices phải chạy trong **một transaction**. Nếu bất kỳ bước nào lỗi thì question và choices cũ không được thay đổi một phần.

Response thành công trả question sau update, gồm `id`, `examId`, `content`, `points`, `displayOrder`, timestamps và choices; không cần trả dữ liệu thừa.

## 3.3. Delete question

Payload:

```json
{
  "requestId": "req-delete-question-1",
  "type": "DELETE_QUESTION",
  "payload": {
    "questionId": 15
  }
}
```

Quy tắc:

- Chỉ teacher sở hữu exam mới xóa được.
- Chỉ được xóa question của exam `DRAFT`.
- Không được xóa question của exam `PUBLISHED` hoặc `CLOSED`.
- Xóa theo thứ tự `choices -> question` trong cùng transaction.
- Nếu xóa question thất bại sau khi choices đã bị xóa thì transaction phải rollback.

Response thành công:

```json
{
  "requestId": "req-delete-question-1",
  "type": "QUESTION_DELETED",
  "data": {
    "questionId": 15
  },
  "error": null
}
```

## 3.4. Error code dự kiến

```text
AUTHENTICATION_REQUIRED
FORBIDDEN
INVALID_PAYLOAD
QUESTION_NOT_FOUND
QUESTION_NOT_EDITABLE
INVALID_QUESTION_CONTENT
INVALID_QUESTION_POINTS
INVALID_CHOICE_COUNT
INVALID_CHOICE_CONTENT
INVALID_CORRECT_CHOICE_COUNT
DATABASE_ERROR
INTERNAL_SERVER_ERROR
```

Tên error code có thể điều chỉnh để phù hợp module hiện tại, nhưng không tạo nhiều mã trùng nghĩa và không để lộ lỗi database.

## 3.5. File được phép sửa

```text
server/src/main/java/vn/edu/hanu/exam/repository/QuestionRepository.java
server/src/main/java/vn/edu/hanu/exam/repository/JdbcQuestionRepository.java
server/src/main/java/vn/edu/hanu/exam/service/question/**
server/src/main/java/vn/edu/hanu/exam/exception/QuestionManagementException.java
server/src/main/java/vn/edu/hanu/exam/websocket/dto/UpdateQuestionPayload.java
server/src/main/java/vn/edu/hanu/exam/websocket/dto/DeleteQuestionPayload.java
server/src/main/java/vn/edu/hanu/exam/websocket/handler/QuestionManagementMessageHandler.java
server/src/test/java/**/QuestionManagement*Tests.java
```

## 3.6. File không được sửa

```text
server/src/main/java/vn/edu/hanu/exam/protocol/MessageType.java
server/src/main/java/vn/edu/hanu/exam/websocket/ExamWebSocketHandler.java
server/src/main/resources/schema.sql
client/**
README.md
PHAN_CONG_NHIEM_VU_BACKEND.md
```

## 3.7. Test bắt buộc

1. Teacher update question hợp lệ thành công.
2. Content rỗng bị từ chối.
3. Points bằng 0 hoặc âm bị từ chối.
4. Ít hơn 2 choices bị từ chối.
5. Không có hoặc có nhiều correct choices bị từ chối.
6. Teacher không update/delete question của teacher khác.
7. Không update/delete question trong exam `PUBLISHED` hoặc `CLOSED`.
8. Delete xóa cả question và choices.
9. Lỗi giữa delete làm transaction rollback.
10. Session chưa login trả `AUTHENTICATION_REQUIRED`.
11. Student gọi command trả `FORBIDDEN`.
12. Payload sai trả `INVALID_PAYLOAD`.
13. Response giữ nguyên `requestId`.

## 3.8. Bàn giao

Branch đề xuất:

```text
feature/linh-question-update-delete
```

Trước khi gửi Pull Request, chạy:

```powershell
cd server
$env:DB_PASSWORD = '<local-postgresql-password>'
mvn test
cd ..
git diff --check
git status --short
```

Gửi leader: branch/PR, commit hash, danh sách file đã sửa, JSON request/response mẫu và kết quả test.

---

# 4. Nhiệm vụ của Hải Yến

## 4.1. Tên nhiệm vụ

**Teacher Student Directory — xem danh sách và chi tiết sinh viên**

Teacher đã có luồng tạo student account qua `REGISTER`. Nhiệm vụ này bổ sung backend để teacher xem sinh viên đã có trong hệ thống.

Hải Yến triển khai:

```text
GET_STUDENTS -> STUDENTS
GET_STUDENT -> STUDENT_DETAILS
```

Không làm trong milestone này:

- Không sửa hoặc xóa tài khoản.
- Không reset password.
- Không phân lớp hoặc gán student vào exam.
- Không làm attempt, auto-save, submit, grading hoặc frontend.

## 4.2. Lấy danh sách sinh viên

Request:

```json
{
  "requestId": "req-students-1",
  "type": "GET_STUDENTS",
  "payload": {}
}
```

Response:

```json
{
  "requestId": "req-students-1",
  "type": "STUDENTS",
  "data": {
    "students": [
      {
        "id": 12,
        "username": "student01",
        "fullName": "Nguyen Van A",
        "email": "student01@hanu.edu.vn",
        "active": true,
        "createdAt": "2026-10-26T10:00:00Z"
      }
    ]
  },
  "error": null
}
```

Quy tắc:

- Chỉ `TEACHER` đã đăng nhập được gọi.
- Query chỉ trả các user có `role = 'STUDENT'`.
- Không trả `password`, `passwordHash`, session ID hoặc dữ liệu nhạy cảm.
- List rỗng là success: `students: []`.
- Thứ tự ổn định: `created_at DESC, id DESC`.

## 4.3. Lấy chi tiết một sinh viên

Request:

```json
{
  "requestId": "req-student-1",
  "type": "GET_STUDENT",
  "payload": {
    "studentId": 12
  }
}
```

Response chỉ chứa dữ liệu an toàn:

```json
{
  "requestId": "req-student-1",
  "type": "STUDENT_DETAILS",
  "data": {
    "id": 12,
    "username": "student01",
    "fullName": "Nguyen Van A",
    "email": "student01@hanu.edu.vn",
    "active": true,
    "createdAt": "2026-10-26T10:00:00Z"
  },
  "error": null
}
```

Validation:

- `studentId > 0`.
- SQL detail phải filter cả ID và role:

```sql
WHERE id = :studentId
  AND role = 'STUDENT'
```

- ID không tồn tại hoặc thuộc teacher trả cùng error code `STUDENT_NOT_FOUND`.
- Session chưa login trả `AUTHENTICATION_REQUIRED`.
- Student gọi API này trả `FORBIDDEN`.

## 4.4. Error code dự kiến

```text
AUTHENTICATION_REQUIRED
FORBIDDEN
INVALID_PAYLOAD
STUDENT_NOT_FOUND
DATABASE_ERROR
INTERNAL_SERVER_ERROR
```

## 4.5. File được phép sửa

Ưu tiên tạo repository riêng để không làm ảnh hưởng Login/Registration:

```text
server/src/main/java/vn/edu/hanu/exam/repository/StudentDirectoryRepository.java
server/src/main/java/vn/edu/hanu/exam/repository/JdbcStudentDirectoryRepository.java
server/src/main/java/vn/edu/hanu/exam/service/student/**
server/src/main/java/vn/edu/hanu/exam/exception/StudentManagementException.java
server/src/main/java/vn/edu/hanu/exam/websocket/dto/GetStudentPayload.java
server/src/main/java/vn/edu/hanu/exam/websocket/handler/StudentManagementMessageHandler.java
server/src/test/java/**/StudentManagement*Tests.java
```

## 4.6. File không được sửa

```text
server/src/main/java/vn/edu/hanu/exam/protocol/MessageType.java
server/src/main/java/vn/edu/hanu/exam/websocket/ExamWebSocketHandler.java
server/src/main/resources/schema.sql
client/**
README.md
PHAN_CONG_NHIEM_VU_BACKEND.md
```

## 4.7. Test bắt buộc

1. Teacher lấy danh sách student thành công.
2. List chỉ chứa user role `STUDENT`.
3. List rỗng vẫn trả success.
4. Thứ tự list ổn định.
5. Teacher lấy student detail thành công.
6. ID không tồn tại trả `STUDENT_NOT_FOUND`.
7. Không thể đọc teacher account qua student detail.
8. Session chưa login trả `AUTHENTICATION_REQUIRED`.
9. Student gọi command trả `FORBIDDEN`.
10. Payload null/sai cho detail trả `INVALID_PAYLOAD`.
11. Response giữ nguyên `requestId`.
12. Response không chứa password/password hash.

## 4.8. Bàn giao

Branch đề xuất:

```text
feature/hai-yen-student-directory
```

Trước khi gửi Pull Request, chạy:

```powershell
cd server
$env:DB_PASSWORD = '<local-postgresql-password>'
mvn test
cd ..
git diff --check
git status --short
```

Gửi leader: branch/PR, commit hash, danh sách file, JSON request/response mẫu và kết quả test.

---

# 5. Nhiệm vụ của Hoàng Yến

## 5.1. Tên nhiệm vụ

**Hoàn thiện Teacher Dashboard Summary từ backend đến giao diện**

Đây là một feature hoàn chỉnh: teacher đăng nhập, dashboard gửi WebSocket request, Java server đọc PostgreSQL và dashboard hiển thị số liệu thật. Không dùng mock data cho các số liệu thuộc feature này.

Protocol:

```text
GET_TEACHER_DASHBOARD -> TEACHER_DASHBOARD
```

Feature bao gồm:

- Backend repository, service và WebSocket handler.
- Bổ sung message type và central WebSocket routing.
- Cập nhật TypeScript protocol.
- Thay dữ liệu mock của Teacher Dashboard bằng dữ liệu từ server.
- Có loading, error, empty và success state ở giao diện.
- Unit/integration test backend, ESLint và production build client.

Không làm trong nhiệm vụ này:

- Không tạo/sửa/xóa exam.
- Không tạo/sửa/xóa question.
- Không sửa database schema.
- Không làm student directory, attempt, auto-save, submit, grading, monitoring hoặc anti-cheating.

## 5.2. Backend contract

Request không cần payload nghiệp vụ:

```json
{
  "requestId": "req-teacher-dashboard-1",
  "type": "GET_TEACHER_DASHBOARD",
  "payload": {}
}
```

Response thành công:

```json
{
  "requestId": "req-teacher-dashboard-1",
  "type": "TEACHER_DASHBOARD",
  "data": {
    "totalExams": 8,
    "draftExamCount": 3,
    "publishedExamCount": 2,
    "closedExamCount": 3,
    "recentExams": [
      {
        "id": 12,
        "title": "Java Programming Final Exam",
        "description": "Multiple choice final examination",
        "durationMinutes": 90,
        "status": "PUBLISHED",
        "questionCount": 25,
        "createdAt": "2026-10-26T09:00:00Z",
        "updatedAt": "2026-10-26T10:30:00Z"
      }
    ]
  },
  "error": null
}
```

Các rule bắt buộc:

- Chỉ teacher đã đăng nhập được gọi command.
- Lấy teacher từ `AuthenticatedSessionRegistry`; không nhận `teacherId` từ client.
- Query chỉ trả exam có `created_by = :teacherId`.
- Trả tổng số đề, số `DRAFT`, `PUBLISHED`, `CLOSED` và tối đa 5 đề gần cập nhật nhất.
- Mỗi recent exam có `questionCount` chính xác.
- Sort recent exam bằng `updated_at DESC, id DESC`.
- Teacher chưa có đề vẫn là success với count bằng `0` và `recentExams: []`.
- Không trả question content, choice content, correct answer, password/password hash hoặc session data.
- Session chưa login trả `AUTHENTICATION_REQUIRED`; student gọi command trả `FORBIDDEN`.

Error code dự kiến:

```text
AUTHENTICATION_REQUIRED
FORBIDDEN
DATABASE_ERROR
INTERNAL_SERVER_ERROR
```

## 5.3. Frontend requirements

Sửa Teacher Dashboard để gửi `GET_TEACHER_DASHBOARD` khi WebSocket đã connected và render response `TEACHER_DASHBOARD`.

Giao diện cần có:

- Bốn statistic cards: total examinations, draft, published, closed.
- Recent examinations list/table: title, status, question count, duration, updated time.
- Link mở exam và link Manage questions khi phù hợp.
- Loading state trong khi chờ response.
- Empty state khi teacher chưa có exam, kèm link tạo đề đầu tiên.
- Error state khi server trả `ERROR`, timeout hoặc WebSocket mất kết nối.
- Nút Try again gửi lại request dashboard.

Không thay đổi giao diện hay logic của Create Exam và Question Management ngoài các link điều hướng cần thiết.

## 5.4. File được phép sửa

```text
server/src/main/java/vn/edu/hanu/exam/repository/TeacherDashboardRepository.java
server/src/main/java/vn/edu/hanu/exam/repository/JdbcTeacherDashboardRepository.java
server/src/main/java/vn/edu/hanu/exam/service/dashboard/**
server/src/main/java/vn/edu/hanu/exam/exception/TeacherDashboardException.java
server/src/main/java/vn/edu/hanu/exam/websocket/handler/TeacherDashboardMessageHandler.java
server/src/main/java/vn/edu/hanu/exam/protocol/MessageType.java
server/src/main/java/vn/edu/hanu/exam/websocket/ExamWebSocketHandler.java
server/src/test/java/**/TeacherDashboard*Tests.java

client/src/websocket/protocol.ts
client/src/pages/TeacherDashboardPage/TeacherDashboardPage.tsx
client/src/pages/TeacherDashboardPage/components/**
```

## 5.5. File không được sửa

```text
server/src/main/resources/schema.sql
server/src/main/java/vn/edu/hanu/exam/repository/ExamRepository.java
server/src/main/java/vn/edu/hanu/exam/repository/JdbcExamRepository.java
server/src/main/java/vn/edu/hanu/exam/repository/QuestionRepository.java
server/src/main/java/vn/edu/hanu/exam/repository/JdbcQuestionRepository.java
server/src/main/java/vn/edu/hanu/exam/service/exam/**
server/src/main/java/vn/edu/hanu/exam/service/question/**
client/src/pages/CreateExamPage/**
client/src/pages/QuestionManagementPage/**
README.md
PHAN_CONG_NHIEM_VU_BACKEND.md
```

## 5.6. Test và quality gate bắt buộc

1. Teacher lấy dashboard thành công.
2. Tổng số exam và count theo từng status đúng.
3. Dashboard không thấy exam của teacher khác.
4. `questionCount` trong recent exam đúng.
5. Recent exams đúng thứ tự và chỉ có tối đa 5 item.
6. Teacher chưa có exam nhận count `0` và list rỗng.
7. Session chưa login trả `AUTHENTICATION_REQUIRED`.
8. Student gọi command trả `FORBIDDEN`.
9. Response giữ nguyên `requestId`.
10. Lỗi database không lộ stack trace và được đổi thành `DATABASE_ERROR`.
11. Teacher dashboard client có loading, empty, error và retry state.
12. `mvn test`, `npm run lint`, `npm run build` đều pass.
13. `git diff --check` không báo lỗi.

## 5.7. Bàn giao

Branch đề xuất:

```text
feature/hoang-yen-teacher-dashboard
```

Commit đề xuất:

```text
feat(server): add teacher dashboard summary
test(server): cover teacher dashboard summary
feat(client): load teacher dashboard from websocket
```

Trước khi gửi Pull Request, chạy:

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

Gửi leader: branch/PR, commit hash, danh sách file, ảnh feature chạy thành công, JSON request/response thực tế và kết quả các lệnh quality gate.

---

# 6. Trách nhiệm của leader

Leader giữ các file trung tâm để tránh conflict, trừ phạm vi đã giao riêng cho Hoàng Yến ở mục 5:

```text
README.md
PHAN_CONG_NHIEM_VU_BACKEND.md
```

Leader sẽ tích hợp sau khi review code của Linh và Hải Yến các message:

```text
UPDATE_QUESTION
QUESTION_UPDATED
DELETE_QUESTION
QUESTION_DELETED

GET_STUDENTS
STUDENTS
GET_STUDENT
STUDENT_DETAILS
```

Hoàng Yến được phép tích hợp trực tiếp hai message thuộc feature dashboard của mình:

```text
GET_TEACHER_DASHBOARD
TEACHER_DASHBOARD
```

Thứ tự merge đề xuất:

1. Merge phần Linh, chạy `mvn test` toàn bộ.
2. Merge phần Hải Yến, chạy `mvn test` toàn bộ.
3. Review và merge phần Hoàng Yến, chạy `mvn test`, `npm run lint` và `npm run build`.
4. Leader thêm protocol/router trung tâm cho Linh và Hải Yến, sau đó test lại.
5. Leader nối UI Question Management và Teacher Student page với backend thật.
