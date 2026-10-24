package vn.edu.hanu.exam.service.exam;

public record ExamPublishReadiness(
        int questionCount,
        int invalidChoiceCount,
        int invalidCorrectChoiceCount) {
    public boolean canPublish() {
        return questionCount > 0
                && invalidChoiceCount == 0
                && invalidCorrectChoiceCount == 0;
    }
}
