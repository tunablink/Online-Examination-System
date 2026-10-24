package vn.edu.hanu.exam.repository;

import java.util.List;
import java.util.Optional;

import vn.edu.hanu.exam.service.catalog.AvailableExamDetails;

public interface StudentExamCatalogRepository {
    List<AvailableExamDetails> findAllPublished();

    Optional<AvailableExamDetails> findPublishedById(long examId);
}
