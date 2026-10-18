package vn.edu.hanu.exam.repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import vn.edu.hanu.exam.domain.NewUser;
import vn.edu.hanu.exam.domain.User;
import vn.edu.hanu.exam.domain.UserRole;

@Repository 
public class JdbcUserRepository implements UserRepository {
    private static final String SELECT_USER_COLUMNS = """
            SELECT
                id,
                username,
                password_hash,
                full_name,
                email,
                role,
                active,
                created_at,
                updated_at
            FROM users
            """;
    
    private static final RowMapper<User> USER_ROW_MAPPER = JdbcUserRepository::mapUser;

    private final NamedParameterJdbcTemplate jdbcTemplate;

    public JdbcUserRepository(NamedParameterJdbcTemplate jdbcTemplate){
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override 
    public User create(NewUser newUser){
        String sql = """
                INSERT INTO users (
                username, 
                password_hash,
                full_name,
                email,
                role                
                )
                VALUES (
                :username,
                :passwordHash,
                :fullName,
                :email,
                :role
                )
                """;
        MapSqlParameterSource parameters = new MapSqlParameterSource().addValue("username", newUser.username())
        .addValue("passwordHash", newUser.passwordHash()).addValue("fullName", newUser.fullName()).addValue("email", newUser.email()).addValue("role", newUser.role().name());   

        KeyHolder keyHolder = new GeneratedKeyHolder();

        int affectedRows = jdbcTemplate.update(sql, parameters, keyHolder, new String[]{"id"});

        if (affectedRows != 1){
            throw new IllegalStateException("Expected one inserted user, but affected " +affectedRows + " rows.");
        }

        Number generatedId = keyHolder.getKey();

        if (generatedId == null){
            throw new IllegalStateException("PostgreSQL did not return the generated user ID.");
        }

        return findById(generatedId.longValue()).orElseThrow(() -> new IllegalStateException("The inserted user could not be read back."));
    }

    @Override 
    public Optional<User> findById(long id){
        String sql = SELECT_USER_COLUMNS + """
                WHERE id = :id
                """;

        return findOne(
            sql,
            Map.of("id", id)
        );
    }

    @Override 
    public Optional<User> findByUsername(String username){
        String sql = SELECT_USER_COLUMNS + """
                WHERE LOWER(username) = LOWER(:username)
                """;

        return findOne(sql, Map.of("username", username));        
    }

    @Override 
    public Optional<User> findByEmail(String email){
        String sql = SELECT_USER_COLUMNS + """
                WHERE LOWER(email) = LOWER(:email)
                """;

        return findOne(sql, Map.of("email", email));
    }

    @Override 
    public boolean existsByUsername(String username){
        String sql = """
                SELECT EXISTS (
                SELECT 1 FROM users WHERE LOWER(username) = LOWER(:username))
                """;

        Boolean result = jdbcTemplate.queryForObject(sql, Map.of("username", username), Boolean.class);

        return Boolean.TRUE.equals(result);
    }

    @Override 
    public boolean existsByEmail(String email){
        String sql = """
                SELECT EXISTS (
                SELECT 1 FROM users WHERE LOWER(email) = LOWER(:email))
                """;

        Boolean result = jdbcTemplate.queryForObject(sql, Map.of("email", email), Boolean.class);

        return Boolean.TRUE.equals(result);
    }

    @Override 
    public long count(){
        Long result = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM users", Map.of(), Long.class);

        if (result == null) {
            throw new IllegalStateException("PostgreSQL did not return a user count.");
        }

        return result;
    }

    private Optional<User> findOne(String sql, Map<String, ?> parameters){
        List<User> users = jdbcTemplate.query(sql, parameters, USER_ROW_MAPPER);
        return users.stream().findFirst();
    }

    private static User mapUser(ResultSet resultSet, int rowNumber) throws SQLException{
        return new User(
            resultSet.getLong("id"),
            resultSet.getString("username"),
            resultSet.getString("password_hash"),
            resultSet.getString("full_name"),
            resultSet.getString("email"),
            UserRole.valueOf(resultSet.getString("role")),
            resultSet.getBoolean("active"),
            resultSet.getObject("created_at", OffsetDateTime.class),
            resultSet.getObject("updated_at", OffsetDateTime.class)
        );
    }
}


