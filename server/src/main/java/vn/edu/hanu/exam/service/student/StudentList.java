package vn.edu.hanu.exam.service.student;

import java.util.List;

public record StudentList(List<StudentDetails> students) {
    public StudentList {
        students = List.copyOf(students);
    }
}
