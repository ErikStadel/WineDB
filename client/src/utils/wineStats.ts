import { Wine } from '../types/Wine';

export interface ColorStat {
  color: string;
  count: number;
  percentage: number;
  stripeColor: string;
}

export interface StoreStat {
  store: string;
  count: number;
  percentage: number;
}

export interface GrapeStat {
  grape: string;
  count: number;
  percentage: number;
  isBlend?: boolean;
}

export interface TasteStat {
  taste: string;
  averageRating: number;
  count: number;
  highRatingCount: number; // rating >= 4
  highRatingPercentage: number;
  lowRatingCount: number;  // rating <= 2
  lowRatingPercentage: number;
}

export interface PriceDistribution {
  range: string;
  count: number;
}

export interface WineStatistics {
  totalWines: number;
  winesWithRating: number;
  colors: ColorStat[];
  topStores: StoreStat[];
  uniqueGrapesCount: number;
  uniqueGrapesCountPure: number;
  grapeRankings: GrapeStat[];
  averagePrice: number;
  winesWithPrice: number;
  priceDistribution: PriceDistribution[];
  tasteCorrelation: TasteStat[];
}

/**
 * Bereinigt Freitext von Rebsorten um Qualitätsbezeichnungen, Jahrgänge, Reifegrade etc.
 */
export function cleanGrapeText(raw: string): string {
  if (!raw) return '';
  let s = raw.trim();
  // Typografische Anführungszeichen vereinheitlichen
  s = s.replace(/[\u2018\u2019\u0060\u00B4]/g, "'");
  // 4-stellige Jahreszahlen entfernen (z. B. 2018, 2021, 2022)
  s = s.replace(/\b(19|20)\d{2}\b/g, '');
  // Klammerbemerkungen entfernen (z. B. "(Selection especial)")
  s = s.replace(/\([^)]*\)/g, '');

  // Wein- & Reife-Qualifikatoren entfernen
  const qualifiers = [
    /\btrocken\b/gi, /\bhalbtrocken\b/gi, /\blieblich\b/gi, /\bfeinherb\b/gi, /\bbrut\b/gi,
    /\bgran reserva\b/gi, /\breserva\b/gi, /\bcrianza\b/gi, /\briserva\b/gi,
    /\bsuperieur\b/gi, /\bsupérieur\b/gi, /\breserve\b/gi, /\bgrand reserve\b/gi,
    /\bgrand seleccion\b/gi, /\bselection especial\b/gi, /\bold vine\b/gi,
    /\bsaisonale weinlese\b/gi, /\bpassiata\b/gi, /\bripasso\b/gi,
    /\bkiedricher wasserross\b/gi, /\bwildes holz\b/gi, /\bparty beast\b/gi, /\bspecial for sushi\b/gi,
    /\bblanc de noirs?\b/gi, /\bblancs de noirs?\b/gi, /\brosato\b/gi, /\bcampagna rosata\b/gi,
    /\brosado\b/gi, /\bblanco\b/gi, /\brosso\b/gi, /\brosé\b/gi, /\brose\b/gi
  ];

  for (const q of qualifiers) {
    s = s.replace(q, ' ');
  }

  return s.trim().replace(/\s+/g, ' ');
}

// Mapping von Mustern auf standardisierte Rebsorten-Namen
const GRAPE_PATTERNS: { regex: RegExp; name: string; isBlend?: boolean }[] = [
  { regex: /primitivo/i, name: 'Primitivo' },
  { regex: /weißburgunder|weissburgunder|weißer burgunder|weisser burgunder/i, name: 'Weißburgunder' },
  { regex: /grauburgunder|pinot grigio|pinot gricio/i, name: 'Grauburgunder' },
  { regex: /spätburgunder|pinot noir/i, name: 'Spätburgunder / Pinot Noir' },
  { regex: /tempranillo|temparanillo|rioja/i, name: 'Tempranillo' },
  { regex: /riesling/i, name: 'Riesling' },
  { regex: /chardonnay/i, name: 'Chardonnay' },
  { regex: /sauvignon blanc/i, name: 'Sauvignon Blanc' },
  { regex: /merlot/i, name: 'Merlot' },
  { regex: /cabernet|cabanet/i, name: 'Cabernet Sauvignon' },
  { regex: /syrah|shiraz/i, name: 'Syrah' },
  { regex: /grenache|garnach[ea]/i, name: 'Grenache' },
  { regex: /negroamaro|negro amaro/i, name: 'Negroamaro' },
  { regex: /nero d[' ]*avola/i, name: "Nero d'Avola" },
  { regex: /nero di troia/i, name: 'Nero di Troia' },
  { regex: /monastrell/i, name: 'Monastrell' },
  { regex: /barbera/i, name: 'Barbera' },
  { regex: /montepulciano/i, name: 'Montepulciano' },
  { regex: /sangiovese|toscana/i, name: 'Sangiovese' },
  { regex: /portugieser/i, name: 'Portugieser' },
  { regex: /susmanello|susumaniello/i, name: 'Susumaniello' },
  { regex: /lugana|turbiana/i, name: 'Lugana (Turbiana)' },
  { regex: /bardolino|valpolicella|corvina/i, name: 'Corvina (Valpolicella/Bardolino)' },
  { regex: /costieres de nimes/i, name: 'Costières de Nîmes (Rhône-Blend)', isBlend: true },
  { regex: /salice salentino/i, name: 'Salice Salentino (Negroamaro-Blend)', isBlend: true },
  { regex: /bordeaux/i, name: 'Bordeaux-Cuvée', isBlend: true },
  { regex: /cuv[eé]e/i, name: 'Cuvée (Sonstige)', isBlend: true },
  { regex: /bianca/i, name: 'Bianca' },
];

/**
 * Extrahiert und normalisiert Rebsorten aus einem Freitextfeld.
 * Unterstützt Mehrfachnennungen / Cuvées mit Trennzeichen (&, /, +, Komma, "und").
 */
export function extractGrapesFromWine(rawRebsorte?: string): { name: string; isBlend?: boolean }[] {
  if (!rawRebsorte || !rawRebsorte.trim()) {
    return [{ name: 'Nicht angegeben', isBlend: true }];
  }

  const cleaned = cleanGrapeText(rawRebsorte);
  const detected: { name: string; isBlend?: boolean }[] = [];

  for (const entry of GRAPE_PATTERNS) {
    if (entry.regex.test(cleaned)) {
      detected.push({ name: entry.name, isBlend: entry.isBlend });
    }
  }

  // Falls kein Muster matcht, aber noch Text übrig ist
  if (detected.length === 0) {
    if (cleaned.length > 1) {
      const fallbackName = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      detected.push({ name: fallbackName, isBlend: false });
    } else {
      detected.push({ name: 'Nicht angegeben', isBlend: true });
    }
  }

  // Deduplizieren
  const uniqueMap = new Map<string, { name: string; isBlend?: boolean }>();
  detected.forEach(d => {
    if (!uniqueMap.has(d.name)) uniqueMap.set(d.name, d);
  });

  return Array.from(uniqueMap.values());
}

/**
 * Preiswerte aus Slider- oder Alt-Format in numerischen Euro-Betrag wandeln
 */
export function parsePriceToNumber(preisStr?: string): number | null {
  if (!preisStr || typeof preisStr !== 'string') return null;
  const trimmed = preisStr.trim().toLowerCase();

  const priceMap: { [key: string]: number } = {
    'unter 5 €': 4.5,
    '<5 €': 4.5,
    '< 5 €': 4.5,
    '5 €': 5.0,
    '5-8 €': 6.5,
    '6 €': 6.0,
    '7 €': 7.0,
    '8 €': 8.0,
    '8-12 €': 10.0,
    '9 €': 9.0,
    '10 €': 10.0,
    '11 €': 11.0,
    '12 €': 12.0,
    '12-15 €': 13.5,
    'ueber 12 €': 13.5,
    'über 12 €': 13.5,
    '>12 €': 13.5,
    '> 12 €': 13.5,
    'ueber 15 €': 16.0,
    'über 15 €': 16.0,
    '>15 €': 16.0,
  };

  if (priceMap[trimmed] !== undefined) {
    return priceMap[trimmed];
  }

  // Regulärer Zahlenausdruck (z. B. "7.99" oder "8,50 €")
  const match = trimmed.match(/(\d+(?:[.,]\d+)?)/);
  if (match) {
    const parsed = parseFloat(match[1].replace(',', '.'));
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }

  return null;
}

/**
 * Hauptfunktion zur Berechnung der 6 Statistiken aus einer Liste von Weinen.
 */
export function calculateWineStatistics(wines: Wine[]): WineStatistics {
  const totalWines = wines.length;

  // 1. Weine je Farbe
  const colorCount: { [key: string]: number } = { Rot: 0, Weiß: 0, Rosé: 0 };
  let otherColorCount = 0;

  wines.forEach(w => {
    const f = w.farbe ? w.farbe.trim() : '';
    if (f === 'Rot') colorCount.Rot++;
    else if (f === 'Weiß') colorCount.Weiß++;
    else if (f === 'Rosé') colorCount.Rosé++;
    else if (f) {
      colorCount[f] = (colorCount[f] || 0) + 1;
    } else {
      otherColorCount++;
    }
  });

  const stripeColorMap: { [key: string]: string } = {
    Rot: 'var(--color-wine-red)',
    Weiß: 'var(--color-wine-white)',
    Rosé: 'var(--color-wine-rose)',
  };

  const colors: ColorStat[] = Object.entries(colorCount)
    .filter(([_, count]) => count > 0)
    .map(([color, count]) => ({
      color,
      count,
      percentage: totalWines > 0 ? Math.round((count / totalWines) * 100) : 0,
      stripeColor: stripeColorMap[color] || 'var(--color-accent)',
    }))
    .sort((a, b) => b.count - a.count);

  if (otherColorCount > 0) {
    colors.push({
      color: 'Sonstige / Keine',
      count: otherColorCount,
      percentage: totalWines > 0 ? Math.round((otherColorCount / totalWines) * 100) : 0,
      stripeColor: 'var(--color-text-muted)',
    });
  }

  // 2. Wo wurden die meisten Weine gekauft
  const storeCount: { [key: string]: number } = {};
  wines.forEach(w => {
    const stores = Array.isArray(w.kauforte) && w.kauforte.length > 0 ? w.kauforte : ['Unbekannt'];
    stores.forEach(st => {
      const cleanStore = st.trim();
      if (cleanStore) {
        storeCount[cleanStore] = (storeCount[cleanStore] || 0) + 1;
      }
    });
  });

  const topStores: StoreStat[] = Object.entries(storeCount)
    .map(([store, count]) => ({
      store,
      count,
      percentage: totalWines > 0 ? Math.round((count / totalWines) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // 3. & 4. Rebsorten normalisiert & Anzahl probierter Sorten
  const grapeCountMap: { [key: string]: { count: number; isBlend: boolean } } = {};

  wines.forEach(w => {
    const grapes = extractGrapesFromWine(w.rebsorte);
    grapes.forEach(g => {
      if (!grapeCountMap[g.name]) {
        grapeCountMap[g.name] = { count: 0, isBlend: !!g.isBlend };
      }
      grapeCountMap[g.name].count += 1;
    });
  });

  const grapeRankings: GrapeStat[] = Object.entries(grapeCountMap)
    .map(([grape, data]) => ({
      grape,
      count: data.count,
      percentage: totalWines > 0 ? Math.round((data.count / totalWines) * 100) : 0,
      isBlend: data.isBlend,
    }))
    .sort((a, b) => b.count - a.count);

  // Reine Rebsorten (ohne generische Cuvées / Nicht angegeben)
  const pureGrapes = grapeRankings.filter(
    g => !g.isBlend && g.grape !== 'Nicht angegeben' && g.grape !== 'Unbekannt'
  );
  const uniqueGrapesCountPure = pureGrapes.length;
  const uniqueGrapesCount = grapeRankings.filter(
    g => g.grape !== 'Nicht angegeben' && g.grape !== 'Unbekannt'
  ).length;

  // 5. Durchschnittspreis & Verteilung
  let totalPriceSum = 0;
  let winesWithPrice = 0;
  const priceDistributionMap: { [range: string]: number } = {
    '< 5 €': 0,
    '5 – 7 €': 0,
    '8 – 10 €': 0,
    '> 10 €': 0,
  };

  wines.forEach(w => {
    const numPrice = parsePriceToNumber(w.preis);
    if (numPrice !== null) {
      totalPriceSum += numPrice;
      winesWithPrice++;

      if (numPrice < 5) priceDistributionMap['< 5 €']++;
      else if (numPrice <= 7) priceDistributionMap['5 – 7 €']++;
      else if (numPrice <= 10) priceDistributionMap['8 – 10 €']++;
      else priceDistributionMap['> 10 €']++;
    }
  });

  const averagePrice = winesWithPrice > 0 ? totalPriceSum / winesWithPrice : 0;
  const priceDistribution: PriceDistribution[] = Object.entries(priceDistributionMap).map(
    ([range, count]) => ({ range, count })
  );

  // 6. Geschmack vs. Bewertung
  const tasteStatsMap: {
    [taste: string]: { sum: number; count: number; highCount: number; lowCount: number };
  } = {};
  let winesWithRating = 0;

  wines.forEach(w => {
    const rating = typeof w.bewertung === 'number' ? w.bewertung : parseInt(String(w.bewertung)) || 0;
    if (rating > 0) {
      winesWithRating++;
      if (Array.isArray(w.geschmack) && w.geschmack.length > 0) {
        w.geschmack.forEach(t => {
          const cleanTaste = t.trim();
          if (!cleanTaste) return;
          if (!tasteStatsMap[cleanTaste]) {
            tasteStatsMap[cleanTaste] = { sum: 0, count: 0, highCount: 0, lowCount: 0 };
          }
          tasteStatsMap[cleanTaste].sum += rating;
          tasteStatsMap[cleanTaste].count += 1;
          if (rating >= 4) tasteStatsMap[cleanTaste].highCount += 1;
          if (rating <= 2) tasteStatsMap[cleanTaste].lowCount += 1;
        });
      }
    }
  });

  const tasteCorrelation: TasteStat[] = Object.entries(tasteStatsMap)
    .map(([taste, d]) => ({
      taste,
      averageRating: parseFloat((d.sum / d.count).toFixed(2)),
      count: d.count,
      highRatingCount: d.highCount,
      highRatingPercentage: Math.round((d.highCount / d.count) * 100),
      lowRatingCount: d.lowCount,
      lowRatingPercentage: Math.round((d.lowCount / d.count) * 100),
    }))
    .sort((a, b) => b.averageRating - a.averageRating);

  return {
    totalWines,
    winesWithRating,
    colors,
    topStores,
    uniqueGrapesCount,
    uniqueGrapesCountPure,
    grapeRankings,
    averagePrice,
    winesWithPrice,
    priceDistribution,
    tasteCorrelation,
  };
}
