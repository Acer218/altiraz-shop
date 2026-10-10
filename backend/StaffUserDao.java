import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

public class StaffUserDao {

    public List<StaffUser> getAll() throws Exception {
        List<StaffUser> list = new ArrayList<>();
        String sql = "SELECT id, name, username, role, active FROM staff_users ORDER BY id DESC";
        try(Connection con = Db.getConnection();
            PreparedStatement ps = con.prepareStatement(sql);
            ResultSet rs = ps.executeQuery()){
            while(rs.next()){
                StaffUser u = new StaffUser();
                u.id = rs.getInt("id");
                u.name = rs.getString("name");
                u.username = rs.getString("username");
                u.role = rs.getString("role");
                u.active = rs.getBoolean("active");
                list.add(u);
            }
        }
        return list;
    }

    public StaffUserAuth getForAuth(String username) throws Exception {
        String sql = "SELECT id, name, username, password_hash, salt, role, active FROM staff_users WHERE username=?";
        try(Connection con = Db.getConnection();
            PreparedStatement ps = con.prepareStatement(sql)){
            ps.setString(1, username);
            try(ResultSet rs = ps.executeQuery()){
                if(rs.next()){
                    StaffUserAuth u = new StaffUserAuth();
                    u.id = rs.getInt("id");
                    u.name = rs.getString("name");
                    u.username = rs.getString("username");
                    u.passwordHash = rs.getString("password_hash");
                    u.salt = rs.getString("salt");
                    u.role = rs.getString("role");
                    u.active = rs.getBoolean("active");
                    return u;
                }
            }
        }
        return null;
    }

    public StaffUser create(StaffUser u) throws Exception {
        String salt = PasswordUtil.generateSalt();
        String hash = PasswordUtil.hash(u.password, salt);
        String sql = "INSERT INTO staff_users (name, username, password_hash, salt, role, active) VALUES (?, ?, ?, ?, ?, true)";
        try(Connection con = Db.getConnection();
            PreparedStatement ps = con.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)){
            ps.setString(1, u.name);
            ps.setString(2, u.username.trim());
            ps.setString(3, hash);
            ps.setString(4, salt);
            ps.setString(5, u.role);
            ps.executeUpdate();
            try(ResultSet keys = ps.getGeneratedKeys()){
                keys.next();
                u.id = keys.getInt(1);
            }
        }
        u.active = true;
        u.password = null;
        return u;
    }

    public void setActive(int id, boolean active) throws Exception {
        String sql = "UPDATE staff_users SET active=? WHERE id=?";
        try(Connection con = Db.getConnection();
            PreparedStatement ps = con.prepareStatement(sql)){
            ps.setBoolean(1, active);
            ps.setInt(2, id);
            ps.executeUpdate();
        }
    }

    public void delete(int id) throws Exception {
        String sql = "DELETE FROM staff_users WHERE id=?";
        try(Connection con = Db.getConnection();
            PreparedStatement ps = con.prepareStatement(sql)){
            ps.setInt(1, id);
            ps.executeUpdate();
        }
    }
}
