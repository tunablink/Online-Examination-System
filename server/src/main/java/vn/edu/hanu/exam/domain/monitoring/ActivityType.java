package vn.edu.hanu.exam.domain.monitoring;

public enum ActivityType {
    TAB_HIDDEN,
    WINDOW_BLUR,
    DISCONNECTED,
    RECONNECTED;

    public boolean contributesWarning() {
        return this != RECONNECTED;
    }
}
