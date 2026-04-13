import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'forward_log_store.dart';

/// SharedPreferences 키 (Android 백그라운드 isolate에서도 동일 키 사용)
abstract final class PrefsKeys {
  static const url = 'ingest_url';
  static const secret = 'ingest_secret';
  static const devicePhone = 'device_phone_digits';
}

class ForwardResult {
  const ForwardResult({
    required this.ok,
    required this.message,
    this.httpStatus,
    this.serverStatus,
    this.serverMessage,
    this.duplicate = false,
  });

  final bool ok;
  final String message;
  final int? httpStatus;
  final String? serverStatus;
  final String? serverMessage;
  final bool duplicate;
}

class IngestClient {
  static String _previewBody(String body) {
    final oneLine = body.replaceAll(RegExp(r'\s+'), ' ').trim();
    if (oneLine.length <= 120) return oneLine;
    return '${oneLine.substring(0, 120)}…';
  }

  static Future<void> _appendLog({
    required String source,
    required String body,
    required ForwardResult result,
    String? sender,
    String? recipientPhone,
    String? url,
  }) async {
    await ForwardLogStore.append(
      ForwardLogEntry(
        atIso: DateTime.now().toIso8601String(),
        source: source,
        ok: result.ok,
        message: result.message,
        bodyPreview: _previewBody(body),
        sender: sender,
        recipientPhone: recipientPhone,
        url: url,
        httpStatus: result.httpStatus,
        serverStatus: result.serverStatus,
        serverMessage: result.serverMessage,
        duplicate: result.duplicate,
      ),
    );
  }

  /// 저장된 설정으로 sms-ingest 서버에 POST
  static Future<ForwardResult> forward({
    required String body,
    String? sender,
    String source = 'manual-test',
  }) async {
    final prefs = await SharedPreferences.getInstance();
    final url = prefs.getString(PrefsKeys.url)?.trim();
    final secret = prefs.getString(PrefsKeys.secret)?.trim();
    final phone = prefs.getString(PrefsKeys.devicePhone)?.trim();

    if (url == null || url.isEmpty) {
      const result = ForwardResult(ok: false, message: 'URL 미설정');
      await _appendLog(
        source: source,
        body: body,
        result: result,
        sender: sender,
        recipientPhone: phone,
      );
      return result;
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

      Map<String, dynamic>? json;
      try {
        final decoded = jsonDecode(res.body);
        if (decoded is Map<String, dynamic>) {
          json = decoded;
        }
      } catch (_) {
        json = null;
      }

      final parts = <String>['HTTP ${res.statusCode}'];
      final serverStatus = json?['status']?.toString();
      final serverMessage = json?['message']?.toString();
      final duplicate = json?['duplicate'] == true;
      if (serverStatus != null && serverStatus.isNotEmpty) {
        parts.add(serverStatus);
      }
      if (duplicate) {
        parts.add('DUPLICATE');
      }
      if (serverMessage != null && serverMessage.isNotEmpty) {
        parts.add(serverMessage);
      } else if (json == null && res.body.trim().isNotEmpty) {
        parts.add(res.body.trim());
      }

      final result = ForwardResult(
        ok: res.statusCode >= 200 && res.statusCode < 300,
        message: parts.join(' · '),
        httpStatus: res.statusCode,
        serverStatus: serverStatus,
        serverMessage: serverMessage,
        duplicate: duplicate,
      );
      await _appendLog(
        source: source,
        body: body,
        result: result,
        sender: sender,
        recipientPhone: phone,
        url: url,
      );
      return result;
    } catch (e) {
      final result = ForwardResult(ok: false, message: e.toString());
      await _appendLog(
        source: source,
        body: body,
        result: result,
        sender: sender,
        recipientPhone: phone,
        url: url,
      );
      return result;
    }
  }
}
