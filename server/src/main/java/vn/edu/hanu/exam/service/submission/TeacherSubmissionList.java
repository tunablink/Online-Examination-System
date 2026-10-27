package vn.edu.hanu.exam.service.submission;

import java.util.List;

import vn.edu.hanu.exam.domain.submission.TeacherSubmission;

public record TeacherSubmissionList(List<TeacherSubmission> submissions) {
    public TeacherSubmissionList {
        submissions = List.copyOf(submissions);
    }
}
