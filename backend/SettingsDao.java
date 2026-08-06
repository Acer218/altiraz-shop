import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;

public class SettingsDao {

    public Settings get() throws Exception {
        String sql = "SELECT delivery_fee, inspection_fee, max_inspection_items FROM settings WHERE id=1";
        try(Connection con = Db.getConnection();
            PreparedStatement ps = con.prepareStatement(sql);
            ResultSet rs = ps.executeQuery()){
            Settings s = new Settings();
            if(rs.next()){
                s.deliveryFee = rs.getDouble("delivery_fee");
                s.inspectionFee = rs.getDouble("inspection_fee");
                s.maxInspectionItems = rs.getInt("max_inspection_items");
            } else {
                s.deliveryFee = 15;
                s.inspectionFee = 20;
                s.maxInspectionItems = 15;
            }
            return s;
        }
    }

    public void update(Settings s) throws Exception {
        String sql = "UPDATE settings SET delivery_fee=?, inspection_fee=?, max_inspection_items=? WHERE id=1";
        try(Connection con = Db.getConnection();
            PreparedStatement ps = con.prepareStatement(sql)){
            ps.setDouble(1, s.deliveryFee);
            ps.setDouble(2, s.inspectionFee);
            ps.setInt(3, s.maxInspectionItems);
            ps.executeUpdate();
        }
    }
}
