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

  // Colors
  const milkColorMap: Record<string, string> = {
    'no milk': 'transparent',
    'whole milk': '#F5F5DC',
    'fresh milk': '#F5F5DC',
    'oat milk': '#F2E7C9',
    'almond milk': '#EFE6D6',
    'soy milk': '#F3EED9',
    'cream': '#FFF3D6'
  };
  const milkKey = (customizations.milk || 'no milk').toLowerCase();
  const milkColor = milkColorMap[milkKey] || (milkKey.includes('milk') ? '#F5F5DC' : 'transparent');
  const hasMilk = milkKey !== 'no milk' && milkColor !== 'transparent';
  const hasSyrup = customizations.syrup && customizations.syrup.toLowerCase() !== 'no sweetener';

  // Categorize toppings by type for proper layering
  const categorizeToppings = (toppings: string[]) => {
    const milkToppings: string[] = [];
    const syrupToppings: string[] = [];
    const powderToppings: string[] = [];
    const otherToppings: string[] = [];

    toppings.forEach(topping => {
      const lower = topping.toLowerCase();
      if (lower.includes('milk') || lower.includes('cream')) {
        milkToppings.push(topping);
      } else if (lower.includes('syrup') || lower.includes('sweetener') || lower.includes('sugar')) {
        syrupToppings.push(topping);
      } else if (lower.includes('powder') || lower.includes('cinnamon') || lower.includes('cocoa') || lower.includes('spice')) {
        powderToppings.push(topping);
      } else {
        otherToppings.push(topping);
      }
    });

    return { milkToppings, syrupToppings, powderToppings, otherToppings };
  };

  const { milkToppings, syrupToppings, powderToppings, otherToppings } = categorizeToppings(customizations.toppings || []);
  const hasAdditionalMilk = milkToppings.length > 0;
  const hasAdditionalSyrup = syrupToppings.length > 0;
  const hasPowder = powderToppings.length > 0;

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
  const actualSyrupHeight = hasManualSugar ? maxSyrupHeight * syrupIntensity : 0;
  
  // Calculate remaining space for other layers
  const remainingHeight = totalCupHeight - actualSyrupHeight;
  const otherLayers = (hasMilk ? 1 : 0) + (hasAdditionalMilk ? 1 : 0) + (hasPowder ? 1 : 0);
  const otherLayerHeight = otherLayers > 0 ? remainingHeight / (otherLayers + 1) : remainingHeight;
  
  // Layer positions from top to bottom
  let currentY = innerTopLeft.y;
  
  // Syrup layer at the top (height controlled by sugar level)
  const syrupLayerY = (hasSyrup || hasAdditionalSyrup || hasManualSugar) ? currentY : null;
  const syrupLayerBottom = syrupLayerY !== null ? syrupLayerY + actualSyrupHeight : currentY;
  if (syrupLayerY !== null) currentY = syrupLayerBottom;
  
  // Other layers below syrup
  const milkLayerY = hasMilk || hasAdditionalMilk ? currentY : null;
  if (milkLayerY !== null) currentY += otherLayerHeight;
  
  const powderLayerY = hasPowder ? currentY : null;
  if (powderLayerY !== null) currentY += otherLayerHeight;
  
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
        {customizations.size.charAt(0).toUpperCase() + customizations.size.slice(1)} Size
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

        {/* Powder layer (cinnamon, cocoa, etc.) */}
        {hasPowder && powderLayerY !== null && (
          <path
            d={trapezoidPath(powderLayerY, powderLayerY + otherLayerHeight)}
            fill="#8B4513"
            opacity={0.8}
          />
        )}

        {/* Milk layer - can be from main milk selection or additional milk toppings */}
        {(hasMilk || hasAdditionalMilk) && milkLayerY !== null && (
          <path
            d={trapezoidPath(milkLayerY, milkLayerY + otherLayerHeight)}
            fill={hasAdditionalMilk ? '#F0E68C' : milkColor}
          />
        )}

        {/* Syrup layer - can be from main sweetener, additional syrup toppings, or manual sugar level */}
        {(hasSyrup || hasAdditionalSyrup || hasManualSugar) && syrupLayerY !== null && (
          <path
            d={trapezoidPath(syrupLayerY, syrupLayerBottom)}
            fill="#C07A3A"
            opacity={0.9}
          />
        )}

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

        {/* Other toppings as small decorative elements on top layer */}
        {otherToppings.length > 0 && (
          <g>
            {otherToppings.slice(0, 3).map((_, idx) => (
              <circle
                key={`other-${idx}`}
                cx={outerTopLeft.x + 30 + (idx % 3) * 25}
                cy={innerTopLeft.y + 15 - (idx % 2) * 8}
                r={3}
                fill="#D2691E"
                stroke="#8B4513"
                strokeWidth={1}
                opacity={0.7}
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