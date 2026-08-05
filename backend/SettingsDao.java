import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;

public class SettingsDao {

    public Settings get() throws Exception {
        String sql = "SELECT delivery_fee, inspection_fee FROM settings WHERE id=1";
        try(Connection con = Db.getConnection();
            PreparedStatement ps = con.prepareStatement(sql);
            ResultSet rs = ps.executeQuery()){
            Settings s = new Settings();
            if(rs.next()){
                s.deliveryFee = rs.getDouble("delivery_fee");
                s.inspectionFee = rs.getDouble("inspection_fee");
            } else {
                s.deliveryFee = 15;
                s.inspectionFee = 20;
            }
            return s;
        }
    }

    public void update(Settings s) throws Exception {
        String sql = "UPDATE settings SET delivery_fee=?, inspection_fee=? WHERE id=1";
        try(Connection con = Db.getConnection();
            PreparedStatement ps = con.prepareStatement(sql)){
            ps.setDouble(1, s.deliveryFee);
            ps.setDouble(2, s.inspectionFee);
            ps.executeUpdate();
        }
    }
}
