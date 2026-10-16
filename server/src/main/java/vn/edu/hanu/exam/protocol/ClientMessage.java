package vn.edu.hanu.exam.protocol;

import java.util.Map;
// record bieu dien 1 object chi mang du lieu, tu tao constructot & cac method truy cap
public record ClientMessage(
    String requestId,
    String type,
    Map<String, Object> payload){
}
