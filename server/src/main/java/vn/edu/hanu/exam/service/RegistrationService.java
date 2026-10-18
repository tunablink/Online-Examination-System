package vn.edu.hanu.exam.service;

import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.regex.Pattern;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import vn.edu.hanu.exam.domain.NewUser;
import vn.edu.hanu.exam.domain.User;
import vn.edu.hanu.exam.domain.UserRole;
import vn.edu.hanu.exam.exception.RegistrationException;
import vn.edu.hanu.exam.repository.UserRepository;

@Service 
public class RegistrationService {
    private static final Pattern USERNAME_PATTERN = Pattern.compile("^[a-zA-Z0-9._-]{3,50}$");

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

    private static final int MIN_PASSWORD_LENGTH = 8;
    private static final int MAX_BCRYPT_PASSWORD_LENGTH = 72;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public RegistrationService(UserRepository userRepository, PasswordEncoder passwordEncoder){
        this.userRepository = userRepository;
        this.passwordEncoder=passwordEncoder;
    }

    @Transactional 
    public RegisteredUser registerStudent(RegisterUserCommand command){
        if(command == null){
            throw new RegistrationException("INVALID_REQUEST", "Registration data is required.");
        }

        String username = validateAndNormalizeUsername(command.username());
        String fullName = validateAndNormalizeFullName(command.fullName());
        String email = validateAndNormalizeEmail(command.email());
        String password = validatePassword(command.password());

        if (userRepository.existsByUsername(username)) {
            throw new RegistrationException("USERNAME_ALREADY_EXISTS", "Username already exists.");
        }

        if (userRepository.existsByEmail(email)){
            throw new RegistrationException( "EMAIL_ALREADY_EXISTS", "Email already exists.");
        }

        String passwordHash = passwordEncoder.encode(password);

        NewUser newUser = new NewUser(username, passwordHash, fullName, email, UserRole.STUDENT);

        try{
            User createdUser = userRepository.create(newUser);
            return RegisteredUser.from(createdUser);
        } catch (DuplicateKeyException exception){
            throw new RegistrationException("USER_ALREADY_EXISTS", "Username or email already exists.", exception);
        }

    }

    private static String validateAndNormalizeUsername(String value){
        if (value == null){
            throw new RegistrationException( "INVALID_USERNAME", "Username is required.");
        }

        String username = value.trim();

        if (!USERNAME_PATTERN.matcher(username).matches()){
            throw new RegistrationException("INVALID_USERNAME", "Username must contain 3 to 50 characters " + "and use only letters, numbers, " + "dot, underscore, or hyphen.");
        }

        return username.toLowerCase(Locale.ROOT);
    }

    private static String validateAndNormalizeFullName(String value){
        if (value == null){
            throw new RegistrationException( "INVALID_FULL_NAME", "Full name is required.");
        } 

        String fullName = value.trim();

        if (fullName.length() < 2 || fullName.length() > 100) {
            throw new RegistrationException("INVALID_FULL_NAME", "Full name must contain 2 to 100 characters.");
        }

        return fullName;
    }

    private static String validateAndNormalizeEmail(String value){
        if (value ==null) {
            throw new RegistrationException("INVALID_EMAIL", "Email is required.");
        }

        String email = value.trim().toLowerCase(Locale.ROOT);

        if (email.length() > 255 || !EMAIL_PATTERN.matcher(email).matches()) {
            throw new RegistrationException("INVALID_EMAIL",  "Email format is invalid.");
        }

        return email;
    }

    private static String validatePassword(String value){
        if (value == null || value.isBlank()) {
            throw new RegistrationException("INVALID_PASSWORD", "Password is required.");
        }

         if (value.length() < MIN_PASSWORD_LENGTH){
            throw new RegistrationException( "INVALID_PASSWORD", "Password must contain at least " + MIN_PASSWORD_LENGTH + " characters.");
         }

         int passwordBytes = value.getBytes(StandardCharsets.UTF_8).length;

         if (passwordBytes > MAX_BCRYPT_PASSWORD_LENGTH){
            throw new RegistrationException("INVALID_PASSWORD", "Password must not exceed " + MAX_BCRYPT_PASSWORD_LENGTH + " UTF-8 bytes.");
         } 
         return value;
    }
}
