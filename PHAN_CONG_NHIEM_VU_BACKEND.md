# Phân công Backend – Milestone hiện tại

## 1. Mục tiêu

Hai nhiệm vụ dưới đây được chọn để có phạm vi vừa phải, hỗ trợ trực tiếp cho luồng hiện tại và ít gây conflict khi làm song song.

```text
Linh:     Question Management — update và delete question
Hải Yến:  Teacher Student Directory — xem danh sách/chi tiết sinh viên
Leader:   Tích hợp protocol/router trung tâm, React client, review và merge
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

# 5. Trách nhiệm của leader

Leader giữ các file trung tâm để tránh conflict:

```text
server/src/main/java/vn/edu/hanu/exam/protocol/MessageType.java
server/src/main/java/vn/edu/hanu/exam/websocket/ExamWebSocketHandler.java
client/**
README.md
PHAN_CONG_NHIEM_VU_BACKEND.md
```

Sau khi review code, leader sẽ tích hợp các message:

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

Thứ tự merge đề xuất:

1. Merge phần Linh, chạy `mvn test` toàn bộ.
2. Merge phần Hải Yến, chạy `mvn test` toàn bộ.
3. Leader thêm protocol/router trung tâm và test lại.
4. Leader nối UI Question Management và Teacher Student page với backend thật.
