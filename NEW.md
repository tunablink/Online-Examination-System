# Online Examination System

> **Java Programming Project – Topic 4: Java Concurrent Application**
>
> **Updated Architecture:** React Client + WebSocket + Java Server + Database

---

## 1. Project Overview

### 1.1. Project Name

**Online Examination System**

### 1.2. Project Topic

**Topic 4 – Java Concurrent Application**

The project is an online examination system in which multiple students can participate in an examination concurrently.

The system is designed around a **Client-Server architecture**:

```text
React Client
     │
     │ WebSocket
     ▼
Java Server
     │
     ▼
Database
```

The Java Server is the core of the project and is responsible for:

- Authentication and authorization
- Examination management
- Real-time examination communication
- Concurrent user/session processing
- Examination timing and submission
- Result processing
- Anti-cheating / suspicious-activity handling
- Database communication

The Client provides the user interface and communicates with the Java Server through **WebSocket**.

---

# 2. Important Project Decision

## 2.1. Previous Architecture

The original project direction was:

```text
Java Client
     │
     │ Socket
     ▼
Java Server
     │
     ▼
Database
```

The entire client-side interface was planned to be implemented using Java technologies.

## 2.2. Updated Architecture

After clarification with the lecturer, the architecture has been updated to:

```text
                    ┌──────────────────┐
                    │   React Client   │
                    │                  │
                    │ Student / Teacher│
                    └────────┬─────────┘
                             │
                         WebSocket
                             │
                             ▼
                    ┌──────────────────┐
                    │   Java Server    │
                    │                  │
                    │ OOP              │
                    │ Concurrency      │
                    │ Business Logic  │
                    │ Security        │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │    Database      │
                    └──────────────────┘
```

### Lecturer clarification

The lecturer clarified that:

- The GUI depends on the system architecture.
- Because the system follows a Client-Server architecture, **only the Server is required to be implemented in Java**.
- The Client can be implemented using **React**.
- Client and Server should communicate using **WebSocket**.
- The group should consider a meaningful **novelty** because this is an online examination system.
- Possible directions suggested by the lecturer include:
  - Anti-cheating / preventing cheating during examinations.
  - Programming/code-based examinations instead of only multiple-choice examinations.

Therefore, the project should **not** be treated as a normal CRUD online exam website.

---

# 3. Problem Statement

Traditional online examination systems commonly provide basic functions such as:

- Login
- Display examination questions
- Submit answers
- Automatically calculate scores
- Display results

However, a basic examination system does not sufficiently demonstrate the concurrency and technical aspects required by Topic 4.

The project therefore aims to develop an online examination system where:

1. Multiple students can participate in an examination simultaneously.
2. The Java Server can process multiple concurrent users.
3. Real-time communication is handled using WebSocket.
4. Examination state is maintained consistently.
5. Shared resources are protected against concurrency problems.
6. The system can detect or record suspicious examination activities.
7. The project contains a meaningful technical contribution beyond basic CRUD functionality.

---

# 4. Project Objectives

The main objectives are:

- Build a complete Online Examination System.
- Use a **Java Server** as the core application server.
- Use **React** as the client-side interface.
- Use **WebSocket** for real-time Client-Server communication.
- Demonstrate Java OOP principles.
- Demonstrate multithreading and concurrency.
- Process multiple examination sessions/users concurrently.
- Handle shared resources safely.
- Apply appropriate synchronization/concurrent data structures.
- Store examination data in a database.
- Provide examination management for teachers.
- Provide examination participation and result viewing for students.
- Design and implement at least one meaningful technical novelty.
- Test concurrency, correctness, reliability, and system behavior.

---

# 5. Main Users

The initial system contains two main roles.

## 5.1. Student

Students can:

- Register / log in.
- View available examinations.
- View examination information.
- Join an examination.
- Receive examination questions.
- Answer questions.
- Submit answers.
- Receive time/status notifications.
- Automatically submit when the examination ends.
- View examination results.
- View examination history.
- Have examination activities recorded for security monitoring.

## 5.2. Teacher

Teachers can:

- Log in.
- Create examinations.
- Edit examinations.
- Delete examinations.
- Create questions.
- Edit questions.
- Delete questions.
- Configure examination duration.
- Publish/unpublish examinations.
- View student submissions.
- View results.
- Monitor examination sessions.
- Review suspicious activity reports.

---

# 6. Core Functional Requirements

## 6.1. Authentication

- User registration.
- User login.
- Logout.
- Role-based access.
- Student/Teacher authorization.

## 6.2. Examination Management

Teacher can:

- Create an examination.
- Set examination title and description.
- Set duration.
- Add questions.
- Edit questions.
- Remove questions.
- Publish an examination.
- Close an examination.

## 6.3. Examination Participation

Student can:

- View available examinations.
- Start an examination.
- Receive questions.
- Answer questions.
- Change answers before submission.
- Submit the examination.
- Receive the final result when available.

## 6.4. Real-Time Communication

The Client and Server communicate through WebSocket.

Possible real-time events:

```text
Client → Server
- JOIN_EXAM
- ANSWER_QUESTION
- SUBMIT_EXAM
- HEARTBEAT
- LEAVE_EXAM

Server → Client
- EXAM_STARTED
- QUESTION_DATA
- TIME_UPDATE
- WARNING
- EXAM_SUBMITTED
- RESULT
- EXAM_ENDED
```

The exact message protocol will be finalized during implementation.

---

# 7. Concurrency Requirements

Concurrency is a **core part of this project**, not an optional decoration.

The system should support scenarios such as:

```text
Student A ──┐
Student B ──┤
Student C ──┤
Student D ──┼──> Java Server
Student E ──┤
Student F ──┘
```

Multiple students may:

- Connect at the same time.
- Start an examination at the same time.
- Answer questions concurrently.
- Submit examinations concurrently.
- Request results concurrently.

## 7.1. Topics to Demonstrate

The project should consider:

- `Thread`
- `Runnable`
- Thread lifecycle
- Thread Pool
- `ExecutorService`
- Synchronization
- Shared resources
- Race conditions
- Concurrent collections
- Safe state management

The exact mechanisms should be selected according to the actual architecture.

## 7.2. Shared Resources

Potential shared resources include:

- Active examination sessions.
- Examination state.
- Student session state.
- Submission state.
- Result processing.
- Online user/session tracking.
- Examination timer/state.

## 7.3. Race Condition Examples

Potential situations:

```text
Student A ──┐
            ├──> Submit Exam
Student B ──┘
```

or:

```text
Thread 1 ──> Update Exam State
Thread 2 ──> Update Exam State
```

The implementation must identify where race conditions may occur and choose appropriate mechanisms to prevent inconsistent state.

---

# 8. WebSocket Architecture

## 8.1. Why WebSocket?

The system is an online examination system and requires real-time communication.

WebSocket can be used for:

- Real-time exam events.
- Time/status updates.
- Immediate server notifications.
- Exam submission notifications.
- Connection/session management.
- Communication between many clients and the Java Server.

## 8.2. High-Level Flow

```text
React Client
     │
     │ WebSocket Connection
     ▼
Java WebSocket Server
     │
     ├── Authentication
     ├── Exam Service
     ├── Session Manager
     ├── Concurrency Manager
     ├── Anti-Cheat Module
     └── Result Service
             │
             ▼
          Database
```

---

# 9. Proposed System Architecture

```text
                         React Client
                              │
                     WebSocket Connection
                              │
                              ▼
                  ┌──────────────────────┐
                  │     Java Server      │
                  │                      │
                  │  WebSocket Layer     │
                  │          │           │
                  │          ▼           │
                  │   Application Layer  │
                  │                      │
                  │ ┌──────────────────┐ │
                  │ │ Authentication   │ │
                  │ │ Exam Management  │ │
                  │ │ Exam Session     │ │
                  │ │ Submission       │ │
                  │ │ Result           │ │
                  │ │ Anti-Cheat       │ │
                  │ └──────────────────┘ │
                  │          │           │
                  │          ▼           │
                  │   Concurrency Layer  │
                  │                      │
                  └──────────┬───────────┘
                             │
                             ▼
                         Database
```

The architecture should maintain separation of concerns.

---

# 10. Suggested Java Server Modules

The final structure may be adjusted during implementation.

```text
server/
└── src/
    ├── config/
    ├── websocket/
    ├── controller/
    ├── service/
    ├── repository/
    ├── model/
    ├── dto/
    ├── concurrency/
    ├── security/
    ├── exception/
    └── util/
```

## 10.1. WebSocket Layer

Responsible for:

- Accepting WebSocket connections.
- Receiving messages.
- Sending messages.
- Managing connection lifecycle.

## 10.2. Service Layer

Responsible for:

- Authentication.
- Examination logic.
- Submission processing.
- Result calculation.
- Examination session management.

## 10.3. Concurrency Layer

Responsible for:

- Thread management.
- Thread Pool.
- Concurrent task execution.
- Shared resource management.
- Synchronization where necessary.

## 10.4. Repository Layer

Responsible for:

- Database access.
- CRUD operations.
- Query execution.
- Transaction handling where appropriate.

---

# 11. Database

A relational database will be used to persist system data.

Possible entities:

```text
User
 ├── Student
 └── Teacher

Exam
Question
Option / Answer
ExamAttempt
StudentAnswer
Result
SuspiciousActivity
```

Possible relationships:

```text
User
  │
  ├──────────< ExamAttempt >──────── Exam
  │                    │
  │                    └──────< StudentAnswer
  │
  └──────────< Exam (Teacher creates Exam)

Exam
  │
  └──────────< Question
```

The final database schema will be designed after the functional requirements are finalized.

---

# 12. Novelty / Technical Contribution

A basic Online Examination System is not enough.

The project must identify a meaningful technical contribution.

The lecturer suggested two possible directions:

### Direction A – Anti-Cheating

Possible features to investigate:

- Detect leaving/re-entering the examination session.
- Detect abnormal connection behavior.
- Track suspicious examination events.
- Detect abnormal answer/submission behavior.
- Generate a suspicious-activity record for teachers.
- Provide a monitoring dashboard.

Important:

> The group should implement only mechanisms that can be technically justified, tested, and explained during the presentation/viva.

### Direction B – Code-Based Examination

Instead of only multiple-choice questions, the system may support programming questions.

Example:

```text
Question:
Write a Java method that sorts an integer array.

Student submits code.

        ↓

Java Server
        ↓
Test Cases
        ↓
Code Execution / Evaluation
        ↓
Result
```

This direction is potentially more technically challenging, especially because executing student-submitted code introduces security concerns.

Therefore, the group must evaluate the feasibility before choosing this direction.

### Current Decision

The group has not finalized the final novelty yet.

The novelty should be selected before detailed implementation begins.

---

# 13. Possible Anti-Cheating Monitoring Model

A possible model is:

```text
Student
   │
   ├── Examination Activity
   │
   ├── Connection Events
   │
   ├── Submission Events
   │
   └── Suspicious Events
           │
           ▼
     Java Server
           │
           ▼
  Suspicious Activity Manager
           │
           ▼
     Teacher Dashboard
```

Example activity records:

```text
STUDENT_CONNECTED
EXAM_STARTED
EXAM_LEFT
EXAM_RECONNECTED
ANSWER_CHANGED
EXAM_SUBMITTED
EXAM_TIMEOUT
SUSPICIOUS_ACTIVITY
```

## 13.1. Recommended Detection Rules

For the basic version, the client may report the following observable events while an attempt is active:

- `TAB_HIDDEN`: the examination tab stays hidden longer than a configured threshold or is hidden repeatedly.
- `WINDOW_BLUR`: the examination window repeatedly loses focus.
- `FULLSCREEN_EXIT`: the student exits required fullscreen mode and does not return within the grace period.
- `HEARTBEAT_TIMEOUT`: the server stops receiving heartbeats for the configured interval.
- `DISCONNECTED` / `RECONNECTED`: the active attempt loses its WebSocket connection, especially repeatedly or for a long duration.
- `MULTIPLE_SESSION`: the same student account has more than one active examination session.
- `DEVICE_CHANGED`: the active attempt resumes from a materially different client fingerprint or network context.
- `PROCTOR_DEVICE_DISABLED`: a required camera or microphone is denied, disabled, or stops producing a signal.
- `FORBIDDEN_ACTION`: the client detects blocked copy, paste, screen-capture, context-menu, or restricted shortcut attempts when lockdown rules are enabled.
- `ABNORMAL_ANSWER_ACTIVITY`: an unusually high number of answer changes in a short interval or completion far faster than a configured minimum duration.
- `LATE_OR_DUPLICATE_SUBMISSION`: a submission is received after the deadline or more than once.

Each event should include the attempt ID, student ID, event type, server timestamp, severity, and a short technical description. A single focus loss, short disconnection, or device error must not automatically be treated as cheating. Events are evidence for teacher review; only repeated or high-confidence signals should produce a high-severity warning. Thresholds must be documented, server timestamps should be authoritative, and camera/microphone collection requires clear consent and a retention policy.

---

# 14. React Client

The React application will provide the user interface.

Suggested structure:

```text
client/
├── src/
│   ├── components/
│   ├── pages/
│   ├── layouts/
│   ├── services/
│   ├── websocket/
│   ├── hooks/
│   ├── context/
│   ├── utils/
│   └── assets/
└── ...
```

## 14.1. Student Pages

Possible pages:

```text
Login
Register
Student Dashboard
Available Exams
Exam Information
Exam Room
Exam Result
Exam History
Profile
```

## 14.2. Teacher Pages

Possible pages:

```text
Teacher Dashboard
Exam Management
Create Exam
Edit Exam
Question Management
Exam Monitoring
Student Submissions
Results
Suspicious Activity
Profile
```

## 14.3. Optional Demonstration-Only UI Features

The current UI contains several controls that are primarily visual or demonstrative. They do not yet have complete frontend behavior or corresponding Java Server functionality:

- Report ambiguity.
- Calculator.
- Formula reference.
- Digital scratchpad.
- Examination section overview.
- Global search in the teacher header.
- Notifications.
- Language switching.

These features are **optional**. The team may implement them if they provide useful project value and sufficient development time is available, or leave/remove them without affecting the core examination requirements. Core functions such as examination attempts, answer saving, submission, server-authoritative timing, results, monitoring, and anti-cheating should be prioritized first.

## 14.4. Minimum Page Gap Analysis

Compared with common examination systems, the current UI should add or complete the following pages for a basic usable release:

- Student Profile and Teacher Profile: view institution-managed identity data and change permitted account fields.
- Teacher Submissions / Results: list attempts for an examination with status, submission time, score, and integrity flags.
- Attempt Detail / Review: allow a teacher to review one student's answers and allow a student to review released answers according to the exam's review policy.
- Student Directory / Student Detail: separate account creation from browsing an individual student's basic account status and examination history.

A separate calendar page is not required for the basic version if start time, end time, and availability are clearly shown on the student dashboard. Advanced analytics, course management, messaging, notification center, and administrative settings remain outside the minimum scope.

## 14.5. Profile Field Policy

Two role-specific profile routes are required:

- Student Profile: full name, student ID/username, institutional email, role, account status, and creation date are read-only. The student may change the password after confirming the current password.
- Teacher Profile: full name, staff username, institutional email, role, account status, and creation date are read-only. The teacher may edit the department and may change the password after confirming the current password.

Identity fields must not be editable by the user because they are institution-managed. Passwords are never returned to the client. Password changes must be validated and stored only as secure password hashes.

The final page list will be refined after the functional requirements and novelty are finalized.

---

# 15. WebSocket Message Design

Messages should use a clearly defined format.

Example:

```json
{
  "type": "ANSWER_QUESTION",
  "examId": 101,
  "questionId": 20,
  "answer": "A"
}
```

Example server response:

```json
{
  "type": "TIME_UPDATE",
  "examId": 101,
  "remainingSeconds": 1250
}
```

Possible message types:

```text
AUTHENTICATE
JOIN_EXAM
LEAVE_EXAM
QUESTION_DATA
ANSWER_QUESTION
SUBMIT_EXAM
TIME_UPDATE
WARNING
SUSPICIOUS_ACTIVITY
EXAM_ENDED
RESULT
ERROR
```

The protocol should be documented and consistently implemented by both Client and Server.

---

# 16. OOP Design Requirements

The project should demonstrate:

- Encapsulation.
- Abstraction.
- Inheritance where appropriate.
- Polymorphism.
- Interfaces.
- Composition.
- Exception handling.

Possible abstractions:

```text
User
 ├── Student
 └── Teacher
```

Possible interfaces:

```text
ExamService
AuthenticationService
SubmissionService
NotificationService
```

The final class hierarchy should be based on actual responsibilities rather than creating inheritance only to demonstrate inheritance.

---

# 17. SOLID Principles

Where appropriate, the project should apply:

- Single Responsibility Principle.
- Open/Closed Principle.
- Liskov Substitution Principle.
- Interface Segregation Principle.
- Dependency Inversion Principle.

Example:

Instead of putting all examination functionality into one large class:

```text
OnlineExamSystem.java
```

use separated responsibilities:

```text
AuthenticationService
ExamService
QuestionService
SubmissionService
ResultService
SessionManager
AntiCheatService
```

---

# 18. Testing Plan

Testing is required as part of the project.

## 18.1. Functional Testing

Examples:

```text
Login
Register
Create Exam
Join Exam
Answer Question
Submit Exam
View Result
```

## 18.2. WebSocket Testing

Test:

- Connection.
- Disconnection.
- Reconnection.
- Message sending.
- Message receiving.
- Invalid messages.
- Server errors.

## 18.3. Concurrency Testing

Important test scenarios:

```text
10 students connect simultaneously
50 students connect simultaneously
10 students submit simultaneously
50 students submit simultaneously
Multiple students answer simultaneously
Multiple sessions access shared resources
```

## 18.4. Race Condition Testing

Identify shared resources and test whether concurrent operations can produce inconsistent results.

## 18.5. Test Case Format

```text
| ID | Test Case | Input | Expected Result | Actual Result | Status |
|----|-----------|-------|-----------------|---------------|--------|
| TC01 | Login | Valid account | Login successful | | |
| TC02 | Start Exam | Valid exam | Exam starts | | |
| TC03 | Submit Exam | Valid answers | Submission saved | | |
| TC04 | Concurrent Submit | Multiple students | All submissions processed correctly | | |
```

---

# 19. Experimental Evaluation

The project should include measurable experiments where appropriate.

Possible experiments:

### Experiment 1 – Number of Concurrent Users

```text
10 users
25 users
50 users
100 users
```

Measure:

- Response time.
- Error rate.
- Successful requests.
- Server behavior.

### Experiment 2 – Sequential vs Concurrent Processing

Compare:

```text
Sequential Processing
        vs.
Concurrent Processing
```

Possible metrics:

- Execution time.
- Response time.
- Throughput.

### Experiment 3 – WebSocket Connections

Measure system behavior with different numbers of simultaneous WebSocket connections.

Actual results must be obtained from real experiments and must not be fabricated.

---

# 20. Error Handling

The system should handle:

- Invalid login.
- Invalid examination ID.
- Unauthorized access.
- Invalid WebSocket messages.
- Lost connections.
- Duplicate submissions.
- Examination timeout.
- Database errors.
- Concurrent access problems.
- Unexpected server errors.

The server should return meaningful errors to the client.

---

# 21. Security Considerations

Because this is an online examination system, security should be considered from the beginning.

Areas to consider:

- Authentication.
- Authorization.
- Secure handling of user data.
- Input validation.
- Server-side validation.
- Examination access control.
- Submission integrity.
- WebSocket connection validation.
- Anti-cheating mechanisms.

If code execution is implemented, additional isolation and security controls will be required.

---

# 22. Project Structure

Suggested repository structure:

```text
online-examination-system/
│
├── client/
│   ├── src/
│   ├── package.json
│   └── README.md
│
├── server/
│   ├── src/
│   │   ├── main/
│   │   └── test/
│   ├── resources/
│   └── README.md
│
├── database/
│   ├── schema.sql
│   └── seed.sql
│
├── docs/
│   ├── architecture/
│   ├── diagrams/
│   └── protocol/
│
├── report/
│
├── README.md
└── .gitignore
```

---

# 23. Git Collaboration

The group should use Git throughout development.

Recommended branches:

```text
main
develop

feature/authentication
feature/exam-management
feature/websocket
feature/concurrency
feature/anti-cheat
feature/react-client
feature/database
feature/testing
```

Use meaningful commits, for example:

```text
feat: implement WebSocket connection manager
feat: add exam session service
feat: implement concurrent submission handling
feat: add suspicious activity tracking
fix: prevent duplicate exam submission
test: add concurrent submission tests
refactor: separate exam and result services
```

---

# 24. Technology Stack

## Client

- React
- JavaScript / TypeScript depending on team decision
- HTML
- CSS
- WebSocket client

## Server

- Java
- Java WebSocket technology/library
- Java OOP
- Multithreading
- Thread Pool / ExecutorService
- Concurrency utilities

## Database

- Relational database
- SQL
- JDBC or another approved Java database-access approach

## Development Tools

- IntelliJ IDEA / VS Code
- Git
- GitHub
- Database management tool

The exact library/framework choices must be finalized based on compatibility, course requirements, and the team's understanding of the technology.

---

# 25. Requirements from the Course

The project must demonstrate appropriate Java concepts.

Important areas include:

- OOP.
- SOLID where appropriate.
- Exception handling.
- Database programming where required.
- Networking where required.
- Multithreading/concurrency.
- Testing.
- Debugging.
- Refactoring.
- Optimization.
- Git collaboration.

Not every technology from the course needs to be used.

Technologies should be selected because they serve a real purpose in the project.

---

# 26. Project Assessment Focus

Based on the course rubric, the major assessment areas are:

| Criteria | Weight |
|---|---:|
| Problem, Requirements & Project Scope | 10% |
| Java/OOP Design & SOLID | 20% |
| Technical Implementation | 25% |
| Testing, Debugging & Evaluation | 15% |
| Novelty & Technical Contribution | 15% |
| Code Quality & Documentation | 10% |
| Presentation & Viva | 5% |
| **Total** | **100%** |

Therefore, the project should not focus only on UI appearance.

The important parts are:

```text
Architecture
     +
Java/OOP
     +
Concurrency
     +
WebSocket
     +
Database
     +
Testing
     +
Novelty
```

---

# 27. Presentation / Viva Preparation

Every member must understand the code they contribute.

The lecturer may ask a member to:

- Explain a class.
- Explain a method.
- Explain architecture.
- Run a feature.
- Modify code.
- Debug an error.
- Explain a technology choice.
- Explain concurrency.
- Explain a design decision.

Therefore:

> Do not use technologies or code that the group cannot explain.

---

# 28. Current Project Direction

At the current stage, the project direction is:

```text
             ONLINE EXAMINATION SYSTEM
                       │
                       ▼
              React Web Client
                       │
                   WebSocket
                       │
                       ▼
                 Java Server
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
       OOP        Concurrency    Security
          │            │            │
          └────────────┼────────────┘
                       ▼
                    Database
```

### Confirmed decisions

- [x] Topic 4 – Java Concurrent Application
- [x] Online Examination System
- [x] Client-Server architecture
- [x] Java Server
- [x] React Client is allowed
- [x] WebSocket communication
- [x] Multithreading/concurrency is a core technical requirement
- [x] Database will be used
- [x] Project needs meaningful novelty
- [x] Anti-cheating is a possible novelty
- [x] Code-based examination is a possible novelty

### Not yet finalized

- [ ] Final anti-cheating features
- [ ] Whether code examination will be implemented
- [ ] Final WebSocket library
- [ ] Final database technology
- [ ] Final database schema
- [ ] Final class diagram
- [ ] Final WebSocket protocol
- [ ] Final project folder structure
- [ ] Detailed division of work between members
- [ ] Final testing scenarios
- [ ] Final technical contribution

---

# 29. Recommended Next Steps

The group should follow this order:

```text
1. Finalize project novelty
        ↓
2. Finalize functional requirements
        ↓
3. Design system architecture
        ↓
4. Design WebSocket communication protocol
        ↓
5. Design database
        ↓
6. Design Java classes / OOP architecture
        ↓
7. Design concurrency model
        ↓
8. Design React pages
        ↓
9. Divide work among members
        ↓
10. Implement Server
        ↓
11. Implement Client
        ↓
12. Integrate WebSocket
        ↓
13. Implement concurrency
        ↓
14. Implement novelty
        ↓
15. Testing
        ↓
16. Performance / concurrency evaluation
        ↓
17. Refactoring
        ↓
18. Documentation & Report
        ↓
19. Presentation / Viva preparation
```

---

# 30. Important Development Principle

The project should prioritize:

> **Correct architecture and meaningful technical implementation over unnecessary complexity.**

Do not add technologies merely to make the project look complicated.

Every technology should have:

1. A clear purpose.
2. A real implementation.
3. A testable result.
4. A technical explanation.

The final system should be something every group member can understand, demonstrate, debug, and explain.

---

# 31. Final Target

The final target is a **real-time, concurrent, Java-based Online Examination System** with:

```text
┌───────────────────────────────────────────────────────┐
│              ONLINE EXAMINATION SYSTEM                │
├───────────────────────────────────────────────────────┤
│                                                       │
│  React Client                                         │
│       │                                               │
│       │ WebSocket                                     │
│       ▼                                               │
│  Java Server                                          │
│       │                                               │
│       ├── Authentication                              │
│       ├── Examination Management                     │
│       ├── Real-Time Exam Session                     │
│       ├── Concurrent User Processing                 │
│       ├── Submission & Result Processing             │
│       ├── Anti-Cheating / Novelty                    │
│       └── Error & Security Handling                  │
│       │                                               │
│       ▼                                               │
│  Database                                             │
│                                                       │
└───────────────────────────────────────────────────────┘
```

The most important technical characteristics are:

**Java + OOP + WebSocket + Client-Server + Multithreading + Concurrency + Database + Testing + Novelty**

---

## Status

**Project planning stage – architecture updated after lecturer clarification.**

The next major decision is to finalize the **novelty/technical contribution** before detailed implementation begins.
