import 'dart:io';

import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:telephony/telephony.dart';

import 'services/ingest_client.dart';

/// Android 백그라운드 SMS 수신 시 엔트리포인트 (telephony 플러그인 요구)
@pragma('vm:entry-point')
Future<void> smsBackgroundHandler(SmsMessage message) async {
  WidgetsFlutterBinding.ensureInitialized();
  await IngestClient.forward(
    body: message.body ?? '',
    sender: message.address,
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

class _HomePageState extends State<HomePage> {
  final _urlCtrl = TextEditingController();
  final _secretCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _iosTestBodyCtrl = TextEditingController();
  final _iosTestSenderCtrl = TextEditingController();

  String _status = '';
  bool _androidListening = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await _loadPrefs();
      if (Platform.isAndroid) {
        await _setupAndroidSms();
      }
    });
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
        );
        if (mounted) {
          setState(() {
            _status =
                r.ok ? '전송 완료 (${r.message})' : '전송 실패: ${r.message}';
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

  Future<void> _iosSendTest() async {
    final body = _iosTestBodyCtrl.text.trim();
    if (body.isEmpty) {
      setState(() => _status = '본문을 입력하세요.');
      return;
    }
    setState(() => _status = '전송 중…');
    final r = await IngestClient.forward(
      body: body,
      sender: _iosTestSenderCtrl.text.trim().isEmpty
          ? null
          : _iosTestSenderCtrl.text.trim(),
    );
    setState(() {
      _status = r.ok ? '테스트 성공 (${r.message})' : '실패: ${r.message}';
    });
  }

  @override
  void dispose() {
    _urlCtrl.dispose();
    _secretCtrl.dispose();
    _phoneCtrl.dispose();
    _iosTestBodyCtrl.dispose();
    _iosTestSenderCtrl.dispose();
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
                ? 'iOS는 시스템상 타 앱 SMS를 가로챌 수 없습니다. 아래에 문자를 붙여 넣어 서버·파서만 테스트하세요. 실사용은 Android에서 하시면 됩니다.'
                : 'Android: 앱을 켜 두기만 하면(권한 허용 후) 새 문자가 오면 자동으로 서버(sms-ingest)에 POST 합니다. 백그라운드에서도 전달을 시도합니다. 이 단말 번호는 관리자 반가상 설정과 동일(숫자만)으로 맞추세요.',
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
              _androidListening
                  ? '● 리스너 등록됨'
                  : '○ 리스너 미등록 / 권한 확인',
              style: TextStyle(
                color: _androidListening ? Colors.green : Colors.orange,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
          if (Platform.isIOS) ...[
            const SizedBox(height: 24),
            const Divider(),
            Text(
              'iOS 테스트 전송',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _iosTestSenderCtrl,
              decoration: const InputDecoration(
                labelText: '발신번호 (선택)',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _iosTestBodyCtrl,
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
              onPressed: _iosSendTest,
              child: const Text('테스트로 전송'),
            ),
          ],
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
        ],
      ),
    );
  }
}
