import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

/// SharedPreferences 키 (Android 백그라운드 isolate에서도 동일 키 사용)
abstract final class PrefsKeys {
  static const url = 'ingest_url';
  static const secret = 'ingest_secret';
  static const devicePhone = 'device_phone_digits';
}

class IngestClient {
  /// 저장된 설정으로 sms-ingest 서버에 POST
  static Future<({bool ok, String message})> forward({
    required String body,
    String? sender,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    final url = prefs.getString(PrefsKeys.url)?.trim();
    final secret = prefs.getString(PrefsKeys.secret)?.trim();
    final phone = prefs.getString(PrefsKeys.devicePhone)?.trim();

    if (url == null || url.isEmpty) {
      return (ok: false, message: 'URL 미설정');
    }
    final payload = <String, dynamic>{
      'body': body,
      if (secret != null && secret.isNotEmpty) 'secret': secret,
      if (sender != null && sender.isNotEmpty) 'sender': sender,
      if (phone != null && phone.isNotEmpty) 'recipientPhone': phone,
    };

    try {
      final uri = Uri.parse(url);
      final res = await http
          .post(
            uri,
            headers: {'Content-Type': 'application/json; charset=utf-8'},
            body: jsonEncode(payload),
          )
          .timeout(const Duration(seconds: 20));

      if (res.statusCode >= 200 && res.statusCode < 300) {
        return (ok: true, message: 'HTTP ${res.statusCode}');
      }
      return (ok: false, message: 'HTTP ${res.statusCode} ${res.body}');
    } catch (e) {
      return (ok: false, message: e.toString());
    }
  }
}
