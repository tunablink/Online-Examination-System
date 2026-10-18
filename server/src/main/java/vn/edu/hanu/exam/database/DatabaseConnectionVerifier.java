package vn.edu.hanu.exam.database;

import vn.edu.hanu.exam.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class DatabaseConnectionVerifier implements ApplicationRunner {
    private static final Logger LOGGER =
            LoggerFactory.getLogger(DatabaseConnectionVerifier.class);
    private final UserRepository userRepository;
    private final JdbcTemplate jdbcTemplate;

    public DatabaseConnectionVerifier(JdbcTemplate jdbcTemplate, UserRepository userRepository) {
        this.jdbcTemplate = jdbcTemplate;
        this.userRepository= userRepository;
    }

    @Override
    public void run(ApplicationArguments arguments) {
        DatabaseInfo databaseInfo = jdbcTemplate.queryForObject(
                """
                SELECT
                    current_database() AS database_name,
                    current_user AS user_name
                """,
                (resultSet, rowNumber) -> new DatabaseInfo(
                        resultSet.getString("database_name"),
                        resultSet.getString("user_name")
                )
        );

        if (databaseInfo == null) {
            throw new IllegalStateException(
                    "PostgreSQL did not return database information."
            );
        }

        long userCount = userRepository.count();

        LOGGER.info(
                "Database connection verified: database={}, user={}, userCount={}",
                databaseInfo.databaseName(),
                databaseInfo.userName(),
                userCount

        );
    }

    private record DatabaseInfo(
            String databaseName,
            String userName
    ) {
    }
}