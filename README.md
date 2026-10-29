# EZAM — Online Examination System

Hệ thống thi trắc nghiệm trực tuyến: **React web client → Java server qua WebSocket → PostgreSQL**. Giáo viên quản lý đề/câu hỏi, cấp tài khoản sinh viên, giám sát và xem bài nộp; sinh viên làm bài, lưu đáp án, nộp bài và xem kết quả server.

**Cập nhật: 29/10/2026.** Đây là hiện trạng source, thay thế các bản tiến độ cũ trong README. Có source hoặc build/test pass không đồng nghĩa đã nghiệm thu đầy đủ.

### Enrollment key theo từng đề thi

- Teacher nhập key khi tạo đề, hoặc đặt/thay key trong Edit của draft. `CREATE_EXAM` yêu cầu key ở cả client và backend; khi sửa draft, để trống giữ key đã có.
- Student phải thuộc course và nhập đúng key để bắt đầu attempt mới. Key phân biệt hoa/thường, tối thiểu 8 ký tự và tối đa 72 UTF-8 bytes.
- Database chỉ lưu BCrypt hash; response exam/catalog/attempt không trả key hoặc hash. Teacher cần giữ bản riêng để cung cấp cho sinh viên; không có chức năng đọc lại key đã lưu.
- Attempt đang làm **đã xác thực key** khôi phục được mà không nhập lại, không reset deadline. Attempt cũ chưa có dấu xác thực phải nhập key một lần qua trang chi tiết đề; attempt đã hoàn tất không miễn key cho lần thi mới.
- Popup Enter gửi key thì server luôn kiểm tra, kể cả khi đã có attempt xác thực trước đó: nhập sai không được âm thầm chuyển thành resume. Chỉ Resume bỏ key/gửi chuỗi rỗng mới được khôi phục lượt đã xác thực mà không nhập lại.
- Schema khởi động thêm `exams.enrollment_key_hash`; có [migration thủ công](server/src/main/resources/db/migrations/002_exam_enrollment_key.sql) nếu không dùng auto-init.
- Server chặn trước giờ `scheduledAt` và kiểm tra dấu `exam_attempts.enrollment_verified_at` khi start/recover/save/manual submit; frontend tách Enter và Resume. URL phòng thi không bỏ qua được các kiểm tra này. [Migration dấu xác thực](server/src/main/resources/db/migrations/003_attempt_enrollment_verification.sql) giữ NULL cho dữ liệu cũ, không tự coi là đã xác thực.
- Đề cũ chưa có key sẽ từ chối attempt mới hoặc việc xác thực lại attempt cũ. Đặt key cho draft cũ; đề đã publish không được sửa key, cần close và tạo draft mới nếu chưa có key. Không tự sinh default key hoặc xoá bài làm hiện có; deadline worker vẫn hoàn tất attempt quá hạn.
- Hướng dẫn, lỗi và kiểm thử: [Exam enrollment key](docs/exam-enrollment-key.md). Browser acceptance chưa hoàn tất; rate limiting chống đoán key chưa triển khai.

### Khoảng vào thi và thời lượng riêng của sinh viên

- Teacher đặt **Entry opens at** (`scheduledAt`), **Entry closes at** (`entryClosesAt`) và **Duration** riêng biệt khi tạo đề. Giờ đóng phải sau giờ mở. Edit của draft cho phép cập nhật khoảng này.
- Backend chỉ cho bắt đầu lượt mới khi `scheduledAt <= serverNow < entryClosesAt`, đồng thời vẫn yêu cầu course membership và enrollment key. Trước giờ mở trả `EXAM_NOT_OPEN`; tới giờ đóng trả `EXAM_ENTRY_CLOSED`.
- Deadline mỗi sinh viên = **thời điểm server tạo attempt + durationMinutes**; không lấy giờ đóng nhận lượt để cắt thời gian làm bài. Ví dụ mở 09:00–10:00, duration 60 phút, bắt đầu 09:50 thì deadline 10:50.
- Đóng nhận lượt mới **không tự chuyển đề sang CLOSED**. Attempt đã xác thực key được resume/lưu đáp án/nộp bài sau giờ đóng đến deadline riêng; refresh/reconnect không reset deadline. Attempt legacy chưa xác thực không được xác thực lần đầu sau giờ đóng.
- Trang chi tiết student hiển thị khoảng vào thi và chặn Enter ngoài khoảng; Resume được tách riêng. Backend vẫn là nơi quyết định, không dựa vào đồng hồ hay nút trên browser để cấp quyền.
- Auto-init bổ sung cột nullable `exams.entry_closes_at`. Có [migration thủ công 004](server/src/main/resources/db/migrations/004_exam_entry_window.sql). Đề legacy NULL không được tự gán giờ đóng; sửa draft hoặc tạo đề mới có khoảng rõ ràng trước khi dùng flow mới. Không thay deadline hay xoá bài làm hiện có.

## 1. Phạm vi và trạng thái

- Hai vai trò: `TEACHER`, `STUDENT`; chưa có role `ADMIN` riêng.
- Thi trắc nghiệm một lựa chọn. Không chấm tự luận, chạy code thí sinh hoặc dùng camera/microphone.
- Giáo viên cấp tài khoản sinh viên; **không đăng ký công khai**.
- Novelty chính: **suspicious-activity detection kết hợp real-time monitoring**, không phải AI kết luận gian lận.

| Module | Hiện trạng |
|---|---|
| Transport | WebSocket JSON, request correlation, timeout, reconnect/backoff và lỗi có cấu trúc |
| Authentication | BCrypt, active account, identity theo socket, role/ownership checks |
| Registration | Chỉ teacher gửi được `REGISTER`; payload không thể tạo role teacher |
| Session recovery | Token tám giờ theo tab, refresh/reconnect, `RESUME_SESSION`, server-side `LOGOUT` |
| Profile | Xem/cập nhật hồ sơ và đổi mật khẩu |
| Exam lifecycle | Tạo/xem/sửa draft, publish readiness, publish, close, xoá draft |
| Questions | Tạo/xem/sửa/xoá câu hỏi và choices; ownership/status validation |
| Student catalog | Danh sách/chi tiết đề lấy từ server/PostgreSQL |
| Attempt | Start/recover; snapshot và thứ tự câu hỏi/choices ngẫu nhiên theo attempt |
| Enrollment key | Key theo từng đề, BCrypt hash; kiểm tra course/giờ mở; chỉ attempt đã xác thực key mới resume không cần nhập lại |
| Entry window | Giờ mở/đóng nhận lượt mới do teacher đặt; sinh viên bắt đầu hợp lệ vẫn có đủ duration riêng, kể cả sau giờ đóng nhận lượt |
| Answers | `SAVE_ANSWER`; UI chỉ báo lưu thành công sau ACK |
| Submission/grading | Server chấm dữ liệu đã lưu trong transaction; row lock, submit idempotent |
| Deadline | Worker server hoàn tất attempt quá hạn kể cả khi student offline |
| Results | Student xem lịch sử/kết quả của mình; teacher review bài nộp của đề mình sở hữu |
| Monitoring | Snapshot push sau commit start/report/finalize; dashboard/activity reports dùng dữ liệu thật |
| UI | EZAM, logo dùng chung, Tailwind, typography dễ đọc, font Outfit ở tên thương hiệu student header |
| Checks | Full backend gần nhất **302 tests pass**; frontend lint/build pass |
| Acceptance/load | Chưa hoàn tất browser checklist, fresh-install verification hoặc benchmark multi-user |

Một số search/notification/language controls có thể mới là giao diện, chưa phải nghiệp vụ hoàn chỉnh. Protocol có student list/detail, nhưng route `/teacher/students/new` hiện là **tạo sinh viên**, không phải cam kết có màn hình quản trị sinh viên đầy đủ.

## 2. Công nghệ và kiến trúc

| Lớp | Công nghệ trong source |
|---|---|
| Client | React 19, TypeScript 6, React Router 8 |
| UI/build | Tailwind CSS 4, Vite 8, ESLint |
| Backend | Java 21, Maven, Spring Boot 4.1.1, Spring WebSocket |
| JSON | Jackson 3, package `tools.jackson.*` |
| Database | PostgreSQL, Spring JDBC/NamedParameterJdbcTemplate, HikariCP |
| Password | Spring Security Crypto/BCrypt, không phải full Spring Security HTTP authentication stack |
| Test | JUnit, Mockito, Spring Boot Test, PostgreSQL integration tests |

Máy phát triển đã dùng PostgreSQL 18. Dependency chính xác xem `server/pom.xml`, `client/package.json`, `client/package-lock.json`.

**Không còn là Java console/raw TCP JSON từng dòng.** Mỗi JSON hiện là một WebSocket text message; WebSocket sử dụng TCP nhưng có HTTP upgrade và framing riêng.

```text
React pages/components → AuthProvider + WebSocketProvider
  → WebSocket /ws → ExamWebSocketHandler → Message handlers
  → Services (@Transactional) → Repository interfaces → JDBC → PostgreSQL

Business transaction → MonitoringChanged
  → after-commit listener → MonitoringPushHub → teacher socket

AttemptDeadlineWorker → ExamAttemptService → cùng đường hoàn tất/chấm bài
```

- Client: giao diện, forms/loading/errors, token theo tab và recovery; không tự quyết định điểm/deadline.
- Router/handler: parse/dispatch, identity từ session, DTO và protocol errors an toàn.
- Service: validation, ownership, lifecycle, transaction, grading và monitoring rules.
- Repository/database: SQL có tham số, CRUD, constraints, snapshots và persistence.

### Java design và consistency

Domain records, repository interfaces, JDBC implementations và services tách trách nhiệm bằng composition/DI. Exceptions nghiệp vụ được map sang protocol error, không gửi stack trace/password hash cho client.

Registry sử dụng concurrent structures. Response và push tới cùng socket được tuần tự hoá. Attempt được khoá ở database khi ghi/hoàn tất; submit và deadline finalizer dùng transaction để tránh chấm trùng. Partial unique index chỉ cho một attempt `IN_PROGRESS` mỗi `(exam_id, student_id)`, không cấm nhiều attempt đã hoàn tất.

Monitoring hiện push đồng bộ sau commit trên **một server**, chưa benchmark và không phải durable/distributed event broker.

## 3. Luồng sử dụng và novelty

**Teacher:** đăng nhập → tạo student → tạo draft → thêm câu hỏi/choices/đáp án đúng → kiểm tra readiness → publish → monitoring → review submissions/results → close khi cần.

**Student:** đăng nhập tài khoản được cấp → catalog/detail → xác nhận điều kiện → start/recover → chọn/lưu đáp án → submit hoặc hết giờ → history/result.

Đáp án đúng không được dùng để client chấm từng câu trong lúc thi. UI chờ save hoàn tất trước submit; điểm cuối lấy từ server.

Browser báo `TAB_HIDDEN`, `WINDOW_BLUR`, `DISCONNECTED`, `RECONNECTED`. Server kiểm tra ownership/active attempt, lưu signal và thời gian server, phân loại `INFO`/`WARNING`; ngưỡng cảnh báo hiện là **3**. Snapshot chỉ push sau commit, không push dữ liệu rollback. Ownership được kiểm tra trước subscription/delivery.

Teacher overview tải tối đa **500 records mới nhất**; tổng warning không đếm hai lần event ngưỡng suy ra. **Signal chỉ hỗ trợ giáo viên xem xét, không chứng minh gian lận.** Mất focus có thể hợp lệ; browser có thể bị đóng/can thiệp hoặc không gửi được event khi offline. Chưa có bằng chứng server-side offline detection đầy đủ.

Đóng góp kỹ thuật khác: snapshot/randomization có thể recover, server-authoritative deadline, save/submit consistency và race tests có điều khiển. Font/màu/logo không phải novelty kỹ thuật chính.

Chi tiết: [Monitoring](docs/monitoring-live-review.md), [Deadline/recovery](docs/deadline-and-recovery.md), [Session resume](docs/session-resume.md).

## 4. Database

Schema: [schema.sql](server/src/main/resources/schema.sql).

| Bảng | Mục đích |
|---|---|
| `users` | Profile, BCrypt hash, role và active |
| `exams` | Đề, thời lượng, trạng thái, teacher sở hữu |
| `questions`, `choices` | Câu hỏi, lựa chọn, đáp án đúng và điểm |
| `exam_attempts` | Student/exam, start/deadline, trạng thái và kết quả |
| `attempt_questions`, `attempt_choices` | Snapshot/thứ tự theo attempt |
| `attempt_answers` | Đáp án đã lưu |
| `suspicious_activities` | Signal/cảnh báo |

Quan hệ: teacher `users → exams → questions → choices`; student `users` + `exams → exam_attempts → snapshots/answers/activities`.

**Database cũ:** `CREATE TABLE IF NOT EXISTS` không sửa mọi constraint legacy. Nếu còn unique toàn trạng thái `(exam_id, student_id)`, đọc và chạy [migration thủ công](server/src/main/resources/db/migrations/001_attempt_active_uniqueness.sql) bằng table owner trên đúng database. Script tạo partial unique rồi bỏ constraint/index cũ. Chưa có Flyway/Liquibase tự chạy. Sao lưu dữ liệu quan trọng trước thay đổi schema; không xoá database để né lỗi.

## 5. Cài đặt và chạy local — PowerShell

### 5.1. Chuẩn bị

JDK 21/Maven trong PATH; Node.js tương thích Vite 8 và npm; PostgreSQL đang chạy; pgAdmin/psql; Git. Cần mạng để tải dependencies/Google Fonts.

```powershell
java -version
mvn -version
node -v
npm.cmd -v
```

Mọi `cd server`/`cd client` giả định bắt đầu từ repository root. Maven chạy tại nơi có `pom.xml` hoặc dùng `mvn -f server/pom.xml ...`.

### 5.2. Database mới

SQL mẫu chạy bằng tài khoản quản trị trong **pgAdmin, không phải PowerShell**:

```sql
CREATE ROLE online_exam_app LOGIN PASSWORD '<local-password>';
CREATE DATABASE online_exam OWNER online_exam_app;
```

Thay placeholder, không commit password thật. `CREATE DATABASE` chạy ngoài transaction block. Nếu role/database đã tồn tại, kiểm tra owner/quyền thay vì tạo lại. App user cần quyền tạo objects trong schema `public`.

### 5.3. Backend — terminal thứ nhất

```powershell
cd server
$env:DB_URL = "jdbc:postgresql://localhost:5432/online_exam"
$env:DB_USERNAME = "online_exam_app"
$env:DB_PASSWORD = "<local-password>"
mvn spring-boot:run
```

- Port **8081**, endpoint **`ws://localhost:8081/ws`**.
- Password không có default; env phải đặt trong chính terminal Maven.
- `spring.sql.init.mode=always`: Spring thực thi schema lúc khởi động.
- Allowed origin hiện là **`http://localhost:5173`**.
- 8080 không dùng vì máy phát triển có Jenkins; đổi port phải đổi đồng bộ URL client.

### 5.4. Giáo viên đầu tiên

**Chưa có default account hoặc bootstrap CLI.** Database rỗng cần quản trị provision teacher; `REGISTER` không phải cổng tự đăng ký/cấp quyền.

Sau khi schema đã tạo, sinh BCrypt bằng dependency server. Trong terminal `server`:

```powershell
mvn dependency:build-classpath "-Dmdep.outputFile=target/runtime-classpath.txt"
$examClasspath = (Get-Content target/runtime-classpath.txt -Raw).Trim()
jshell --class-path "$examClasspath"
```

Trong JShell:

```java
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
new BCryptPasswordEncoder().encode("<your-teacher-password>");
/exit
```

Dùng **hash BCrypt đã sinh**, không phải password thô, trong SQL quản trị trên database `online_exam`:

```sql
INSERT INTO public.users (username, password_hash, full_name, email, role)
VALUES ('teacher_demo', '<generated-bcrypt-hash>',
        'Demo Teacher', 'teacher_demo@example.com', 'TEACHER');
```

Dùng username/email chưa tồn tại và password demo riêng. Terminal/JShell history có thể giữ nội dung nhập; không dùng production password hoặc đưa hash/password vào Git/ảnh báo cáo. Đây là hướng dẫn provisioning thủ công; fresh-install trọn vẹn vẫn cần nghiệm thu.

Sau đó teacher đăng nhập tạo student tại `/teacher/students/new`.

### 5.5. Frontend — terminal thứ hai

```powershell
cd client
npm.cmd ci
# Chỉ copy khi chưa có .env.local; không ghi đè config đã chỉnh.
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
npm.cmd run dev
```

Config mẫu:

```dotenv
VITE_WEBSOCKET_URL=ws://localhost:8081/ws
```

Mở **http://localhost:5173**. Nếu Vite chuyển sang 5174, giải phóng 5173 hoặc chỉnh allowed origin server. `localhost`/`127.0.0.1` là hai origin khác nhau. Restart Vite sau đổi env.

### 5.6. Build

```powershell
# Tại repository root; cần PostgreSQL/env vì chạy cả tests
mvn -f server/pom.xml package
```

```powershell
# Tại client
npm.cmd run lint
npm.cmd run build
```

Output: `server/target`, `client/dist`. `vite preview` không tự được server cho phép vì origin mặc định khác 5173. Production hosting/HTTPS/WSS chưa phải deployment workflow đã nghiệm thu.

## 6. Routes chính

| Vai trò | Route |
|---|---|
| Chung | `/`, `/login` |
| Student catalog/detail | `/student/exams`, `/student/exams/:examId` |
| Room | `/student/exams/:examId/room/:attemptId` |
| History/result | `/student/history`, `/student/attempts/:attemptId/result` |
| Teacher dashboard/exams | `/teacher`, `/teacher/exams`, `/teacher/exams/new` |
| Overview/questions | `/teacher/exams/:examId`, `/teacher/exams/:examId/questions` |
| Submissions | `/teacher/exams/:examId/submissions`, `/teacher/submissions/:attemptId` |
| Tạo student | `/teacher/students/new` |
| Monitoring | `/teacher/monitoring`, `/teacher/monitoring/:examId`, `/teacher/activities` |
| Profile | `/student/profile`, `/teacher/profile` |

React protected routes hỗ trợ điều hướng; server vẫn kiểm tra quyền dữ liệu. Không có `/admin/students/new`.

## 7. WebSocket contract

Source of truth: [MessageType.java](server/src/main/java/vn/edu/hanu/exam/protocol/MessageType.java), [protocol.ts](client/src/websocket/protocol.ts), DTO/handler tương ứng. Request dùng **payload**, response dùng **data**. Một JSON là một WebSocket text message.

```json
{"requestId":"save-001","type":"SAVE_ANSWER","payload":{"attemptId":12,"questionId":34,"choiceId":56}}
```

Response minh hoạ, không phải dữ liệu thực nghiệm:

```json
{"requestId":"save-001","type":"ANSWER_SAVED","data":{"questionId":34,"choiceId":56,"savedAt":"2026-10-28T10:00:00Z"},"error":null}
```

```json
{"requestId":"register-001","type":"ERROR","data":null,"error":{"code":"FORBIDDEN","message":"Only teachers can create student accounts."}}
```

| Nhóm | Command → Response |
|---|---|
| Transport | `PING → PONG`; server event `CONNECTED` |
| Identity | `LOGIN → LOGGED_IN`, `RESUME_SESSION → SESSION_RESUMED`, `LOGOUT → LOGGED_OUT` |
| Registration | `REGISTER → REGISTERED` (teacher only) |
| Profile | `GET_PROFILE → PROFILE_DETAILS`, `UPDATE_PROFILE → PROFILE_UPDATED`, `CHANGE_PASSWORD → PASSWORD_CHANGED` |
| Student admin/dashboard | `GET_STUDENTS → STUDENTS`, `GET_STUDENT → STUDENT_DETAILS`, `GET_TEACHER_DASHBOARD → TEACHER_DASHBOARD` |
| Exam đọc/tạo | `CREATE_EXAM → EXAM_CREATED`, `GET_TEACHER_EXAMS → TEACHER_EXAMS`, `GET_EXAM → EXAM_DETAILS` |
| Lifecycle | `UPDATE_EXAM → EXAM_UPDATED`, `PUBLISH_EXAM → EXAM_PUBLISHED`, `CLOSE_EXAM → EXAM_CLOSED`, `DELETE_EXAM → EXAM_DELETED` |
| Question | `CREATE_QUESTION → QUESTION_CREATED`, `UPDATE_QUESTION → QUESTION_UPDATED`, `DELETE_QUESTION → QUESTION_DELETED`, `GET_EXAM_QUESTIONS → EXAM_QUESTIONS` |
| Catalog | `GET_AVAILABLE_EXAMS → AVAILABLE_EXAMS`, `GET_AVAILABLE_EXAM → AVAILABLE_EXAM_DETAILS` |
| Attempt | `START_EXAM → EXAM_STARTED`, `GET_EXAM_ATTEMPT → EXAM_ATTEMPT_DETAILS`, `SAVE_ANSWER → ANSWER_SAVED`, `SUBMIT_EXAM → EXAM_SUBMITTED` |
| Student results | `GET_ATTEMPT_HISTORY → ATTEMPT_HISTORY`, `GET_ATTEMPT_RESULT → ATTEMPT_RESULT` |
| Teacher review | `GET_EXAM_SUBMISSIONS → EXAM_SUBMISSIONS`, `GET_SUBMISSION_RESULT → SUBMISSION_RESULT` |
| Integrity | `REPORT_ACTIVITY → ACTIVITY_RECORDED`, `GET_EXAM_MONITORING → EXAM_MONITORING`, `GET_TEACHER_MONITORING → TEACHER_MONITORING` |

Errors giữ requestId, type `ERROR`; client không gửi server-only types. Monitoring `live: true` đăng ký; `live: false` dừng subscription tương ứng và trả snapshot; bỏ `live` là one-time snapshot. Push có `requestId: null`. Payload đầy đủ xem DTO và [monitoring contract](docs/monitoring-live-review.md).

## 8. Session/deadline

- Token ngẫu nhiên 32 byte Base64URL, expiry tám giờ; server giữ SHA-256 digest, user ID, password fingerprint và expiry trong memory.
- Client dùng `sessionStorage`; resume xác minh identity trước business commands; disconnect không revoke.
- Logout thành công revoke credential kể cả socket khác dùng chung token.
- Restart mất token, cần login lại; persisted attempt/answers/deadline còn nguyên.
- Disable/password change kiểm tra khi resume, chưa revoke tức thời toàn bộ active sockets.
- Deadline worker mặc định mỗi 5 giây, batch 100; config `exam.deadline.enabled`, `exam.deadline.interval-ms`.
- Timer browser chỉ hiển thị; UI đọc lại attempt khi hết giờ. Finalize không hứa đúng tức thời timer về 0 vì có worker interval/thời gian xử lý.

## 9. Kiểm thử và bằng chứng

```powershell
# Tại server, đã thiết lập DB credential trong chính terminal này
mvn test
mvn "-Dtest=RegistrationAuthorizationIntegrationTests" test
mvn "-Dtest=AttemptServiceIntegrationTests,MonitoringIntegrationTests" test
```

PowerShell cần nháy toàn đối số `-Dtest=...,...`; không ghép hai lệnh thành `testmvn`.

```powershell
# Tại client
npm.cmd run lint
npm.cmd run build
# Tại repository root
git diff --check
```

**Không chạy integration suite trên production/dữ liệu quan trọng.** Tests dùng PostgreSQL datasource; nên dùng database test riêng. Toàn suite chưa nghiệm thu trên database mới hoàn toàn. Fixture rollback/cleanup không phải lý do dùng dữ liệu thật tuỳ tiện.

### Kết quả ghi nhận gần nhất ngày 29/10/2026

| Kiểm tra | Bằng chứng |
|---|---|
| Full backend sau vá key sai khi đã có attempt | **302 tests, 0 failures, 0 errors, 0 skipped — BUILD SUCCESS** |
| Enrollment key và khoảng vào thi | 19 PostgreSQL/Spring integration tests; key/course/opening guards, không lộ bí mật, lưu giờ đóng khi tạo/sửa, từ chối sau giờ đóng, vào muộn vẫn đủ phút, verified resume/save/submit sau giờ đóng, chặn legacy chưa xác thực; key sai trên attempt đã xác thực bị chặn ở service và WebSocket; contract tests CREATE_EXAM thiếu key/giờ đóng |
| Registration authorization | 3 integration tests: anonymous/student bị chặn; teacher tạo student/hash đúng; payload role không nâng quyền |
| Attempt integration | 9 tests; deadline, idempotence, concurrent submit/finalizer có điều khiển |
| Monitoring | Owner-only push, identity/subscription, after-commit và rollback không push |
| Session | Expiry/revocation/disabled/password change; login/disconnect/resume/logout qua Spring router |
| Client | Lint và production build pass sau bổ sung Entry opens/closes ở teacher và student; còn cảnh báo bundle lớn hơn 500 kB, không phải lỗi build |
| Whitespace | Diff check không lỗi trong đợt kiểm tra; LF/CRLF warning không phải compile error |

Mock socket routing không tương đương browser/load test qua socket thật. Chỉnh font/logo đã build, chưa visual QA mọi viewport. Không dùng số modules build làm tiêu chí hoàn thành.

### Checklist nghiệm thu còn phải ghi actual result

| Kịch bản | Mong đợi | Trạng thái |
|---|---|---|
| Teacher tạo/publish → student thi → teacher review | Dữ liệu/điểm xuyên suốt đúng | Chưa có biên bản E2E đầy đủ |
| Refresh sau save | Cùng attempt/deadline/order/answer | Có tests thành phần; browser chưa hoàn tất |
| Mất mạng/reconnect | Resume trước commands; không báo save giả | Cần browser verification |
| Offline quá deadline | Server finalize, recover thấy result | Có integration tests; cần browser nghiệm thu |
| Restart | Login lại, dữ liệu đã lưu không mất | Cần manual checklist |
| Teacher khác truy cập đề/bài nộp | Từ chối, không rò dữ liệu | Có ownership tests; cần demo |
| Nhiều student cùng thi | Không lẫn identity/answers/results | Chưa benchmark multi-user |
| Responsive/zoom | Dễ đọc, không che controls | Chưa QA mọi màn hình |

### Test đồng thời trên một máy

Chạy một backend, một Vite và một PostgreSQL. Dùng browser profiles riêng, mỗi profile một tài khoản student khác nhau, thêm teacher theo dõi cùng exam. Nhiều tab cùng credential không chứng minh nhiều user độc lập. Đổi focus có thể tạo warning hợp lệ.

Benchmark cần WebSocket clients tự động login/start/save/submit với barrier đồng thời; ghi cấu hình, số câu hỏi/clients, latency p50/p95, throughput/errors và database consistency. Tăng 10/25/50 clients theo khả năng máy. **Chưa có số đo công bố**; mọi thành phần cùng máy giới hạn suy rộng production.

## 10. UI và repository

- Brand **EZAM**, logo `client/src/assets/logo.png` dùng qua `AppLogo`, favicon cùng ảnh.
- Tên EZAM student header: Outfit 800, gradient xanh; Google Fonts cần mạng, có fallback.
- Font nội dung: `client/src/index.css`; khai báo font family không có nghĩa font đã tải/cài trên máy.
- Typography: chú thích 12px, label/menu 14px, nội dung/input 16px ở thiết lập mặc định, dùng rem cho thang chuẩn hoá.
- Student header giữ logo/tên thương hiệu/navigation/account, bỏ title/subtitle dư.
- `stitch_university_online_examination_system/` chỉ là UI reference.

```text
client/src/
  assets/                 # logo/hình ảnh
  auth/                   # identity/tab token
  components/             # common/layout/routing/exam
  pages/                  # student/teacher/auth/profile
  websocket/              # transport/provider/protocol/subscriptions
server/
  src/main/java/vn/edu/hanu/exam/
    config/               # password/deadline
    domain/
    exception/
    protocol/             # envelopes/types
    repository/           # interfaces/JDBC
    service/              # exam/question/attempt/monitoring/submission...
    session/              # registry/resume credentials
    websocket/            # endpoint/DTO/handlers/push hub
  src/main/resources/
    application.properties
    schema.sql
    db/migrations/        # manual, không tự chạy
  src/test/java/
  pom.xml
docs/                     # deadline/session/monitoring
f2026-final-project/       # instructions/rubric
PHAN_CONG_NHIEM_VU_BACKEND.md
README.md
```

## 11. Troubleshooting

| Lỗi | Kiểm tra |
|---|---|
| Maven không nhận | PATH/terminal mới; lệnh là `mvn`, không phải `maven` |
| Không có POM | Vào server hoặc dùng `-f server/pom.xml` |
| Goal spring không tồn tại | `mvn spring-boot:run` |
| Port 8081 bận | Xác định đúng process/server cũ; không kill process lạ theo phỏng đoán |
| DB authentication failed | Credential đúng terminal/database/user/port |
| pgAdmin không thấy data | Đúng connection/database/schema chưa |
| WebSocket fail | Backend/URL/port/origin; Network → Socket, handshake thành công HTTP 101 |
| Socket dev đóng trước establish | Có thể StrictMode cleanup; kiểm tra socket cuối và hoạt động thật |
| Unique constraint legacy | Kiểm tra migration, không xoá dữ liệu thật để né lỗi |
| Login lại sau restart | Token memory mất; login rồi recover attempt |
| Logo/font chưa đổi | Reload/Ctrl+F5, kiểm tra asset/Google Fonts |

## 12. Giới hạn và phần việc còn lại

1. Hoàn tất browser acceptance, responsive/zoom QA, ghi actual results.
2. Benchmark WebSocket tái lập được với số đo correctness/concurrency/performance thật.
3. Nghiệm thu máy/database sạch, teacher provisioning, migration và dedicated test database.
4. Hoàn thiện ERD/class diagram, thread model, contract chi tiết và đóng góp thành viên.
5. Hoàn thiện report/demo/references/Compilatio/LMS; chưa xác nhận các việc này đã xong.

Hạn chế: token mất khi restart; monitoring synchronous/single-server; 500 records, chưa pagination toàn integrity history; browser signals không chống can thiệp tuyệt đối; passing threshold/leaderboard chưa nghiệm thu; chưa có quên mật khẩu tự phục vụ qua email.

Production cần HTTPS/WSS, XSS protection, authentication/storage phù hợp, rate limits, backup/operations và security review. `sessionStorage` không phải HttpOnly cookie; sign-out offline chỉ xoá token local, không bảo đảm revoke ngay server.

## 13. Yêu cầu môn học và bàn giao

Đối chiếu [Instructions](f2026-final-project/Instructions.md), [Rubric](f2026-final-project/Rubric.md): giải thích bài toán/requirements, kiến trúc, Java/OOP, networking, SQL/JDBC/transactions, concurrency, tests và contribution phù hợp, không dùng công nghệ chỉ để có tên.

- Report: Abstract, Introduction, Requirements, Architecture/Design, Implementation/Technical Details, Testing, Experimental Results, Discussion, Novelty, Limitations, Conclusion, References.
- Test case có input/expected/actual/status; chỉ công bố số liệu đo thật.
- Mỗi thành viên chạy/giải thích/debug được phần mình; đối chiếu phân công/Git, không suy đóng góp từ branch name.
- Khai báo/trích dẫn AI tools, thư viện, nguồn theo quy định; trách nhiệm vẫn thuộc nhóm.
- Tên report: `GroupXX_ProjectName_Report.docx`, ví dụ `GroupXX_EZAM_Report.docx`; thay group number trước nộp.
- Compilatio similarity **≤ 20%**; nộp source/report/README qua LMS theo deadline giảng viên.
- Không commit password/token thật, `.env.local`, dump chứa dữ liệu người dùng hoặc output build không cần thiết.

README không thay thế report cuối, benchmark hoặc nghiệm thu hệ thống.
