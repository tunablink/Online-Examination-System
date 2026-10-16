package vn.edu.hanu.exam.protocol;

public record ServerMessage(
    String requestId,
    String type,
    Object data,
    ProtocolError error
) {
    //phan hoi cho 1 request cu the
    public static ServerMessage success(
        String  requestId,
        String type,
        Object data
    ){
        return new ServerMessage(requestId, type, data, null);
    }

    //server chu dong gui skien ma k phai phan hoi cua 1 request cu the
    public static ServerMessage event(String type, Object data){
        return new ServerMessage(null, type, data, null);
    }

    //gui thong bao loi cho 1 request cu the
    public static ServerMessage error(String requestId, String code, String message){
        return new ServerMessage(requestId, "Error", null, new ProtocolError(code, message));
    }
}
