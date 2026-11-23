// Shared layout constants for the Family Tree. The connector math is pixel-
// exact against these numbers, so if NODE_SIZE changes here it has to change
// everywhere else that touches the tree (FamilyTreeView, TreeConnector).

export const NODE_SIZE = 56;
export const NODE_SLOT_W = NODE_SIZE + 16; // 72 — avatar circle + breathing room
export const NODE_GAP = 6;
export const CORNER_R = 6;
export const CONNECTOR_HEIGHT = 28;
