# Java Programming Project – Instructions

## 1. Project Objective

The final project aims to assess students' ability to **analyze, design, implement, test, and improve a Java application** based on the knowledge covered throughout the course.

Depending on the project, students may apply:

* Object-Oriented Programming.
* SOLID and software design principles.
* Java I/O/NIO.
* Multithreading.
* GUI programming.
* Networking.
* Database programming.
* Functional Programming.
* Testing, debugging, refactoring, and optimization.
* Meta-programming.

**Not every project is required to use all of these technologies.**

---

# 2. Group Requirements

Each group may contain a maximum of **5 students**.

The project may be completed:

* Individually.
* By a group of 2 students.
* By a group of 3 students.
* By a group of 4 students.
* By a group of 5 students.

Each member must have a clearly defined technical responsibility and must understand the code related to their work. **Note:** A group of 2 students (or any *"personal"* group) does not means you can choose to do something easier/smaller than a group of 5 students.

During the presentation/viva, the instructor may ask any member to:

* Explain code.
* Explain the architecture.
* Run a feature.
* Modify a piece of code.
* Explain a design decision.
* Debug a problem.

---

# 3. Project Requirements

Every project must include the following.

## 3.1. Problem

Clearly describe the problem being addressed.

## 3.2. Objectives

Define the objectives of the system.

## 3.3. Requirements

Identify:

* Functional requirements.
* Non-functional requirements.

## 3.4. Architecture

Describe:

* Main modules.
* Main classes/components.
* Relationships between components.
* Data flow.
* Control flow where appropriate.

## 3.5. Java Design

The project should demonstrate appropriate use of:

* Encapsulation.
* Inheritance where appropriate.
* Polymorphism.
* Abstraction.
* Interfaces.
* Composition.
* Exception handling.

Where appropriate, students should apply:

* SOLID principles.
* Design patterns.
* Separation of concerns.

---

# 4. Technical Requirements

Students should select technologies according to the requirements of their project.

## 4.1. File and Data Processing

Possible technologies:

* Text I/O.
* Binary I/O.
* Object I/O.
* Serialization/Deserialization.
* NIO.

## 4.2. Concurrency

If the project uses concurrency, the report should explain:

* Thread model.
* Thread lifecycle.
* Shared resources.
* Synchronization.
* Race conditions.
* Thread Pool or equivalent mechanisms.

## 4.3. GUI

For GUI-based projects:

* Event handling.
* Layout management.
* State management.
* Dialogs.
* Menus/toolbars.
* Drawing.
* Animation where appropriate.

## 4.4. Networking

For network-enabled projects:

* Client/Server architecture.
* Socket/protocol.
* Connection management.
* Message format.
* Multiple clients where appropriate.
* Object transmission where applicable.

## 4.5. Database

For database projects:

* Database schema.
* SQL.
* JDBC.
* CRUD.
* PreparedStatement.
* Transactions where appropriate.

## 4.6. Functional Programming

Where appropriate:

* Lambda expressions.
* Functional interfaces.
* Stream API.
* `map`.
* `filter`.
* `sorted`.
* `collect`.
* `reduce`.

## 4.7. Meta-Programming

For advanced projects:

* Reflection.
* Generics.
* Annotations.
* Dynamic Proxy.
* Bytecode manipulation.
* AOP.

Meta-programming is optional and should only be used when it provides a meaningful technical purpose.

---

# 5. Code Quality

Source code should:

* Follow appropriate coding conventions.
* Use meaningful names for classes, methods, and variables.
* Avoid unnecessary code duplication.
* Avoid excessively large methods where decomposition is appropriate.
* Handle exceptions appropriately.
* Include comments/documentation where necessary.
* Avoid unnecessary dead code and debugging code.

Students are expected to follow the course **Coding Conventions** and use Git during development.

---

# 6. Git Collaboration

Groups should use Git during project development.

The repository/history should demonstrate meaningful development activity where possible.

Students should practice:

* Commit.
* Branch.
* Merge.
* Conflict resolution.
* Meaningful commit messages.

Git is a development and collaboration tool; it does not replace the final LMS submission.

---

# 7. Testing

Every project must include an appropriate testing plan.

Possible testing approaches:

* Unit testing.
* Integration testing.
* System testing.
* GUI testing.
* Network testing.
* Database testing.
* Performance testing.

Test cases should include:

* Input.
* Expected result.
* Actual result.
* Status.

Do not simply state that "the project was tested" without providing test scenarios or evidence.

---

# 8. Evaluation

Depending on the project, students may evaluate:

* Correctness.
* Execution time.
* Response time.
* Memory usage.
* Throughput.
* Number of concurrent users/tasks.
* Network performance.
* Database performance.
* GUI responsiveness.
* Error rate.
* Scalability.

Where appropriate, the project should include **experimental results or measurable evidence**.

---

# 9. Novelty & Contribution

Each group must identify what it has **designed, developed, or improved**.

Possible contributions include:

* Architecture.
* Algorithm.
* Data-processing technique.
* Concurrency mechanism.
* Network protocol.
* Performance optimization.
* Database optimization.
* GUI/state architecture.
* Design pattern.
* Custom framework/component.
* Reflection/annotation mechanism.
* Testing mechanism.
* Error-handling mechanism.
* Improvement over an existing project or baseline.

**Changing colors, fonts, icons, or other purely visual elements is not considered a major technical contribution.**

---

# 10. AI and External Code

Students may use AI-assisted programming tools and other development tools according to university/course regulations.

However, each student remains responsible for:

* Source code.
* Architecture.
* Algorithms.
* Experimental results.
* References.
* Report content.

Students must not submit code from other people without appropriate attribution.

Experimental results must be based on actual experiments. Fabricated results are not acceptable.

Students must be able to explain the code they submit.

Your code = Your contribution = Your responsibility. You might fail this course, not AI. Thus, make use of AI do not abuse AI.

---

# 11. Report Requirements

The report should follow a technical-paper/report structure:

1. Title.
2. Abstract.
3. Keywords.
4. Introduction.
5. Problem Definition.
6. Requirements.
7. System Architecture.
8. Design.
9. Implementation.
10. Technical Details.
11. Testing.
12. Experimental Results.
13. Discussion.
14. Novelty and Contributions.
15. Limitations.
16. Future Work.
17. Conclusion.
18. References.
19. Appendix, if necessary.

---

# 12. Compilatio Submission

The final report must be submitted through **Compilatio**.

### File naming convention

```text
GroupXX_ProjectName_Report.docx
```

Examples:

```text
Group01_BattleCity_Report.docx
Group02_NetworkedAutoGrader_Report.docx
Group03_LibraryManagement_Report.docx
```

Students are **strongly encouraged to submit the report in `.docx` format**.

The required similarity threshold for the course is:

**Similarity ≤ 20%**

Students must properly cite sources and avoid copying content without attribution.

---

# 13. LMS Submission

The complete project must be submitted through the **LMS** according to the instructor's submission instructions.

Each group should submit:

```text
project/
├── source/
├── report/
└── README.md
```

Where:

* `source/` contains the complete source code.
* `report/` contains the final report.
* `README.md` contains instructions for building, running, and testing the project.

The project should **not** be submitted through Google Drive or USB.

---

# 14. Deadline

**Deadline: Provided via LMS.**
No late submission.

---

# 15. Final Verification Checklist

Before submission, each group must verify:

* [ ] Source code is complete.
* [ ] Project builds successfully.
* [ ] Project runs successfully.
* [ ] README contains sufficient instructions.
* [ ] Database/configuration files are included where required.
* [ ] Test cases have been executed.
* [ ] Experimental results are included where appropriate.
* [ ] Novelty/Contribution is clearly identified.
* [ ] Final report is complete.
* [ ] Report has been checked using Compilatio.
* [ ] Similarity ≤ 20%.
* [ ] No unauthorized source code has been used.
* [ ] All group members understand the project and source code.
* [ ] Final version has been submitted through the LMS.
