// Family tree connector between two adjacent rows. Draws a trunk from the
// parent anchor down to a horizontal bus, then drops to each active child.
// The rounded elbows are quadratic Beziers — strokeLinejoin:"round" alone
// doesn't visibly round thin strokes, so the curves are drawn manually.

import {
  CONNECTOR_HEIGHT,
  CORNER_R,
  NODE_GAP,
  NODE_SLOT_W,
} from "./treeConstants";

const STROKE = "#232323";
const STROKE_OPACITY = 0.35;
const STROKE_WIDTH = 1.5;

type Props = {
  parentCount: number;
  childCount: number;
  // Fractional allowed — e.g. 1.5 to anchor between index 1 and 2.
  parentAnchorIndex?: number;
  // When provided, only these child indexes get a drop from the bus. The
  // row still reserves full width for every child; the omitted ones just
  // aren't connected (used for Row 2→3 where nieces/nephews share the row
  // but belong to a sibling's branch).
  connectableChildIndexes?: number[] | null;
  height?: number;
};

const nodeCenterX = (i: number) =>
  i * (NODE_SLOT_W + NODE_GAP) + NODE_SLOT_W / 2;
const rowWidth = (n: number) =>
  n > 0 ? n * NODE_SLOT_W + (n - 1) * NODE_GAP : 0;

export default function TreeConnector({
  parentCount,
  childCount,
  parentAnchorIndex,
  connectableChildIndexes = null,
  height = CONNECTOR_HEIGHT,
}: Props) {
  if (!parentCount || !childCount) return null;

  const parentRowW = rowWidth(parentCount);
  const childRowW = rowWidth(childCount);
  const svgWidth = Math.max(parentRowW, childRowW);

  const parentOffset = (svgWidth - parentRowW) / 2;
  const childOffset = (svgWidth - childRowW) / 2;

  const anchorI = parentAnchorIndex ?? (parentCount - 1) / 2;
  const trunkX =
    parentOffset +
    Math.floor(anchorI) * (NODE_SLOT_W + NODE_GAP) +
    NODE_SLOT_W / 2 +
    (anchorI - Math.floor(anchorI)) * (NODE_SLOT_W + NODE_GAP);

  const busY = height / 2;
  const trunkTopY = 0;
  const dropBottomY = height;
  const R = CORNER_R;

  const allChildCenters = Array.from(
    { length: childCount },
    (_, i) => childOffset + nodeCenterX(i),
  );

  const activeIndexes =
    connectableChildIndexes && connectableChildIndexes.length > 0
      ? connectableChildIndexes.filter((i) => i >= 0 && i < childCount)
      : allChildCenters.map((_, i) => i);

  const childCenters = activeIndexes.map((i) => allChildCenters[i]);
  if (childCenters.length === 0) return null;

  const leftmost = Math.min(...childCenters);
  const rightmost = Math.max(...childCenters);

  const paths: string[] = [];

  if (childCount === 1 && activeIndexes.length === 1) {
    const cx = childCenters[0];
    if (Math.abs(cx - trunkX) < 0.5) {
      paths.push(`M ${trunkX} ${trunkTopY} L ${trunkX} ${dropBottomY}`);
    } else {
      const dir = (cx > trunkX ? 1 : -1) as 1 | -1;
      paths.push(
        `M ${trunkX} ${trunkTopY} L ${trunkX} ${busY - R} ` +
          `Q ${trunkX} ${busY} ${trunkX + dir * R} ${busY} ` +
          `L ${cx - dir * R} ${busY} ` +
          `Q ${cx} ${busY} ${cx} ${busY + R} ` +
          `L ${cx} ${dropBottomY}`,
      );
    }
  } else {
    // Trunk down to bus.
    paths.push(`M ${trunkX} ${trunkTopY} L ${trunkX} ${busY}`);

    // Left arm.
    if (leftmost < trunkX) {
      paths.push(
        `M ${trunkX} ${busY} L ${leftmost + R} ${busY} ` +
          `Q ${leftmost} ${busY} ${leftmost} ${busY + R} ` +
          `L ${leftmost} ${dropBottomY}`,
      );
    } else {
      paths.push(`M ${leftmost} ${busY} L ${leftmost} ${dropBottomY}`);
    }

    // Right arm.
    if (rightmost > trunkX) {
      paths.push(
        `M ${trunkX} ${busY} L ${rightmost - R} ${busY} ` +
          `Q ${rightmost} ${busY} ${rightmost} ${busY + R} ` +
          `L ${rightmost} ${dropBottomY}`,
      );
    } else if (rightmost !== leftmost) {
      paths.push(`M ${rightmost} ${busY} L ${rightmost} ${dropBottomY}`);
    }

    // Middle drops — bus already passes over them, so just straight verticals.
    childCenters.forEach((cx) => {
      if (cx === leftmost || cx === rightmost) return;
      paths.push(`M ${cx} ${busY} L ${cx} ${dropBottomY}`);
    });
  }

  return (
    <div
      style={{
        width: svgWidth,
        height,
        alignSelf: "center",
        pointerEvents: "none",
      }}
    >
      <svg width={svgWidth} height={height}>
        {paths.map((d, i) => (
          <path
            key={i}
            d={d}
            stroke={STROKE}
            strokeOpacity={STROKE_OPACITY}
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        ))}
      </svg>
    </div>
  );
}
