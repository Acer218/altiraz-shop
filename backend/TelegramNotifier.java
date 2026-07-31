import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

public class TelegramNotifier {
    private static final String BOT_TOKEN = "8745830122:AAHKWelnqv3-XVL0axQ3a8K590SpzK4IypQ";
    private static final String CHAT_ID = "5736940177";

    public static void sendOrderAlert(Order o){
        try{
            StringBuilder text = new StringBuilder();
            text.append("طلب جديد #").append(o.id).append("\n");
            text.append("الاسم: ").append(o.name).append("\n");
            text.append("الهاتف: ").append(o.phone).append("\n");
            text.append("الموقع: ").append(o.location).append("\n");
            for(OrderItem item : o.items){
                text.append("- ").append(item.name);
                if(item.size != null && !item.size.isEmpty()){
                    text.append(" (").append(item.size).append(")");
                }
                text.append(" x").append(item.qty).append("\n");
            }
            text.append("الإجمالي: ").append(String.format("%.2f", o.total)).append(" د.ل");

            String encoded = URLEncoder.encode(text.toString(), StandardCharsets.UTF_8);
            String urlStr = "https://api.telegram.org/bot" + BOT_TOKEN
                    + "/sendMessage?chat_id=" + CHAT_ID + "&text=" + encoded;

            URL url = URI.create(urlStr).toURL();
            HttpURLConnection con = (HttpURLConnection) url.openConnection();
            con.setRequestMethod("GET");
            con.setConnectTimeout(5000);
            con.getResponseCode();
            con.disconnect();
        }catch(Exception e){
            e.printStackTrace();
        }
    }
}
