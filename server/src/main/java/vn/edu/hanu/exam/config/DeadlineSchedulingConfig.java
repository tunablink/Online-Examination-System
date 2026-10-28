package vn.edu.hanu.exam.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

@Configuration
@EnableScheduling
@ConditionalOnProperty(name = "exam.deadline.enabled", havingValue = "true", matchIfMissing = true)
public class DeadlineSchedulingConfig {
}
