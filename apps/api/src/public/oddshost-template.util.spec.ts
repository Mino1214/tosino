import { expandOddsHostUrlTemplate, yyyymmddSeoul } from './oddshost-template.util';

describe('yyyymmddSeoul', () => {
  it('returns 8 digits for a fixed instant in KST', () => {
    const d = new Date('2026-04-11T15:00:00.000Z');
    expect(yyyymmddSeoul(d)).toMatch(/^\d{8}$/);
  });
});

describe('expandOddsHostUrlTemplate', () => {
  const vars = { key: 'ab-cd', sport: '1', game_id: '999' };

  it('encodes key sport game_id', () => {
    const u = expandOddsHostUrlTemplate(
      'https://api.example/inplay/1xb/?token={key}&sport={sport}&game_id={game_id}',
      vars,
    );
    expect(u).toContain('token=ab-cd');
    expect(u).toContain('sport=1');
    expect(u).toContain('game_id=999');
  });

  it('replaces {date} when override given', () => {
    const u = expandOddsHostUrlTemplate(
      'https://x/prematch?token={key}&sport={sport}&date={date}',
      { key: 'k', sport: '2', game_id: '' },
      '20260412',
    );
    expect(u).toContain('date=20260412');
  });

  it('does not add date segment when template has no {date}', () => {
    const u = expandOddsHostUrlTemplate(
      'https://x/inplay?token={key}&sport={sport}',
      vars,
      '20990101',
    );
    expect(u).not.toContain('20990101');
  });
});
