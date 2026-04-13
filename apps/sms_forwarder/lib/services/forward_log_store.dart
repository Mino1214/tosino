import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

abstract final class ForwardLogKeys {
  static const entries = 'forward_log_entries';
}

class ForwardLogEntry {
  const ForwardLogEntry({
    required this.atIso,
    required this.source,
    required this.ok,
    required this.message,
    required this.bodyPreview,
    this.sender,
    this.recipientPhone,
    this.url,
    this.httpStatus,
    this.serverStatus,
    this.serverMessage,
    this.duplicate = false,
  });

  final String atIso;
  final String source;
  final bool ok;
  final String message;
  final String bodyPreview;
  final String? sender;
  final String? recipientPhone;
  final String? url;
  final int? httpStatus;
  final String? serverStatus;
  final String? serverMessage;
  final bool duplicate;

  factory ForwardLogEntry.fromJson(Map<String, dynamic> json) {
    return ForwardLogEntry(
      atIso: json['atIso']?.toString() ?? '',
      source: json['source']?.toString() ?? 'unknown',
      ok: json['ok'] == true,
      message: json['message']?.toString() ?? '',
      bodyPreview: json['bodyPreview']?.toString() ?? '',
      sender: json['sender']?.toString(),
      recipientPhone: json['recipientPhone']?.toString(),
      url: json['url']?.toString(),
      httpStatus: json['httpStatus'] is int
          ? json['httpStatus'] as int
          : int.tryParse(json['httpStatus']?.toString() ?? ''),
      serverStatus: json['serverStatus']?.toString(),
      serverMessage: json['serverMessage']?.toString(),
      duplicate: json['duplicate'] == true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'atIso': atIso,
      'source': source,
      'ok': ok,
      'message': message,
      'bodyPreview': bodyPreview,
      'sender': sender,
      'recipientPhone': recipientPhone,
      'url': url,
      'httpStatus': httpStatus,
      'serverStatus': serverStatus,
      'serverMessage': serverMessage,
      'duplicate': duplicate,
    };
  }
}

class ForwardLogStore {
  static Future<List<ForwardLogEntry>> readAll() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getStringList(ForwardLogKeys.entries) ?? const [];
    return raw
        .map((item) {
          try {
            final decoded = jsonDecode(item);
            if (decoded is Map<String, dynamic>) {
              return ForwardLogEntry.fromJson(decoded);
            }
          } catch (_) {
            return null;
          }
          return null;
        })
        .whereType<ForwardLogEntry>()
        .toList();
  }

  static Future<void> append(ForwardLogEntry entry) async {
    final prefs = await SharedPreferences.getInstance();
    final items = prefs.getStringList(ForwardLogKeys.entries)?.toList() ?? [];
    items.insert(0, jsonEncode(entry.toJson()));
    if (items.length > 40) {
      items.removeRange(40, items.length);
    }
    await prefs.setStringList(ForwardLogKeys.entries, items);
  }

  static Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(ForwardLogKeys.entries);
  }
}
