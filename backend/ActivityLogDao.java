import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;


public class ActivityLogDao {

    public void log(String actorName, String action){
        String sql = "INSERT INTO activity_log (actor_name, action) VALUES (?, ?)";
        try(Connection con = Db.getConnection();
            PreparedStatement ps = con.prepareStatement(sql)){
            ps.setString(1, (actorName == null || actorName.trim().isEmpty()) ? "غير معروف" : actorName);
            ps.setString(2, action);
            ps.executeUpdate();
        }catch(Exception e){
            e.printStackTrace();
        }
    }

    public List<ActivityLogEntry> getRecent(int limit) throws Exception {
        List<ActivityLogEntry> list = new ArrayList<>();
        String sql = "SELECT id, actor_name, action, created_at FROM activity_log ORDER BY id DESC LIMIT ?";
        try(Connection con = Db.getConnection();
            PreparedStatement ps = con.prepareStatement(sql)){
            ps.setInt(1, limit);
            try(ResultSet rs = ps.executeQuery()){
                while(rs.next()){
                    ActivityLogEntry e = new ActivityLogEntry();
                    e.id = rs.getInt("id");
                    e.actorName = rs.getString("actor_name");
                    e.action = rs.getString("action");
                    Timestamp ts = rs.getTimestamp("created_at");
                    e.date = ts.toInstant().toString();
                    list.add(e);
                }
            }
        }
        return list;
    }
}
