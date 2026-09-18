import {
  cleanGrapeText,
  extractGrapesFromWine,
  parsePriceToNumber,
  calculateWineStatistics,
} from './wineStats';
import { Wine } from '../types/Wine';

describe('wineStats utility', () => {
  describe('cleanGrapeText', () => {
    it('removes vintages and dryness qualifiers', () => {
      expect(cleanGrapeText('Riesling trocken 2022')).toBe('Riesling');
      expect(cleanGrapeText('Blanc de Noir trocken')).toBe('');
      expect(cleanGrapeText('Crianza Tempranillo 2020')).toBe('Tempranillo');
    });

    it('removes parenthetical remarks', () => {
      expect(cleanGrapeText('Syrah (Selection especial)')).toBe('Syrah');
    });
  });

  describe('extractGrapesFromWine', () => {
    it('normalizes grape variations and typos to canonical names', () => {
      expect(extractGrapesFromWine('Weisser Burgunder')[0].name).toBe('Weißburgunder');
      expect(extractGrapesFromWine('Weissburgunder Trocken')[0].name).toBe('Weißburgunder');
      expect(extractGrapesFromWine('Temparanillo Rioja')[0].name).toBe('Tempranillo');
      expect(extractGrapesFromWine('Primitivo Di Manduria 2021')[0].name).toBe('Primitivo');
      expect(extractGrapesFromWine('Party Beast Pinot gricio')[0].name).toBe('Grauburgunder');
    });

    it('splits multi-grape cuvees into individual grapes', () => {
      const grapes = extractGrapesFromWine('Pinot Noir & Portugieser');
      const names = grapes.map(g => g.name);
      expect(names).toContain('Spätburgunder / Pinot Noir');
      expect(names).toContain('Portugieser');
    });

    it('identifies cuvees and regional blends', () => {
      const bordeaux = extractGrapesFromWine('Bordeaux 2022');
      expect(bordeaux[0].isBlend).toBe(true);
      expect(bordeaux[0].name).toBe('Bordeaux-Cuvée');
    });
  });

  describe('parsePriceToNumber', () => {
    it('parses slider price tiers', () => {
      expect(parsePriceToNumber('unter 5 €')).toBe(4.5);
      expect(parsePriceToNumber('5 €')).toBe(5.0);
      expect(parsePriceToNumber('12 €')).toBe(12.0);
      expect(parsePriceToNumber('ueber 12 €')).toBe(13.5);
    });

    it('parses legacy price ranges', () => {
      expect(parsePriceToNumber('5-8 €')).toBe(6.5);
      expect(parsePriceToNumber('8-12 €')).toBe(10.0);
      expect(parsePriceToNumber('12-15 €')).toBe(13.5);
    });

    it('handles numeric strings and returns null for invalid strings', () => {
      expect(parsePriceToNumber('7,99 €')).toBe(7.99);
      expect(parsePriceToNumber('')).toBeNull();
      expect(parsePriceToNumber(undefined)).toBeNull();
    });
  });

  describe('calculateWineStatistics', () => {
    const sampleWines: Wine[] = [
      {
        _id: { $oid: '1' },
        name: 'Wein 1',
        rebsorte: 'Primitivo',
        farbe: 'Rot',
        preis: '6 €',
        kauforte: ['Rewe'],
        geschmack: ['kräftig', 'fruchtig'],
        bewertung: 5,
        timestamp: { $date: '2025-01-01T00:00:00Z' },
      },
      {
        _id: { $oid: '2' },
        name: 'Wein 2',
        rebsorte: 'Weisser Burgunder',
        farbe: 'Weiß',
        preis: '8 €',
        kauforte: ['Rewe', 'Edeka'],
        geschmack: ['spritzig'],
        bewertung: 3,
        timestamp: { $date: '2025-01-02T00:00:00Z' },
      },
      {
        _id: { $oid: '3' },
        name: 'Wein 3',
        rebsorte: 'Pinot Noir & Portugieser',
        farbe: 'Rot',
        preis: '10 €',
        kauforte: ['Aldi'],
        geschmack: ['dünn'],
        bewertung: 2,
        timestamp: { $date: '2025-01-03T00:00:00Z' },
      },
    ];

    it('calculates correct aggregated statistics', () => {
      const stats = calculateWineStatistics(sampleWines);

      expect(stats.totalWines).toBe(3);
      // Colors: 2 Rot, 1 Weiß
      const rot = stats.colors.find(c => c.color === 'Rot');
      const weiss = stats.colors.find(c => c.color === 'Weiß');
      expect(rot?.count).toBe(2);
      expect(weiss?.count).toBe(1);

      // Stores: Rewe (2), Edeka (1), Aldi (1)
      expect(stats.topStores[0].store).toBe('Rewe');
      expect(stats.topStores[0].count).toBe(2);

      // Prices: 6, 8, 10 -> average = 8.00
      expect(stats.averagePrice).toBeCloseTo(8.0);

      // Grapes: Primitivo, Weißburgunder, Spätburgunder / Pinot Noir, Portugieser
      expect(stats.uniqueGrapesCountPure).toBe(4);

      // Taste correlation:
      // kraftig: avg 5.0 (100% high)
      // spritzig: avg 3.0
      // dunn: avg 2.0 (100% low)
      const kraftig = stats.tasteCorrelation.find(t => t.taste === 'kräftig');
      const dunn = stats.tasteCorrelation.find(t => t.taste === 'dünn');
      expect(kraftig?.averageRating).toBe(5.0);
      expect(kraftig?.highRatingPercentage).toBe(100);
      expect(dunn?.averageRating).toBe(2.0);
      expect(dunn?.lowRatingPercentage).toBe(100);
    });

    it('handles empty datasets safely without NaN or errors', () => {
      const stats = calculateWineStatistics([]);
      expect(stats.totalWines).toBe(0);
      expect(stats.averagePrice).toBe(0);
      expect(stats.colors).toEqual([]);
      expect(stats.topStores).toEqual([]);
      expect(stats.grapeRankings).toEqual([]);
      expect(stats.tasteCorrelation).toEqual([]);
    });
  });
});
