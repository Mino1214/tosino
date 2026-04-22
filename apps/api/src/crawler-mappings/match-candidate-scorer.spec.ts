import {
  calculateNameSimilarity,
  findTopCandidates,
  normalizeTeamName,
  scoreMatch,
} from './match-candidate-scorer';

const baseApi = {
  id: 70772766,
  home: 'Deportivo Merlo',
  away: 'Club Comunicaciones',
  sport: { slug: 'football' },
  league: { slug: 'argentina-primera-b' },
};

const baseCrawl = {
  id: 'raw-1',
  home: 'Deportivo Merlo',
  away: 'Club Comunicaciones',
  leagueSlug: 'argentina-primera-b',
  sportSlug: 'football',
};

describe('normalizeTeamName', () => {
  it('removes club/fc and expands abbreviations', () => {
    expect(normalizeTeamName('Club Comunicaciones')).toBe('comunicaciones');
    expect(normalizeTeamName('FC Seoul')).toBe('seoul');
  });
});

describe('calculateNameSimilarity', () => {
  it('uses confirmed mapping pair', () => {
    const r = calculateNameSimilarity('FC Seoul', '서울', {
      confirmedPairs: [{ apiName: 'FC Seoul', crawlName: '서울' }],
    });
    expect(r.matchType).toBe('mapping');
    expect(r.score).toBe(25);
  });

  it('case 2: Club prefix stripped → normalized', () => {
    const r = calculateNameSimilarity('Club Comunicaciones', 'Comunicaciones');
    expect(r.matchType).toBe('normalized');
    expect(r.score).toBeGreaterThanOrEqual(23);
  });

  it('case 3: FC stripped', () => {
    const r = calculateNameSimilarity('FC Seoul', 'Seoul');
    expect(r.matchType).toBe('normalized');
    expect(r.score).toBeGreaterThanOrEqual(23);
  });

  it('case 4: wrong club — lower than exact', () => {
    const bad = calculateNameSimilarity('Deportivo Merlo', 'Deportivo Armenio');
    const good = calculateNameSimilarity('Deportivo Merlo', 'Deportivo Merlo');
    expect(bad.score).toBeLessThan(good.score);
    expect(bad.matchType).toBe('fuzzy');
    expect(bad.score).toBeLessThan(20);
  });
});

describe('scoreMatch', () => {
  it('case 1: identical line-up in 95–100 range (cap 100)', () => {
    const r = scoreMatch(
      { ...baseApi },
      { ...baseCrawl },
    );
    expect(r).not.toBeNull();
    expect(r!.score).toBeGreaterThanOrEqual(95);
    expect(r!.score).toBeLessThanOrEqual(100);
    expect(r!.home.matchType).toBe('exact');
    expect(r!.away.matchType).toBe('exact');
    expect(r!.tier).toBe('strong');
  });

  it('case 5: different league slug → excluded', () => {
    const r = scoreMatch(
      { ...baseApi },
      { ...baseCrawl, leagueSlug: 'other-league' },
    );
    expect(r).toBeNull();
  });

  it('case 5: sport mismatch → excluded', () => {
    const r = scoreMatch(
      { ...baseApi },
      { ...baseCrawl, sportSlug: 'tennis' },
    );
    expect(r).toBeNull();
  });
});

describe('findTopCandidates', () => {
  it('sorts by score then exact count then id', () => {
    const api = { ...baseApi, id: 1 };
    const rows = [
      { ...baseCrawl, id: 'b', away: 'Comunicaciones' },
      { ...baseCrawl, id: 'a' },
    ];
    const top = findTopCandidates(api, rows, [], { limit: 5 });
    expect(top.length).toBe(2);
    expect(top[0].score).toBeGreaterThanOrEqual(top[1].score);
    if (top[0].score === top[1].score) {
      expect(top[0].crawlMatchId < top[1].crawlMatchId).toBe(true);
    }
  });
});
