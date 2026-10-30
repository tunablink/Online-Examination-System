# EZAM — Online Examination System

Hệ thống thi trắc nghiệm trực tuyến: **React web client → Java server qua WebSocket → PostgreSQL**. Giáo viên quản lý đề/câu hỏi, cấp tài khoản sinh viên, giám sát và xem bài nộp; sinh viên làm bài, lưu đáp án, nộp bài và xem kết quả server.

**Cập nhật: 30/10/2026.** Đây là hiện trạng source, thay thế các bản tiến độ cũ trong README. Có source hoặc build/test pass không đồng nghĩa đã nghiệm thu đầy đủ.

### Định danh đăng nhập

- Chỉ đăng nhập bằng **mã sinh viên/mã giáo viên do nhà trường cấp + mật khẩu**. Database dùng `users.institutional_id`; request/response dùng `institutionalId`. Không còn cột `users.username`, không có fallback bằng username, email hay ID số nội bộ.
- Student ID trong form cấp/sửa tài khoản, danh sách, tìm kiếm, hồ sơ, monitoring và bài nộp dùng cùng định danh. `users.id` và các foreign key giữ nguyên để bảo toàn enrollment/bài làm. Role do server xác định, không do client chọn.
- Tài khoản cũ chưa gán mã giữ nguyên hồ sơ, mật khẩu, trạng thái và dữ liệu liên quan nhưng **chưa đăng nhập được**. Teacher gán Student ID thật tại trang quản lý sinh viên; để trống mật khẩu khi sửa sẽ giữ mật khẩu cũ. Không tự coi username cũ là mã nhà trường.
- Migration local đã xác nhận `teacher.demo` (user 95) → **TC4305**; student cũ chờ gán mã. Mật khẩu teacher không đổi. Restart và đăng nhập lại sau thay đổi contract; client/server cũ không tương thích.
- Đọc [ID-only login và migration](docs/institutional-id-login.md) trước khi chuyển database cũ. Hai script 005/006 chạy thủ công sau backup, không tự chạy bằng Flyway/Liquibase. `legacy_account_identifiers` chỉ lưu ánh xạ cũ phục vụ khôi phục, không được dùng để xác thực.

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

### Cập nhật luồng vào thi và nộp bài

- Trang `/student/exams/:examId` đã bỏ khối **Exam environment check**; **Before you begin** căn giữa, giới hạn chiều rộng và hiển thị giờ mở/đóng thành hai cột trên màn hình lớn, một cột trên màn hình nhỏ. Việc bỏ khối hiển thị không tắt activity monitoring hay các kiểm tra backend.
- Enrollment key không hiển thị sẵn trên trang. Trong khoảng được vào thi, student xác nhận quy định rồi bấm **Enter secure exam** để mở popup nhập key; **Start examination** mới gửi `START_EXAM`. Popup có Show/Hide, Cancel, Esc và báo lỗi tại chỗ; đóng popup xoá key đang nhập khỏi state của popup. Key không được lưu vào browser storage.
- Popup không tự tạo attempt hoặc bắt đầu tính giờ khi chỉ mở lên. Server xác nhận entry mới tạo attempt; nếu là lượt đã có thì giữ nguyên deadline. Nếu mất kết nối hoặc hết giờ nhận lượt khi popup đang mở, nút bắt đầu bị khoá. **Resume existing attempt** vẫn là thao tác riêng cho lượt đã xác thực hợp lệ.
- Phòng thi `/student/exams/:examId/room/:attemptId` chỉ còn một cặp **thời gian + Submit** ở thanh thông tin đề, thay cho cặp thời gian/**Review & submit** cũ; không lặp lại trên header thương hiệu.
- **Submit** mở popup xác nhận, chưa gửi bài ngay. Popup hiển thị số câu đã trả lời/chưa trả lời, cảnh báo còn câu trống và hai lựa chọn **Return to examination** / **Confirm submission**. Quay lại giữ nguyên bài làm; đồng hồ vẫn chạy khi popup mở.
- Xác nhận nộp chờ đáp án đang lưu được ACK; bị khoá khi mất kết nối, hết giờ hoặc đang gửi bài. Chặn gửi lặp bằng trạng thái/ref in-flight; lỗi hiển thị trong popup. Chỉ chuyển sang trang kết quả sau `EXAM_SUBMITTED` hợp lệ từ server. Khi hết giờ vẫn dùng deadline worker, không tự chấm ở client.
- **Tự kết thúc khi hết giờ:** đồng hồ về 00:00 khoá thao tác và hiển thị màn chờ; client đọc trạng thái ngay rồi kiểm tra lại mỗi 2 giây. Chỉ tự chuyển đến `/student/attempts/:attemptId/result` khi server trả `SUBMITTED`/`EXPIRED` kèm kết quả hợp lệ, khớp exam ID, attempt ID và trạng thái. Điều hướng dùng `replace`, đồng nhất với submit thủ công, không giữ phòng thi vừa kết thúc trong history entry đó.
- Refresh/reconnect vào phòng đã hoàn tất cũng theo xác nhận server rồi chuyển kết quả. Đồng hồ browser hết giờ không tự tạo điểm hoặc đủ điều kiện điều hướng; mất mạng/chưa có kết quả vẫn giữ phòng bị khoá và thông báo đang chờ. Callback đến trễ sau khi rời trang bị bỏ qua.

### Khoảng vào thi và thời lượng riêng của sinh viên

- Teacher đặt **Entry opens at** (`scheduledAt`), **Entry closes at** (`entryClosesAt`) và **Duration** riêng biệt khi tạo đề. Giờ đóng phải sau giờ mở. Edit của draft cho phép cập nhật khoảng này.
- Backend chỉ cho bắt đầu lượt mới khi `scheduledAt <= serverNow < entryClosesAt`, đồng thời vẫn yêu cầu course membership và enrollment key. Trước giờ mở trả `EXAM_NOT_OPEN`; tới giờ đóng trả `EXAM_ENTRY_CLOSED`.
- Deadline mỗi sinh viên = **thời điểm server tạo attempt + durationMinutes**; không lấy giờ đóng nhận lượt để cắt thời gian làm bài. Ví dụ mở 09:00–10:00, duration 60 phút, bắt đầu 09:50 thì deadline 10:50.
- Đóng nhận lượt mới **không tự chuyển đề sang CLOSED**. Attempt đã xác thực key được resume/lưu đáp án/nộp bài sau giờ đóng đến deadline riêng; refresh/reconnect không reset deadline. Attempt legacy chưa xác thực không được xác thực lần đầu sau giờ đóng.
- Tới `entryClosesAt`, đề tự ẩn khỏi dashboard và Upcoming của student. Backend lọc danh sách theo giờ database; frontend hẹn giờ mốc đóng gần nhất và kiểm tra lại khi quay về tab, không cần reload để ẩn. Chi tiết đề/phòng thi vẫn cho khôi phục lượt đã xác thực, không xoá bài làm hoặc cắt deadline riêng. Đề legacy chưa có giờ đóng không được tự suy đoán là hết hạn.
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
| Single-writer attempt | Backend chặn nhiều tab/session thao tác cùng lượt thi; heartbeat, reconnect grace và thu hồi quyền socket cũ |
| Profile | Xem/cập nhật hồ sơ và đổi mật khẩu |
| Exam lifecycle | Tạo/xem/sửa draft, publish readiness, publish, close, xoá draft |
| Questions | Tạo/xem/sửa/xoá câu hỏi và choices; ownership/status validation |
| Student catalog | Danh sách/chi tiết đề lấy từ server/PostgreSQL |
| Attempt | Start/recover; snapshot và thứ tự câu hỏi/choices ngẫu nhiên theo attempt |
| Enrollment key | Key theo từng đề, BCrypt hash; kiểm tra course/giờ mở; chỉ attempt đã xác thực key mới resume không cần nhập lại |
| Entry window | Giờ mở/đóng nhận lượt mới do teacher đặt; sinh viên bắt đầu hợp lệ vẫn có đủ duration riêng, kể cả sau giờ đóng nhận lượt |
| Answers | `SAVE_ANSWER`; UI chỉ báo lưu thành công sau ACK |
| Submission/grading | Popup xác nhận/tiếp tục thi, chờ save ACK, chống gửi lặp; server chấm dữ liệu đã lưu trong transaction, row lock và submit idempotent |
| Deadline | Worker server hoàn tất attempt quá hạn kể cả khi student offline; phòng thi tự chuyển kết quả sau snapshot kết thúc hợp lệ, không chỉ dựa vào timer |
| Results | Student xem lịch sử/kết quả của mình; teacher review bài nộp của đề mình sở hữu |
| Monitoring | Danh sách đề publish còn hạn, tìm kiếm và tự ẩn khi đóng nhận lượt; giám sát từng đề qua snapshot push sau commit, lọc/phân trang, reconnect và đối chiếu định kỳ |
| UI | EZAM, logo dùng chung, Tailwind, typography dễ đọc, font Outfit ở tên thương hiệu student header |
| Checks | Full backend gần nhất **328 tests pass trên schema test tách biệt**; frontend lint/build pass và **16 tests helpers client pass** (11 monitoring + 5 completion) |
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
INSERT INTO public.users (institutional_id, password_hash, full_name, email, role)
VALUES ('<school-issued-teacher-id>', '<generated-bcrypt-hash>',
        '<teacher-full-name>', '<teacher-email>', 'TEACHER');
```

Dùng Teacher ID thật/email chưa tồn tại và password demo riêng. Terminal/JShell history có thể giữ nội dung nhập; không dùng production password hoặc đưa hash/password vào Git/ảnh báo cáo. Đây là hướng dẫn provisioning thủ công; fresh-install trọn vẹn vẫn cần nghiệm thu.

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

### Teacher monitoring

- `/teacher/monitoring` lấy danh sách đề thật thuộc teacher đang đăng nhập. Chỉ hiển thị đề **PUBLISHED chưa đến `entryClosesAt`**, bao gồm đề sắp mở. Không hiện Draft, CLOSED hoặc đề đã đóng nhận lượt mới.
- Đúng mốc đóng, thẻ đề tự ẩn bằng timer; cập nhật lại khi focus/quay về tab. Đề legacy chưa cấu hình giờ đóng giữ chính sách không tự suy đoán hạn. Tìm kiếm chỉ áp dụng trên danh sách còn hiển thị, theo tên đề, course hoặc exam ID.
- Thẻ đề hiển thị tên/course, giờ mở, giờ đóng nhận lượt và duration. Không dùng nhãn Published để khẳng định đề đang mở hoặc student đang online.
- `/teacher/monitoring/:examId` có tên đề/course, thống kê total/in progress/submitted/expired/warnings, bảng student với deadline và tín hiệu gần nhất. Tìm kiếm theo tên/mã sinh viên/attempt ID, lọc trạng thái/có cảnh báo; ưu tiên lượt đang làm, sau đó số cảnh báo; phân trang **10 lượt/trang**.
- Màn từng đề có **All examinations**, **Exam details**, **Submissions** và **Sync data**. Đường dẫn trực tiếp vẫn xem được đề đã đóng entry để theo dõi attempt còn thời gian riêng hoặc xem lại dữ liệu, với quyền sở hữu do backend kiểm tra.
- Snapshot cập nhật qua WebSocket push; đối chiếu lại mỗi **30 giây**, khi focus và đăng ký lại sau reconnect. Hiển thị trạng thái kết nối và thời điểm nhận snapshot; có loading/empty/error/retry và xử lý exam ID không hợp lệ.
- Chuyển đề không tái sử dụng snapshot/filter của đề trước; callback sau khi rời route bị bỏ qua. Response request đến trễ không ghi đè push hợp lệ đã nhận mới hơn trong lúc chờ.
- **IN_PROGRESS là trạng thái lượt thi, không phải online status.** Sinh viên chưa bắt đầu không xuất hiện trong bảng. Không quay camera/ghi màn hình; signals cần teacher xem xét, không tự chứng minh gian lận.
- Logic UI, kết nối và validation được tách trong [ExamMonitoringPage.tsx](client/src/pages/ExamMonitoringPage/ExamMonitoringPage.tsx), [MonitoringExamPicker.tsx](client/src/pages/ExamMonitoringPage/MonitoringExamPicker.tsx), [useExamMonitoring.ts](client/src/pages/ExamMonitoringPage/useExamMonitoring.ts) và [monitoringData.ts](client/src/pages/ExamMonitoringPage/monitoringData.ts). Contract/checklist: [Live monitoring](docs/monitoring-live-review.md).

### Bài nộp và kết quả bên teacher

- `/teacher/exams/:examId/submissions`: danh sách lượt thi/bài nộp của **một đề cụ thể**, ở [TeacherSubmissionPage.tsx](client/src/pages/TeacherSubmissionPage/TeacherSubmissionPage.tsx).
- `/teacher/submissions/:attemptId`: kết quả chi tiết một lượt thi, ở [TeacherSubmissionResultPage.tsx](client/src/pages/TeacherSubmissionResultPage/TeacherSubmissionResultPage.tsx).
- Teacher đi từ nút **Submissions** trong monitoring của đề. Đây không phải trang lịch sử chung của toàn bộ sinh viên/tất cả đề; student xem lịch sử cá nhân tại `/student/history`.

### Các nút đã tinh gọn

- `/teacher/exams`: bỏ **Refresh** cạnh **Create exam**.
- `/teacher/exams/:examId/submissions`: bỏ **Refresh**, giữ ô **Total attempts**.
- `/teacher/monitoring`: bỏ **Sync examinations** và bộ lọc Draft/Closed; giữ tìm kiếm, **Open monitoring** và **Try again** khi request lỗi.
- Việc bỏ các nút này không bỏ cơ chế tải dữ liệu khi vào trang/kết nối lại. Nút **Sync data** ở màn monitoring từng đề vẫn được giữ, cùng push và đối chiếu định kỳ.

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
| Attempt ownership | `HEARTBEAT_ATTEMPT → ATTEMPT_HEARTBEAT`, `RELEASE_ATTEMPT → ATTEMPT_RELEASED`; backend kiểm tra socket giữ quyền |
| Student results | `GET_ATTEMPT_HISTORY → ATTEMPT_HISTORY`, `GET_ATTEMPT_RESULT → ATTEMPT_RESULT` |
| Teacher review | `GET_EXAM_SUBMISSIONS → EXAM_SUBMISSIONS`, `GET_SUBMISSION_RESULT → SUBMISSION_RESULT` |
| Integrity | `REPORT_ACTIVITY → ACTIVITY_RECORDED`, `GET_EXAM_MONITORING → EXAM_MONITORING`, `GET_TEACHER_MONITORING → TEACHER_MONITORING` |

Errors giữ requestId, type `ERROR`; client không gửi server-only types. Monitoring `live: true` đăng ký; `live: false` dừng subscription tương ứng và trả snapshot; bỏ `live` là one-time snapshot. Push có `requestId: null`. Payload đầy đủ xem DTO và [monitoring contract](docs/monitoring-live-review.md).

## 8. Session/deadline

- Mỗi attempt đang làm chỉ có một WebSocket giữ quyền đọc phòng/lưu đáp án/nộp bài/gửi activity. Tab khác nhận `ATTEMPT_IN_USE`: “This examination is already open in another tab/session.”
- Room gửi `HEARTBEAT_ATTEMPT` mỗi 10 giây; lease sống 45 giây không renew. Socket đã đóng có grace 30 giây; reconnect cùng credential hợp lệ khôi phục ngay khi backend đã nhận close. Credential khác phải chờ grace/TTL rồi retry. Tab cũ bị chặn ghi sau takeover.
- Rời phòng gửi `RELEASE_ATTEMPT` best-effort; submit/logout giải phóng quyền. Refresh/reconnect giữ attempt, đáp án đã lưu và deadline gốc. Registry hiện dành cho một Java server, không phải distributed lock. Chi tiết và checklist: [Single-session attempt](docs/attempt-single-session.md).
- Token ngẫu nhiên 32 byte Base64URL, expiry tám giờ; server giữ SHA-256 digest, user ID, password fingerprint và expiry trong memory.
- Client dùng `sessionStorage`; resume xác minh identity trước business commands; disconnect không revoke.
- Logout thành công revoke credential kể cả socket khác dùng chung token.
- Restart mất token, cần login lại; persisted attempt/answers/deadline còn nguyên.
- Disable/password change kiểm tra khi resume, chưa revoke tức thời toàn bộ active sockets.
- Deadline worker mặc định mỗi 5 giây, batch 100; config `exam.deadline.enabled`, `exam.deadline.interval-ms`.
- Timer browser chỉ hiển thị; UI đọc lại attempt khi hết giờ. Finalize không hứa đúng tức thời timer về 0 vì có worker interval/thời gian xử lý.
- Hết giờ: khoá thao tác, chờ server trả snapshot SUBMITTED/EXPIRED kèm kết quả khớp exam/attempt/status rồi tự chuyển sang `/student/attempts/:attemptId/result` bằng replace, đồng nhất với submit thủ công. Refresh/reconnect vào phòng đã kết thúc cũng chuyển theo xác nhận server; mất mạng hoặc chưa có kết quả thì giữ màn chờ, không điều hướng chỉ vì timer về 0. Guards được kiểm tra bằng `node --test tests/attemptCompletion.test.mjs` tại client (5 tests).

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
# Guards của monitoring và điều hướng khi bài thi hoàn tất
node --test tests/monitoringData.test.mjs tests/attemptCompletion.test.mjs
# Tại repository root
git diff --check
```

**Không chạy integration suite trên production/dữ liệu quan trọng.** Tests dùng PostgreSQL datasource; nên dùng database test riêng. Toàn suite chưa nghiệm thu trên database mới hoàn toàn. Fixture rollback/cleanup không phải lý do dùng dữ liệu thật tuỳ tiện.

### Kết quả ghi nhận gần nhất ngày 30/10/2026

| Kiểm tra | Bằng chứng |
|---|---|
| Full backend sau ID-only, ẩn đề hết hạn và single-session attempt | **328 tests, 0 failures, 0 errors, 0 skipped — BUILD SUCCESS** trên schema test riêng |
| Phạm vi bằng chứng backend | 328 là lần chạy backend đầy đủ gần nhất trước các chỉnh sửa UI mới; không phải báo cáo chạy lại Maven cho từng lần sửa giao diện/README |
| Enrollment key và khoảng vào thi | 19 PostgreSQL/Spring integration tests; key/course/opening guards, không lộ bí mật, lưu giờ đóng khi tạo/sửa, từ chối sau giờ đóng, vào muộn vẫn đủ phút, verified resume/save/submit sau giờ đóng, chặn legacy chưa xác thực; key sai trên attempt đã xác thực bị chặn ở service và WebSocket; contract tests CREATE_EXAM thiếu key/giờ đóng |
| Registration authorization | 3 integration tests: anonymous/student bị chặn; teacher tạo student/hash đúng; payload role không nâng quyền |
| Attempt integration | 9 tests; deadline, idempotence, concurrent submit/finalizer có điều khiển |
| Monitoring | Owner-only push, identity/subscription, after-commit và rollback không push |
| Session | Expiry/revocation/disabled/password change; login/disconnect/resume/logout qua Spring router |
| Client hiện tại | Full lint và production build pass sau hoàn thiện monitoring, lọc đề còn hạn, bỏ nút refresh/sync theo yêu cầu và điều hướng kết quả khi hết giờ; còn cảnh báo bundle lớn hơn 500 kB, không phải lỗi build |
| Monitoring helpers | **11 tests pass**: validation snapshot/activity, chống nhầm exam, ID legacy, tìm kiếm/lọc/sắp xếp, draft/closed/hết hạn, đúng mốc đóng và timezone |
| Attempt completion helpers | **5 tests pass**: server xác nhận EXPIRED/SUBMITTED mới chuyển, timer browser không đủ điều kiện, thiếu/sai result bị từ chối, khớp exam/attempt và trạng thái trong result |
| Client regression gần nhất | Chạy hai file tests trên cùng lệnh: **16 tests, 16 pass, 0 fail**. Đây là unit tests helpers, không phải browser navigation/E2E tests |
| Whitespace | Diff check không lỗi trong đợt kiểm tra; LF/CRLF warning không phải compile error |

Mock socket routing không tương đương browser/load test qua socket thật. Chỉnh font/logo đã build, chưa visual QA mọi viewport. Không dùng số modules build làm tiêu chí hoàn thành.

### Checklist nghiệm thu còn phải ghi actual result

| Kịch bản | Mong đợi | Trạng thái |
|---|---|---|
| Teacher tạo/publish → student thi → teacher review | Dữ liệu/điểm xuyên suốt đúng | Chưa có biên bản E2E đầy đủ |
| Popup vào thi | Chỉ mở trong khoảng cho phép sau xác nhận quy định; key đúng mới vào, sai báo tại chỗ | Lint/build pass; browser checklist chưa hoàn tất |
| Key sai sau khi đã có attempt hợp lệ | Không âm thầm resume; trả INVALID_ENROLLMENT_KEY, không reset deadline | Có service/WebSocket regression tests; cần browser nghiệm thu |
| Popup nộp → Return to examination | Không gửi SUBMIT_EXAM, giữ đáp án và deadline; đồng hồ vẫn chạy | Source đã triển khai; cần browser nghiệm thu |
| Popup nộp → Confirm submission | Chờ save ACK, không gửi lặp, lỗi tại chỗ; ACK nộp hợp lệ mới chuyển kết quả | Lint/build pass; cần browser nghiệm thu, gồm mất mạng/hết giờ khi popup mở |
| Refresh sau save | Cùng attempt/deadline/order/answer | Có tests thành phần; browser chưa hoàn tất |
| Mất mạng/reconnect | Resume trước commands; không báo save giả | Cần browser verification |
| Cùng student mở một attempt ở hai tab/session | Chỉ một socket được đọc phòng/ghi đáp án/nộp/gửi activity; socket khác nhận ATTEMPT_IN_USE; reconnect cùng credential sau close khôi phục, socket cũ không ghi sau takeover | Có registry/concurrency/WebSocket integration tests trong lần chạy backend 328 tests; cần browser nghiệm thu grace/TTL |
| Offline quá deadline | Server finalize, recover thấy result | Có integration tests; cần browser nghiệm thu |
| Hết giờ khi đang ở phòng thi | Khoá thao tác; đợi snapshot terminal/result đúng rồi tự chuyển trang kết quả, không chờ student bấm Submit | 5 completion helper tests + lint/build pass; cần browser nghiệm thu |
| Refresh/reconnect phòng đã hoàn tất | Nhận kết quả từ server rồi replace sang trang result; không reset deadline hoặc tạo attempt mới | Source đã triển khai; cần browser nghiệm thu, gồm offline/chưa có kết quả |
| Teacher monitoring | Chỉ đề publish chưa đóng entry trong danh sách; đúng mốc tự ẩn; start/report/finalize cập nhật màn từng đề và reconnect đăng ký lại | 11 helper tests, backend monitoring tests ở lần chạy trước; cần browser nghiệm thu hai phiên |
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

### File phụ trách luồng thi của student

| File | Trách nhiệm |
|---|---|
| [ExamDetailPage.tsx](client/src/pages/ExamDetailPage/ExamDetailPage.tsx) | Trang trước khi thi dùng chung mọi exam ID: thông tin đề, Before you begin, điều kiện mở popup và Resume |
| [ExamEntryDialog.tsx](client/src/components/exam/ExamEntryDialog.tsx) | Popup nhập enrollment key; native dialog, focus modal, Cancel/Esc và phản hồi lỗi |
| [ExamRoomPage.tsx](client/src/pages/ExamRoomPage/ExamRoomPage.tsx) | Phòng thi dùng chung exam/attempt ID; timer theo deadline, save/submit, monitoring và điều hướng kết quả |
| [SubmitExamDialog.tsx](client/src/pages/ExamRoomPage/components/SubmitExamDialog.tsx) | Popup xác nhận nộp; số câu đã/chưa trả lời, quay lại, pending/error và khoá xác nhận khi chưa thể nộp |
| [QuestionPanel.tsx](client/src/pages/ExamRoomPage/components/QuestionPanel.tsx) | Hiển thị câu hỏi, choices, lựa chọn đáp án và flag; không hiện nhãn Single Choice hoặc icon check bổ sung cho lựa chọn |
| [attempt.ts](client/src/types/attempt.ts) | Types/validation; getConfirmedAttemptResult chỉ chấp nhận snapshot terminal và nested result khớp đề, lượt thi và trạng thái trước điều hướng |
| [useAttemptSession.ts](client/src/pages/ExamRoomPage/useAttemptSession.ts) | Heartbeat quyền làm bài, xử lý xung đột và release khi rời attempt; không release chỉ vì loading/reconnect thay đổi |
| [attemptCompletion.test.mjs](client/tests/attemptCompletion.test.mjs) | 5 unit tests guards hoàn tất bài thi; không thay thế browser navigation tests |

Hai popup dùng native `<dialog>` và khoá cuộn nền khi mở; không đóng bằng Cancel/Esc trong lúc request tương ứng đang pending. Đã kiểm tra lint/build, chưa coi đây là bằng chứng visual/accessibility QA trên mọi browser/viewport. Các thay đổi UI không thay thế quyền truy cập, kiểm tra key, deadline hay grading ở Java server.

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
