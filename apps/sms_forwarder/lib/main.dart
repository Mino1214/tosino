import 'dart:io';

import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:telephony/telephony.dart';

import 'services/forward_log_store.dart';
import 'services/ingest_client.dart';

/// Android 백그라운드 SMS 수신 시 엔트리포인트 (telephony 플러그인 요구)
@pragma('vm:entry-point')
Future<void> smsBackgroundHandler(SmsMessage message) async {
  WidgetsFlutterBinding.ensureInitialized();
  await IngestClient.forward(
    body: message.body ?? '',
    sender: message.address,
    source: 'background-sms',
  );
}

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const SmsForwarderApp());
}

class SmsForwarderApp extends StatelessWidget {
  const SmsForwarderApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Tosino SMS',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF6D28D9)),
        useMaterial3: true,
      ),
      home: const HomePage(),
    );
  }
}

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> with WidgetsBindingObserver {
  final _urlCtrl = TextEditingController();
  final _secretCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _testBodyCtrl = TextEditingController();
  final _testSenderCtrl = TextEditingController();

  String _status = '';
  bool _androidListening = false;
  List<ForwardLogEntry> _logs = const [];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await _loadPrefs();
      await _loadLogs();
      if (Platform.isAndroid) {
        await _setupAndroidSms();
      }
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _loadLogs();
    }
  }

  Future<void> _loadPrefs() async {
    final p = await SharedPreferences.getInstance();
    setState(() {
      _urlCtrl.text = p.getString(PrefsKeys.url) ?? '';
      _secretCtrl.text = p.getString(PrefsKeys.secret) ?? '';
      _phoneCtrl.text = p.getString(PrefsKeys.devicePhone) ?? '';
    });
  }

  Future<void> _savePrefs() async {
    final p = await SharedPreferences.getInstance();
    await p.setString(PrefsKeys.url, _urlCtrl.text.trim());
    await p.setString(PrefsKeys.secret, _secretCtrl.text.trim());
    final digits = _phoneCtrl.text.replaceAll(RegExp(r'\D'), '');
    await p.setString(PrefsKeys.devicePhone, digits);
    setState(() => _status = '설정을 저장했습니다.');
  }

  Future<void> _loadLogs() async {
    final items = await ForwardLogStore.readAll();
    if (!mounted) return;
    setState(() {
      _logs = items;
    });
  }

  Future<void> _clearLogs() async {
    await ForwardLogStore.clear();
    if (!mounted) return;
    setState(() {
      _logs = const [];
      _status = '전달 로그를 비웠습니다.';
    });
  }

  Future<void> _setupAndroidSms() async {
    final telephony = Telephony.instance;
    final granted = await telephony.requestPhoneAndSmsPermissions;
    if (granted != true) {
      setState(() {
        _status = 'SMS 권한이 거부되었습니다. 설정에서 허용해 주세요.';
        _androidListening = false;
      });
      return;
    }

    telephony.listenIncomingSms(
      onNewMessage: (SmsMessage m) async {
        final r = await IngestClient.forward(
          body: m.body ?? '',
          sender: m.address,
          source: 'foreground-sms',
        );
        await _loadLogs();
        if (mounted) {
          setState(() {
            _status =
                r.ok ? '실수신 전달 성공: ${r.message}' : '실수신 전달 실패: ${r.message}';
          });
        }
      },
      onBackgroundMessage: smsBackgroundHandler,
      listenInBackground: true,
    );

    setState(() {
      _androidListening = true;
      _status = 'Android: SMS 수신 대기 (앱이 백그라운드여도 전달 시도)';
    });
  }

  Future<void> _openAndroidSettings() async {
    await openAppSettings();
  }

  Future<void> _sendManualTest() async {
    final body = _testBodyCtrl.text.trim();
    if (body.isEmpty) {
      setState(() => _status = '본문을 입력하세요.');
      return;
    }
    setState(() => _status = '전송 중…');
    final r = await IngestClient.forward(
      body: body,
      sender: _testSenderCtrl.text.trim().isEmpty
          ? null
          : _testSenderCtrl.text.trim(),
      source: 'manual-test',
    );
    await _loadLogs();
    setState(() {
      _status = r.ok ? '수동 테스트 성공: ${r.message}' : '수동 테스트 실패: ${r.message}';
    });
  }

  String _sourceLabel(String source) {
    switch (source) {
      case 'foreground-sms':
        return '실수신(포그라운드)';
      case 'background-sms':
        return '실수신(백그라운드)';
      case 'manual-test':
        return '수동 테스트';
      default:
        return source;
    }
  }

  String _formatAt(String atIso) {
    final dt = DateTime.tryParse(atIso)?.toLocal();
    if (dt == null) return atIso;
    final mm = dt.month.toString().padLeft(2, '0');
    final dd = dt.day.toString().padLeft(2, '0');
    final hh = dt.hour.toString().padLeft(2, '0');
    final mi = dt.minute.toString().padLeft(2, '0');
    final ss = dt.second.toString().padLeft(2, '0');
    return '$mm-$dd $hh:$mi:$ss';
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _urlCtrl.dispose();
    _secretCtrl.dispose();
    _phoneCtrl.dispose();
    _testBodyCtrl.dispose();
    _testSenderCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Tosino SMS → 서버'),
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            Platform.isIOS
                ? 'iOS는 시스템상 타 앱 SMS를 가로챌 수 없습니다. 아래 수동 테스트로 서버·파서만 검증하세요.'
                : 'Android: 권한 허용 후 새 문자가 오면 자동으로 서버(sms-ingest)에 POST 합니다. 백그라운드에서도 전달을 시도하고, 아래 최근 로그에 성공/실패와 서버 처리 상태를 남깁니다. 이 단말 번호는 관리자 반가상 설정과 동일(숫자만)으로 맞추세요.',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _urlCtrl,
            decoration: const InputDecoration(
              labelText: '수신 서버 URL',
              border: OutlineInputBorder(),
              hintText: 'https://your-host/webhook/sms',
            ),
            keyboardType: TextInputType.url,
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _secretCtrl,
            decoration: const InputDecoration(
              labelText: 'SMS_INGEST_SECRET (선택)',
              border: OutlineInputBorder(),
              hintText: '서버 .env에 비밀 없으면 비워도 됨',
            ),
            obscureText: true,
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _phoneCtrl,
            decoration: const InputDecoration(
              labelText: '이 단말 전화번호 (숫자만)',
              border: OutlineInputBorder(),
              hintText: '01012345678',
            ),
            keyboardType: TextInputType.phone,
          ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: _savePrefs,
            child: const Text('설정 저장'),
          ),
          if (Platform.isAndroid) ...[
            const SizedBox(height: 12),
            OutlinedButton(
              onPressed: _openAndroidSettings,
              child: const Text('앱 권한 설정 열기'),
            ),
            const SizedBox(height: 8),
            Text(
              _androidListening ? '● 리스너 등록됨' : '○ 리스너 미등록 / 권한 확인',
              style: TextStyle(
                color: _androidListening ? Colors.green : Colors.orange,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
          if (Platform.isIOS) ...[
            const SizedBox(height: 8),
          ],
          const SizedBox(height: 24),
          const Divider(),
          Text(
            '수동 테스트 전송',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          Text(
            Platform.isAndroid
                ? '실수신과 별개로, 현재 설정 URL이 정상 POST 되는지 지금 바로 확인할 수 있습니다. [Web발신] 문자 본문을 그대로 붙여 넣어 보세요.'
                : '문자 본문을 그대로 붙여 넣어 현재 서버와 파서 동작을 검증하세요.',
            style: Theme.of(context).textTheme.bodySmall,
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _testSenderCtrl,
            decoration: const InputDecoration(
              labelText: '발신번호 (선택)',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _testBodyCtrl,
            decoration: const InputDecoration(
              labelText: '문자 전체 본문 붙여넣기',
              border: OutlineInputBorder(),
              alignLabelWithHint: true,
            ),
            minLines: 6,
            maxLines: 14,
          ),
          const SizedBox(height: 12),
          FilledButton.tonal(
            onPressed: _sendManualTest,
            child: const Text('테스트 본문 전송'),
          ),
          const SizedBox(height: 24),
          const Divider(),
          Text(
            '상태',
            style: Theme.of(context).textTheme.titleSmall,
          ),
          const SizedBox(height: 4),
          SelectableText(
            _status.isEmpty ? '—' : _status,
            style: Theme.of(context).textTheme.bodySmall,
          ),
          const SizedBox(height: 24),
          const Divider(),
          Row(
            children: [
              Expanded(
                child: Text(
                  '최근 전달 로그',
                  style: Theme.of(context).textTheme.titleSmall,
                ),
              ),
              TextButton(
                onPressed: _loadLogs,
                child: const Text('새로고침'),
              ),
              TextButton(
                onPressed: _clearLogs,
                child: const Text('비우기'),
              ),
            ],
          ),
          const SizedBox(height: 8),
          if (_logs.isEmpty)
            Text(
              '아직 전달 기록이 없습니다.',
              style: Theme.of(context).textTheme.bodySmall,
            )
          else
            ..._logs.map(
              (entry) => Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: entry.ok
                      ? Colors.green.withValues(alpha: 0.08)
                      : Colors.red.withValues(alpha: 0.08),
                  border: Border.all(
                    color: entry.ok
                        ? Colors.green.withValues(alpha: 0.25)
                        : Colors.red.withValues(alpha: 0.25),
                  ),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            '${_formatAt(entry.atIso)} · ${_sourceLabel(entry.source)}',
                            style: Theme.of(context).textTheme.labelMedium,
                          ),
                        ),
                        Text(
                          entry.ok ? '성공' : '실패',
                          style: TextStyle(
                            color: entry.ok ? Colors.green : Colors.red,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    SelectableText(
                      entry.message,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    if (entry.serverStatus != null &&
                        entry.serverStatus!.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        '서버 상태: ${entry.serverStatus}',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                    if (entry.sender != null && entry.sender!.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        '발신: ${entry.sender}',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                    if (entry.recipientPhone != null &&
                        entry.recipientPhone!.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        '수신 단말: ${entry.recipientPhone}',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                    if (entry.bodyPreview.isNotEmpty) ...[
                      const SizedBox(height: 6),
                      SelectableText(
                        entry.bodyPreview,
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}
