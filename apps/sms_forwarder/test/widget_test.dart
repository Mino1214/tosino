import 'package:flutter_test/flutter_test.dart';
import 'package:sms_forwarder/main.dart';

void main() {
  testWidgets('앱 로드', (WidgetTester tester) async {
    await tester.pumpWidget(const SmsForwarderApp());
    expect(find.textContaining('Tosino'), findsWidgets);
  });
}
