export const STOCK_CATEGORIES: Record<string, string[]> = {
  "Defence": ["HAL", "BEL", "MAZDOCK", "COCHINSHIP", "BDL", "BEML", "DATAPATTNS", "MTARTECH", "ZENTEC", "PARAS", "ASTRAMICRO", "TITAGARH", "GRSE", "MIDHANI", "APOLLOMICRO", "DCXINDIA", "IDEAFORGE", "NIBE", "SIKKO"],
  "Power & Energy": ["NTPC", "POWERGRID", "TATAPOWER", "JSWENERGY", "ADANIPOWER", "ADANIGREEN", "ADANIENSOL", "NHPC", "SJVN", "CESC", "TORNTPOWER", "SUZLON", "IREDA", "PTC", "WAAREEENER", "KPIGREEN", "INOXWIND", "JPPOWER", "RPOWER", "RTNPOWER", "KEC", "KALPATPOWR", "ORIANA", "SOLARINDS"],
  "PSU (Public Sector)": ["SBIN", "PNB", "BANKBARODA", "CANBK", "UNIONBANK", "IOB", "INDIANB", "UCOBANK", "MAHABANK", "CENTRALBK", "PSB", "IRFC", "RVNL", "IRCON", "RAILTEL", "COALINDIA", "ONGC", "OIL", "IOC", "BPCL", "HPCL", "GAIL", "SAIL", "NALCO", "NMDC", "BHEL", "PFC", "RECLTD", "LICI", "GICRE", "NIACL", "NBCC", "GMDC", "SJVN", "NHPC", "IREDA", "HUDCO", "FACT", "RCF", "NFL"],
  "Semiconductor & EMS": ["DIXON", "KAYNES", "SYRMA", "AVALON", "CYIENTDLM", "MICAELECT", "SPEL", "ASMTEC", "RIR", "CGPOWER", "MOSCHIP", "MICELECTRONICS", "OAL", "PGEL"],
  "Railways": ["IRFC", "RVNL", "IRCON", "RAILTEL", "TITAGARH", "TEXRAIL", "JWL", "BEML", "RITES", "CONCOR", "KINETIC", "OLECTRA"],
  "IT & Software": ["TCS", "INFY", "HCLTECH", "WIPRO", "TECHM", "LTIM", "PERSISTENT", "COFORGE", "MPHASIS", "KPITTECH", "TATAELXSI", "BSOFT", "ZENSARTECH", "SONATSOFTW", "HAPPSTMNDS", "NEWGEN", "DATAMATICS", "CEINFO", "OLECTRA", "CYIENT", "FSL", "ROUTE", "AFFLE", "LATENTVIEW", "RATEGAIN"],
  "Banking & Finance": ["HDFCBANK", "ICICIBANK", "AXISBANK", "KOTAKBANK", "INDUSINDBK", "BAJFINANCE", "BAJAJFINSV", "CHOLAFIN", "SHRIRAMFIN", "MUTHOOTFIN", "MANAPPURAM", "JIOFIN", "IREDA", "PFC", "RECLTD", "MCX", "BSE", "CDSL", "ANGELONE", "CAMS", "KFINTECH"],
  "Automobile & Auto Ancillary": ["TATAMOTORS", "M&M", "MARUTI", "BAJAJ-AUTO", "HEROMOTOCO", "EICHERMOT", "TVSMOTOR", "ASHOKLEY", "ESCORTS", "OLECTRA", "JBMMAUTO", "FORCEMOT", "SONACOMS", "BOSCHLTD", "UNOMINDA", "MRF", "APOLLOTYRE", "CEATLTD", "BALKRISIND", "EXIDEIND", "AMARAJABAT", "ENDURANCE", "CRAFTSMAN", "MINDA"],
  "Real Estate & Infra": ["DLF", "LODHA", "GODREJPROP", "PRESTIGE", "OBEROIRLTY", "SOBHA", "BRIGADE", "PURVA", "MAHLIFE", "SUNTECK", "KNRCON", "PNCINFRA", "NCC", "HGIRNFA", "IRB", "ASHOKA", "DILIPBUILD", "PSPPROJECT", "ITDCEM"],
  "Metals & Mining": ["TATASTEEL", "JSWSTEEL", "HINDALCO", "JINDALSTEL", "SAIL", "NMDC", "VEDL", "COALINDIA", "NATIONALUM", "HINDZINC", "APLAPOLLO", "RATNAMANI", "WELCORP"],
  "Healthcare & Pharma": ["SUNPHARMA", "DIVISLAB", "CIPLA", "DRREDDY", "APOLLOHOSP", "MAXHEALTH", "MEDANTA", "FORTIS", "LUPIN", "AUROPHARMA", "BIOCON", "TORNTPHARM", "MANKIND", "ALKEM", "SYNGENE"],
  "FMCG & Consumer": ["ITC", "HINDUNILVR", "NESTLEIND", "BRITANNIA", "TATACONSUM", "DABUR", "GODREJCP", "MARICO", "COLPAL", "VARUNBEV", "RADICO", "UBL", "USL"],
  "Chemicals": ["SRF", "PIIND", "UPL", "AARTIIND", "DEEPAKNTR", "NAVINFLUOR", "TATVA", "FINEORG", "CLEAN", "AMIORG", "VINATIORGA", "ATUL", "ALKYLAMINE", "BALAMINES"]
};

// Heuristic function to categorize unknown stocks based on their name or profile
export function getCategoriesForStock(symbol: string, companyName: string = ""): string[] {
  const symbolTrimmed = symbol.replace('.NS', '').replace('.BO', '');
  const categories: string[] = [];

  // 1. Check exact matches in our curated list
  for (const [catName, symbolsList] of Object.entries(STOCK_CATEGORIES)) {
    if (symbolsList.includes(symbolTrimmed)) {
      categories.push(catName);
    }
  }

  if (categories.length > 0) {
    return categories;
  }

  // 2. Guess based on Company Name keywords
  const name = (companyName || "").toUpperCase();
  if (name.includes("BANK") || name.includes("FINANCE") || name.includes("CAPITAL") || name.includes("INVESTMENT") || name.includes("HOUSING") || name.includes("MICROFINANCE") || name.includes("SECURITIES") || name.includes("HOLDINGS")) {
    categories.push("Banking & Finance");
  }
  if (name.includes("TECH") || name.includes("SOFT") || name.includes("INFOTECH") || name.includes("IT ") || name.includes("CYBER") || name.includes("SYSTEMS")) {
    categories.push("IT & Software");
  }
  if (name.includes("POWER") || name.includes("ENERGY") || name.includes("ELEC") || name.includes("SOLAR") || name.includes("GREEN") || name.includes("TRANS")) {
    categories.push("Power & Energy");
  }
  if (name.includes("CHEM") || name.includes("PHOSPHATE") || name.includes("FERTILIZER") || name.includes("ORGANICS") || name.includes("PESTICIDES") || name.includes("POLY")) {
    categories.push("Chemicals");
  }
  if (name.includes("PHARMA") || name.includes("LIFE") || name.includes("BIO") || name.includes("HEALTH") || name.includes("HOSPITAL") || name.includes("CLINIC") || name.includes("DRUG") || name.includes("LAB") || name.includes("CARE")) {
    categories.push("Healthcare & Pharma");
  }
  if (name.includes("STEEL") || name.includes("METAL") || name.includes("MINING") || name.includes("IRON") || name.includes("COPPER") || name.includes("ALUMINIUM") || name.includes("ALLOY") || name.includes("WIRE")) {
    categories.push("Metals & Mining");
  }
  if (name.includes("REAL") || name.includes("ESTATE") || name.includes("INFRA") || name.includes("PROPERT") || name.includes("BUILD") || name.includes("CONSTRUCT") || name.includes("CEMENT") || name.includes("DEVELOP") || name.includes("HOTEL") || name.includes("RESORT")) {
    categories.push("Real Estate & Infra");
  }
  if (name.includes("RETAIL") || name.includes("FOOD") || name.includes("CONSUMER") || name.includes("BREW") || name.includes("AGRO") || name.includes("DISTILLER") || name.includes("SPINNING") || name.includes("TEXTILE") || name.includes("GARMENT") || name.includes("MILLS")) {
    categories.push("FMCG & Consumer");
  }
  if (name.includes("MOTOR") || name.includes("AUTO") || name.includes("GEAR") || name.includes("TYRE") || name.includes("TRACTOR") || name.includes("VEHICLE")) {
    categories.push("Automobile & Auto Ancillary");
  }
  if (name.includes("AERO") || name.includes("DEFENCE") || name.includes("AVIATION") || name.includes("SHIP") || name.includes("DYNA") || name.includes("EXPLOSIVE")) {
    categories.push("Defence");
  }

  if (categories.length === 0) {
    categories.push("Others");
  }

  return [...new Set(categories)]; // deduplicate
}
