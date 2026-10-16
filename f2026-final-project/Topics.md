# Java Programming Project – Topics

## 1. General Orientation

Students must select **ONE project topic** from the directions below and develop a complete Java application.

The project should demonstrate the ability to:

* Analyze and design a Java application.
* Apply Object-Oriented Programming principles.
* Apply appropriate software design principles, including SOLID where relevant.
* Organize source code using a clear and maintainable structure.
* Work with Java I/O or other appropriate data-storage mechanisms.
* Handle errors and exceptional situations.
* Use threads and concurrency when required by the problem.
* Build a GUI when appropriate.
* Work with databases when required.
* Implement networking when the project requires communication between components.
* Apply Functional Programming techniques when appropriate.
* Perform testing, debugging, refactoring, and optimization.
* Evaluate the system and identify technical contributions.

**A project does not need to use every technology covered in the course.** Technologies should be selected according to the project's requirements and architecture.

---

# 2. Topic 1 – Java Desktop Application

Students develop a Java desktop application focusing on:

* OOP.
* GUI.
* Data management.
* File I/O.
* Event handling.
* State management.

Possible directions include:

* Simulation Application.
* Another desktop application proposed by the group.

### Possible Extensions

* Java Swing/JavaFX.
* Text/Binary/Object I/O.
* Serialization.
* NIO.
* JDBC.
* Multithreading.
* Lambda/Streams.
* Design patterns.
* Unit testing.

---

# 3. Topic 2 – Java Game Development

Students develop a game using Java.

The project may use:

* Java Swing.
* AWT.
* JavaFX.
* Graphics/Drawing.
* Event handling.
* Animation.
* Timers.
* State management.
* Collision detection.

### Possible Games

* Battle City / Tank Game.
* Tower Defense.
* Strategy Game.
* Another game proposed by the group.

### Possible Extensions

* Multiple levels.
* Save/load game.
* Sound effects.
* Animation.
* AI-controlled enemies.
* Replay.
* Leaderboard.
* Multiplayer.
* Database.
* Performance optimization.

> The project is not evaluated primarily based on visual appearance. The main focus is program architecture, state management, event handling, animation, collision detection, concurrency, and code quality.

---

# 4. Topic 3 – Java Client/Server Application

Students develop a Java application consisting of multiple components communicating over a network.

A typical architecture may be:

```text
Client 1 ──┐
Client 2 ──┼──> Server
Client 3 ──┘
```

### The Server may

* Manage multiple clients.
* Process requests.
* Manage application state.
* Manage data.
* Authenticate users.
* Broadcast information.
* Store data.
* Coordinate tasks.

### The Client may

* Connect to the Server.
* Send requests.
* Receive responses.
* Send data.
* Receive notifications.
* Display application status.
* Provide user interaction.

### Possible Directions

* Multiplayer Game.
* Chat Application.
* Network File Transfer.
* Collaborative Application.
* Remote Monitoring.
* Online Quiz.
* Distributed Task Manager.
* Client/Server Management System.

Possible technologies include:

* Socket.
* TCP/UDP.
* `InetAddress`.
* Object serialization.
* Multithreading.
* NIO.
* Database.

---

# 5. Topic 4 – Java Concurrent Application

Students develop an application in which **concurrency/multithreading is an important part of the problem**.

Possible directions:

* Academic Scheduler.
* Networked Exam System.

Possible technologies:

* `Thread`.
* `Runnable`.
* Thread lifecycle.
* Thread synchronization.
* Thread Pool.
* Shared resources.
* Producer/Consumer.
* Concurrent data structures.

The project should explain:

* Why concurrency is required.
* What each thread does.
* What the shared resources are.
* Whether race conditions can occur.
* How synchronization is handled.
* How the sequential and concurrent versions differ, where applicable.

---

# 6. Topic 5 – Java Meta-Programming / Framework-Oriented Application

This is an advanced direction for groups interested in:

* Reflection.
* Generics.
* Annotations.
* Dynamic Proxy.
* Runtime inspection.
* Bytecode manipulation.
* Aspect-Oriented Programming.

Possible directions:

* Automatic Test Runner.
* Networked Java Auto-Grader System.

The project should focus on the **underlying technical mechanism**, rather than simply building a CRUD application and using Reflection superficially.

---

# 7. Topic 6 – Integrated Java Application

Students may build an integrated application that combines several topics from the course.

For example:

```text
             +----------------+
             |   Java GUI     |
             +-------+--------+
                     |
             +-------v--------+
             | Application    |
             | Logic / OOP    |
             +---+--------+---+
                 |        |
          +------v--+   +-v-------+
          | Database|   | Network |
          +---------+   +---------+
                 |
          +------v------+
          | File / Data |
          +-------------+
```

Possible directions:

* Club Platform.
* Integrated Education Application.

Groups should keep the project scope realistic. **Do not add technologies simply to make the project appear more complex.**

---

# 8. Student-Proposed Project

Students may propose a project outside the topics above.

The proposal must include:

1. Project Title.
2. Problem.
3. Objective.
4. Main Functions.
5. Architecture.
6. Technologies.
7. Expected Java Concepts.
8. Novelty/Contribution.
9. Testing/Evaluation Plan.

The project may only be developed after receiving instructor approval.

---

# 9. Project Complexity Levels

## Basic

Possible focus:

* OOP.
* GUI.
* File I/O.
* Exception handling.
* Collections.
* Basic Database.

## Intermediate

Possible extensions:

* JDBC.
* Serialization.
* NIO.
* Multithreading.
* Networking.
* Lambda/Streams.
* Design patterns.

## Advanced

Possible extensions:

* Concurrent architecture.
* Client/Server.
* Dynamic Proxy.
* Reflection.
* Annotations.
* Plugin architecture.
* Performance optimization.
* Distributed processing.
* Advanced testing.

> A project is not considered better simply because it uses more technologies. Each technology should have a clear purpose and be appropriately integrated into the system design.
