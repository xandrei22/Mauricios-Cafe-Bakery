const STANDARD_MEASUREMENTS = {
  shot: {
    ml: 25,     // 1 shot = 25ml
    g: 18       // 1 shot = 18g (for coffee beans)
  },
  pump: {
    ml: 15      // 1 pump = 15ml
  },
  cup: {
    ml: 240     // 1 cup = 240ml
  },
  sprinkle: {
    g: 0.5      // 1 sprinkle = 0.5g
  }
};

const UNIT_CONVERSIONS = {
  volume: {
    l: 1000,    // 1 L = 1000 ml
    ml: 1,
    cl: 10      // 1 cl = 10 ml
  },
  weight: {
    kg: 1000,   // 1 kg = 1000 g
    g: 1,
    mg: 0.001   // 1 mg = 0.001 g
  }
};

module.exports = {
  STANDARD_MEASUREMENTS,
  UNIT_CONVERSIONS
};
