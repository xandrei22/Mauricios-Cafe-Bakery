import React, { useMemo } from 'react';

interface LayeredCupVisualizationProps {
  customizations: {
    base: string;
    milk: string;
    syrup: string;
    toppings: string[];
    ice: boolean;
    size: 'medium' | 'large';
    sugarLevel?: number; // Manual sugar level control
  };
  className?: string;
}

const LayeredCupVisualization: React.FC<LayeredCupVisualizationProps> = ({ customizations, className = '' }) => {
  // Determine cup size based on selected size
  const baseHeight = customizations.size === 'large' ? 500 : 300; // Much bigger height difference
  const baseWidth = baseHeight * 1.1; // Slightly reduced cup width

  const borderWidth = 8; // Thicker walls to match reference

  // Generate a unique color for any ingredient name
  const getIngredientColor = (ingredientName: string): string => {
    if (!ingredientName || ingredientName.toLowerCase() === 'no milk' || ingredientName.toLowerCase() === 'no sweetener') {
      return 'transparent';
    }

    const name = ingredientName.toLowerCase().trim();
    
    // Comprehensive color map for common ingredients
    const colorMap: Record<string, string> = {
      // Milks
      'whole milk': '#F5F5DC',
      'fresh milk': '#F5F5DC',
      'full cream milk': '#F8F8E8',
      'oat milk': '#F2E7C9',
      'almond milk': '#EFE6D6',
      'soy milk': '#F3EED9',
      'coconut milk': '#FFF8E1',
      'coconut cream': '#FFE5B4',
      'cream': '#FFF3D6',
      'heavy cream': '#FFF8DC',
      'whipped cream': '#FFFEF0',
      
      // Sweeteners/Syrups
      'sugar': '#FFE4B5',
      'brown sugar': '#D2B48C',
      'coconut sugar': '#D4A574',
      'honey': '#FFD700',
      'maple syrup': '#D2691E',
      'agave': '#F0E68C',
      'stevia': '#E6E6FA',
      'monk fruit': '#F5DEB3',
      'erythritol': '#FFFACD',
      'xylitol': '#F0F8FF',
      'vanilla syrup': '#FFE4E1',
      'caramel syrup': '#DEB887',
      'chocolate syrup': '#8B4513',
      'hazelnut syrup': '#CD853F',
      'toffee syrup': '#D2B48C',
      
      // Powders/Spices
      'cinnamon': '#CD853F',
      'cinnamon powder': '#CD853F',
      'cocoa powder': '#6B4423',
      'chocolate powder': '#654321',
      'matcha powder': '#90EE90',
      'vanilla powder': '#F5DEB3',
      'nutmeg': '#D2691E',
      'cardamom': '#DAA520',
      'ginger powder': '#FF8C00',
      'turmeric': '#FFD700',
      
      // Other toppings
      'chocolate chips': '#654321',
      'caramel drizzle': '#DEB887',
      'whipped topping': '#FFFEF0',
      'sprinkles': '#FF69B4',
      'nuts': '#8B4513',
      'almonds': '#D2B48C',
      'hazelnuts': '#CD853F',
      'walnuts': '#8B6F47',
    };

    // Check exact match first
    if (colorMap[name]) {
      return colorMap[name];
    }

    // Check partial matches for variations
    for (const [key, color] of Object.entries(colorMap)) {
      if (name.includes(key) || key.includes(name)) {
        return color;
      }
    }

    // Generate a consistent color based on ingredient name hash
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Generate colors in warm, drink-appropriate palette
    const hue = Math.abs(hash) % 60; // 0-60 (warm colors: yellows, oranges, browns)
    const saturation = 40 + (Math.abs(hash >> 8) % 30); // 40-70%
    const lightness = 60 + (Math.abs(hash >> 16) % 25); // 60-85% (light colors for visibility)
    
    return `hsl(${hue + 20}, ${saturation}%, ${lightness}%)`;
  };

  const milkKey = (customizations.milk || 'no milk').toLowerCase();
  const milkColor = getIngredientColor(customizations.milk || '');
  const hasMilk = milkKey !== 'no milk' && milkColor !== 'transparent';
  
  const syrupKey = (customizations.syrup || '').toLowerCase();
  const syrupColor = getIngredientColor(customizations.syrup || '');
  const hasSyrup = syrupKey !== 'no sweetener' && syrupColor !== 'transparent';

  // Process all toppings individually with their own colors
  const processedToppings = (customizations.toppings || []).map(topping => ({
    name: topping,
    color: getIngredientColor(topping),
    category: (() => {
      const lower = topping.toLowerCase();
      if (lower.includes('milk') || lower.includes('cream')) return 'milk';
      if (lower.includes('syrup') || lower.includes('sweetener') || lower.includes('sugar') || lower.includes('honey') || lower.includes('agave')) return 'syrup';
      if (lower.includes('powder') || lower.includes('cinnamon') || lower.includes('cocoa') || lower.includes('spice') || lower.includes('matcha')) return 'powder';
      return 'other';
    })()
  })).filter(t => t.color !== 'transparent');

  const milkToppings = processedToppings.filter(t => t.category === 'milk');
  const syrupToppings = processedToppings.filter(t => t.category === 'syrup');
  const powderToppings = processedToppings.filter(t => t.category === 'powder');
  const otherToppings = processedToppings.filter(t => t.category === 'other');
  
  const hasAdditionalMilk = milkToppings.length > 0;
  const hasAdditionalSyrup = syrupToppings.length > 0;
  const hasPowder = powderToppings.length > 0;
  const hasOther = otherToppings.length > 0;

  // Layout geometry
  const outerTopLeft = { x: baseWidth * 0.15, y: baseHeight * 0.15 };
  const outerTopRight = { x: baseWidth * 0.85, y: baseHeight * 0.15 };
  const outerBottomRight = { x: baseWidth * 0.75, y: baseHeight };
  const outerBottomLeft = { x: baseWidth * 0.25, y: baseHeight };

  const innerTopLeft = { x: outerTopLeft.x + borderWidth, y: outerTopLeft.y + borderWidth };
  const innerTopRight = { x: outerTopRight.x - borderWidth, y: outerTopRight.y + borderWidth };
  const innerBottomRight = { x: outerBottomRight.x - borderWidth, y: outerBottomRight.y - borderWidth };
  const innerBottomLeft = { x: outerBottomLeft.x + borderWidth, y: outerBottomLeft.y - borderWidth };

  // Helpers to get inner edge X at any Y (to keep liquid conforming to cup shape)
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const edgeXLeft = (y: number) => {
    const t = (y - innerTopLeft.y) / (innerBottomLeft.y - innerTopLeft.y);
    return lerp(innerTopLeft.x, innerBottomLeft.x, Math.min(Math.max(t, 0), 1));
  };
  const edgeXRight = (y: number) => {
    const t = (y - innerTopRight.y) / (innerBottomRight.y - innerTopRight.y);
    return lerp(innerTopRight.x, innerBottomRight.x, Math.min(Math.max(t, 0), 1));
  };

  // Calculate layer positions based on all ingredients and sugar level
  const sugarLevel = customizations.sugarLevel || 0;
  const hasManualSugar = sugarLevel > 0;
  
  // Calculate syrup layer height based on sugar level (0-100% controls height)
  const syrupIntensity = Math.max(0, Math.min(1, sugarLevel / 100));
  const totalCupHeight = innerBottomLeft.y - innerTopLeft.y;
  const maxSyrupHeight = totalCupHeight * 0.4; // Maximum 40% of cup height
  
  // Determine if we have any syrup (from sweetener dropdown or toppings)
  const hasAnySyrup = hasSyrup || hasAdditionalSyrup;
  
  // If manual sugar level is set, use it; otherwise use fixed height for syrups
  const actualSyrupHeight = hasManualSugar 
    ? maxSyrupHeight * syrupIntensity 
    : (hasAnySyrup ? maxSyrupHeight * 0.3 : 0); // Default 30% height for syrups
  
  // Calculate remaining space for other layers
  const remainingHeight = totalCupHeight - actualSyrupHeight;
  
  // Count all individual layers
  const totalLayers = 
    (hasMilk ? 1 : 0) + 
    milkToppings.length + 
    powderToppings.length + 
    otherToppings.length;
  
  const individualLayerHeight = totalLayers > 0 ? remainingHeight / (totalLayers + 1) : remainingHeight;
  
  // Layer positions from top to bottom - each ingredient gets its own layer
  let currentY = innerTopLeft.y;
  
  // Syrup layers at the top (height controlled by sugar level)
  const syrupLayers: Array<{y: number, height: number, color: string, name: string}> = [];
  if (hasSyrup || hasAdditionalSyrup || hasManualSugar) {
    const syrupLayerCount = (hasSyrup ? 1 : 0) + syrupToppings.length;
    const syrupLayerHeight = syrupLayerCount > 0 ? actualSyrupHeight / syrupLayerCount : actualSyrupHeight;
    
    // Add main sweetener layer if selected
    if (hasSyrup) {
      syrupLayers.push({ y: currentY, height: syrupLayerHeight, color: syrupColor, name: customizations.syrup || 'Sweetener' });
      currentY += syrupLayerHeight;
    }
    
    // Add syrup topping layers
    syrupToppings.forEach(topping => {
      syrupLayers.push({ y: currentY, height: syrupLayerHeight, color: topping.color, name: topping.name });
      currentY += syrupLayerHeight;
    });
    
    // If manual sugar level is set but no syrups, show a generic sugar layer
    if (hasManualSugar && !hasSyrup && syrupToppings.length === 0) {
      syrupLayers.push({ y: currentY, height: actualSyrupHeight, color: getIngredientColor('sugar'), name: 'Sugar' });
      currentY += actualSyrupHeight;
    }
  }
  
  // Milk layers
  const milkLayers: Array<{y: number, height: number, color: string, name: string}> = [];
  if (hasMilk) {
    milkLayers.push({ y: currentY, height: individualLayerHeight, color: milkColor, name: customizations.milk || 'Milk' });
    currentY += individualLayerHeight;
  }
  
  milkToppings.forEach(topping => {
    milkLayers.push({ y: currentY, height: individualLayerHeight, color: topping.color, name: topping.name });
    currentY += individualLayerHeight;
  });
  
  // Powder layers
  const powderLayers: Array<{y: number, height: number, color: string, name: string}> = [];
  powderToppings.forEach(topping => {
    powderLayers.push({ y: currentY, height: individualLayerHeight, color: topping.color, name: topping.name });
    currentY += individualLayerHeight;
  });
  
  // Other topping layers
  const otherLayers: Array<{y: number, height: number, color: string, name: string}> = [];
  otherToppings.forEach(topping => {
    otherLayers.push({ y: currentY, height: individualLayerHeight, color: topping.color, name: topping.name });
    currentY += individualLayerHeight;
  });
  
  const coffeeTopY = currentY;

  // Build a trapezoid path between yTop and yBottom constrained by inner edges
  const trapezoidPath = (yTop: number, yBottom: number) => {
    const topLeftX = edgeXLeft(yTop);
    const topRightX = edgeXRight(yTop);
    const botRightX = edgeXRight(yBottom);
    const botLeftX = edgeXLeft(yBottom);
    return `M ${topLeftX} ${yTop}
            L ${topRightX} ${yTop}
            L ${botRightX} ${yBottom}
            L ${botLeftX} ${yBottom}
            Z`;
  };

  // Lid geometry based on cup top
  const cupTopY = outerTopLeft.y;
  const cupTopLeftX = outerTopLeft.x;
  const cupTopRightX = outerTopRight.x;
  const cupTopWidth = cupTopRightX - cupTopLeftX;
  const lidHeight = baseHeight * 0.12;
  const lidOverhang = cupTopWidth * 0.08; // Slightly increased overhang for wider lid
  const lidX = cupTopLeftX - lidOverhang;
  const lidY = cupTopY - lidHeight; // sit on top of the cup
  const lidWidth = cupTopWidth + lidOverhang * 2;

  // Generate scattered, variably sized ice cubes (stable per size)
  const iceCubes = useMemo(() => {
    if (!customizations.ice) return [] as { x: number; y: number; s: number }[];
    const rng = (seed: number) => () => {
      // Simple LCG for stable pseudo-random values
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    const seedBase = customizations.size === 'large' ? 12345 : 6789;
    const rand = rng(seedBase);

    const count = customizations.size === 'large' ? 16 : 11;
    const minS = Math.max(10, Math.floor(baseHeight * 0.022));
    const maxS = Math.max(minS + 2, Math.floor(baseHeight * 0.045));
    const topPad = Math.max(8, baseHeight * 0.04);
    const sidePad = Math.max(6, baseHeight * 0.035);
    const bottomPad = Math.max(20, baseHeight * 0.08);

    const cubes: { x: number; y: number; s: number }[] = [];
    for (let i = 0; i < count; i++) {
      // Random y within inner cup bounds
      const yRangeTop = innerTopLeft.y + topPad;
      const yRangeBottom = innerBottomLeft.y - bottomPad;
      const y = yRangeTop + (yRangeBottom - yRangeTop) * rand();

      // Cup narrows with y, compute available width
      const leftX = edgeXLeft(y) + sidePad;
      const rightX = edgeXRight(y) - sidePad;
      const s = minS + (maxS - minS) * rand();
      const maxX = Math.max(leftX, rightX - s);
      const minX = leftX;
      const x = minX + (maxX - minX) * rand();

      cubes.push({ x, y, s });
    }
    return cubes;
  }, [customizations.ice, customizations.size, baseHeight, innerTopLeft.y, innerBottomLeft.y]);

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="text-sm font-medium text-gray-600 mb-2">
        {customizations.size === 'large' ? 'Large' : 'Regular'} Size
      </div>
      <svg viewBox={`0 0 ${baseWidth} ${baseHeight + 20}`} className="w-full h-full drop-shadow-lg" preserveAspectRatio="xMidYMid meet">
        {/* Main cup outline with thick walls - transparent fill */}
        <path
          d={`M ${outerTopLeft.x} ${outerTopLeft.y} L ${outerTopRight.x} ${outerTopRight.y} L ${outerBottomRight.x} ${outerBottomRight.y} L ${outerBottomLeft.x} ${outerBottomLeft.y} Z`}
          fill="none"
          stroke="#000"
          strokeWidth={borderWidth}
        />


        {/* Coffee layer - bottom portion */}
        <path
          d={trapezoidPath(coffeeTopY, innerBottomLeft.y)}
          fill="#4A2C2A"
        />

        {/* Individual powder layers - each with unique color */}
        {powderLayers.map((layer, idx) => (
          <path
            key={`powder-${idx}-${layer.name}`}
            d={trapezoidPath(layer.y, layer.y + layer.height)}
            fill={layer.color}
            opacity={0.85}
          />
        ))}

        {/* Individual milk layers - each with unique color */}
        {milkLayers.map((layer, idx) => (
          <path
            key={`milk-${idx}-${layer.name}`}
            d={trapezoidPath(layer.y, layer.y + layer.height)}
            fill={layer.color}
            opacity={0.9}
          />
        ))}

        {/* Individual syrup layers - each with unique color */}
        {syrupLayers.map((layer, idx) => (
          <path
            key={`syrup-${idx}-${layer.name}`}
            d={trapezoidPath(layer.y, layer.y + layer.height)}
            fill={layer.color}
            opacity={0.9}
          />
        ))}

        {/* Individual other topping layers - each with unique color */}
        {otherLayers.map((layer, idx) => (
          <path
            key={`other-${idx}-${layer.name}`}
            d={trapezoidPath(layer.y, layer.y + layer.height)}
            fill={layer.color}
            opacity={0.8}
          />
        ))}

        {/* Ice cubes for iced drinks */}
        {customizations.ice && (
          <g opacity={0.35}>
            {iceCubes.map((c, idx) => (
              <rect
                key={`ice-${idx}`}
                x={c.x}
                y={c.y}
                width={c.s}
                height={c.s}
                rx={3}
                ry={3}
                fill="#FFFFFF"
                stroke="#BBD7FF"
              />
            ))}
          </g>
        )}

        {/* Other toppings as decorative elements on top layer - using their actual colors */}
        {otherToppings.length > 0 && (
          <g>
            {otherToppings.slice(0, 5).map((topping, idx) => (
              <circle
                key={`other-decor-${idx}-${topping.name}`}
                cx={outerTopLeft.x + 30 + (idx % 3) * 25}
                cy={innerTopLeft.y + 15 - (idx % 2) * 8}
                r={4}
                fill={topping.color}
                stroke={topping.color}
                strokeWidth={1}
                opacity={0.8}
              />
            ))}
          </g>
        )}

        {/* Bottom line */}
        <line x1={outerBottomLeft.x} y1={outerBottomLeft.y} x2={outerBottomRight.x} y2={outerBottomRight.y} stroke="#000" strokeWidth={2} />

        {/* Lid shadow underhang to blend with cup */}
        <ellipse
          cx={(cupTopLeftX + cupTopRightX) / 2}
          cy={cupTopY + 2}
          rx={(cupTopWidth / 2) * 1.02}
          ry={4}
          fill="#000"
          opacity={0.15}
        />

        {/* Cup lid - capsule shape aligned to cup with overhang */}
        <rect
          x={lidX}
          y={lidY}
          width={lidWidth}
          height={lidHeight}
          rx={lidHeight / 2}
          ry={lidHeight / 2}
          fill="#2D1B1A"
        />

        {/* Lid glossy highlight */}
        <rect
          x={lidX + lidWidth * 0.06}
          y={lidY + lidHeight * 0.08}
          width={lidWidth * 0.88}
          height={lidHeight * 0.18}
          rx={lidHeight * 0.12}
          ry={lidHeight * 0.12}
          fill="#FFFFFF"
          opacity={0.08}
        />

        {/* Lid bottom rim to match reference */}
        <rect
          x={cupTopLeftX - lidOverhang * 0.1}
          y={cupTopY - 1}
          width={cupTopWidth + lidOverhang * 0.2}
          height={3}
          rx={1.5}
          ry={1.5}
          fill="#1f1211"
        />
      </svg>
    </div>
  );
};

export default LayeredCupVisualization; 