package vn.edu.hanu.exam.repository;

import java.util.Optional;

import vn.edu.hanu.exam.domain.NewUser;
import vn.edu.hanu.exam.domain.User;

public interface UserRepository {
    User create(NewUser newUser);
    Optional<User> findById(long id);
    Optional<User> findByInstitutionalId(String institutionalId);
    Optional<User> findByEmail(String email);
    User updateDepartment(long userId, String department);
    User updatePasswordHash(long userId, String passwordHash);
    boolean existsByInstitutionalId(String institutionalId);
    boolean existsByEmail(String email);
    long count();
}
