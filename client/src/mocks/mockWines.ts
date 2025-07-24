import { Wine } from '../types/Wine';

export const mockWines: Wine[] = [
  {
    _id: { $oid: "507f1f77bcf86cd799439011" },
    name: "Château Margaux 2018",
    rebsorte: "Cabernet Sauvignon",
    farbe: "Rot",
    preis: "12-15 €",
    kauforte: ["Edeka"],
    geschmack: ["kräftig", "intensiv"],
    kategorie: "Evergreen",
    unterkategorie: "schwer",
    notizen: "",
    bewertung: 5,
    imageUrl: "https://cdn.pixabay.com/photo/2016/09/29/21/52/still-life-1703929_1280.jpg",
    timestamp: { $date: "2025-07-24T10:00:00.000Z" }
  },
  {
    _id: { $oid: "507f1f77bcf86cd799439012" },
    name: "Weißer Burgunder",
    rebsorte: "Burgunder",
    farbe: "Weiß",
    preis: "8-12 €",
    kauforte: ["Rewe"],
    geschmack: ["fruchtig", "gefällig"],
    kategorie: "Weinstand",
    unterkategorie: "leicht",
    notizen: "Angenehmer Alltagswein",
    bewertung: 4,
    imageUrl: "https://cdn.pixabay.com/photo/2014/09/13/15/38/bottles-444170_1280.jpg",
    timestamp: { $date: "2025-07-24T10:00:00.000Z" }
  },
  {
    _id: { $oid: "507f1f77bcf86cd799439013" },
    name: "Rosé de Provence",
    rebsorte: "Grenache",
    farbe: "Rosé",
    preis: "5-8 €",
    kauforte: ["Lidl"],
    geschmack: ["spritzig", "dünn"],
    kategorie: "Kochwein",
    unterkategorie: "auch trinkbar",
    notizen: "Geeignet für leichte Sommergerichte",
    bewertung: 3,
    imageUrl: "https://cdn.pixabay.com/photo/2020/06/21/02/31/wine-5323009_1280.jpg",
    timestamp: { $date: "2025-07-24T10:00:00.000Z" }
  }
];