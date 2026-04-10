'use client';

import { Box, Tooltip, Typography } from '@mui/material';
import { useRef, useState } from 'react';
import { SpotStatus } from '@/types';

// Shape definitions stored in Spot.svgShapeData (JSON stringified)
export interface SvgShapeData {
  type: 'rect' | 'circle' | 'polygon' | 'path' | 'ellipse';
  // rect
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rx?: number;
  ry?: number;
  // circle
  cx?: number;
  cy?: number;
  r?: number;
  // ellipse (rx/ry + cx/cy)
  // polygon
  points?: string;
  // path
  d?: string;
  // label offset (optional override)
  labelX?: number;
  labelY?: number;
}

export interface SpotMapItem {
  id: string;
  name: string;
  code: string;
  status: SpotStatus;
  isAvailable?: boolean;
  svgShapeData?: string | null;
  maxPeople?: number;
}

interface SpotMapProps {
  spots: SpotMapItem[];
  width?: number;
  height?: number;
  mapImageUrl?: string | null;
  selectedSpotIds?: string[];
  onSpotClick?: (spot: SpotMapItem) => void;
  multiSelect?: boolean;
  readOnly?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  available: '#4caf50',
  occupied: '#f44336',
  reserved: '#ff9800',
  maintenance: '#9e9e9e',
  selected: '#1565c0',
};

function getSpotColor(spot: SpotMapItem, isSelected: boolean): string {
  if (isSelected) return STATUS_COLORS.selected;
  if (spot.status === SpotStatus.MAINTENANCE || spot.status === SpotStatus.DISABLED) return STATUS_COLORS.maintenance;
  if (!spot.isAvailable || spot.status === SpotStatus.OCCUPIED) return STATUS_COLORS.occupied;
  return STATUS_COLORS.available;
}

function getLabelCenter(shape: SvgShapeData): { x: number; y: number } {
  if (shape.labelX !== undefined && shape.labelY !== undefined) {
    return { x: shape.labelX, y: shape.labelY };
  }
  switch (shape.type) {
    case 'rect':
      return {
        x: (shape.x ?? 0) + (shape.width ?? 0) / 2,
        y: (shape.y ?? 0) + (shape.height ?? 0) / 2,
      };
    case 'circle':
      return { x: shape.cx ?? 0, y: shape.cy ?? 0 };
    case 'ellipse':
      return { x: shape.cx ?? 0, y: shape.cy ?? 0 };
    default:
      return { x: 0, y: 0 };
  }
}

function SpotShape({
  shape,
  fill,
  stroke,
  strokeWidth,
}: {
  shape: SvgShapeData;
  fill: string;
  stroke: string;
  strokeWidth: number;
}) {
  const common = { fill, stroke, strokeWidth };
  switch (shape.type) {
    case 'rect':
      return (
        <rect
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          rx={shape.rx ?? 4}
          ry={shape.ry}
          {...common}
        />
      );
    case 'circle':
      return <circle cx={shape.cx} cy={shape.cy} r={shape.r} {...common} />;
    case 'ellipse':
      return (
        <ellipse cx={shape.cx} cy={shape.cy} rx={shape.rx ?? 20} ry={shape.ry ?? 15} {...common} />
      );
    case 'polygon':
      return <polygon points={shape.points} {...common} />;
    case 'path':
      return <path d={shape.d} {...common} />;
    default:
      return null;
  }
}

export default function SpotMap({
  spots,
  width = 800,
  height = 600,
  mapImageUrl,
  selectedSpotIds = [],
  onSpotClick,
  multiSelect = false,
  readOnly = false,
}: SpotMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const spotsWithShape = spots.filter((s) => s.svgShapeData);
  const spotsWithoutShape = spots.filter((s) => !s.svgShapeData);

  const handleClick = (spot: SpotMapItem) => {
    if (readOnly || !onSpotClick) return;
    if (spot.status === SpotStatus.MAINTENANCE) return;
    if (!spot.isAvailable && spot.status === SpotStatus.OCCUPIED) return;
    onSpotClick(spot);
  };

  return (
    <Box>
      <Box
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          overflow: 'hidden',
          position: 'relative',
          bgcolor: '#f0ebe3',
          cursor: readOnly ? 'default' : 'pointer',
        }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', height: 'auto', display: 'block', maxHeight: 600 }}
          aria-label="Spot map"
        >
          {/* Background image */}
          {mapImageUrl && (
            <image href={mapImageUrl} x={0} y={0} width={width} height={height} preserveAspectRatio="xMidYMid meet" />
          )}

          {/* Background tint */}
          {!mapImageUrl && (
            <rect x={0} y={0} width={width} height={height} fill="#e8e0d4" />
          )}

          {/* Spots with SVG shapes */}
          {spotsWithShape.map((spot) => {
            let shape: SvgShapeData | null = null;
            try {
              shape = JSON.parse(spot.svgShapeData!) as SvgShapeData;
            } catch {
              return null;
            }

            const isSelected = selectedSpotIds.includes(spot.id);
            const isHovered = hoveredId === spot.id;
            const fill = getSpotColor(spot, isSelected);
            const isClickable =
              !readOnly &&
              spot.isAvailable !== false &&
              spot.status !== SpotStatus.MAINTENANCE &&
              spot.status !== SpotStatus.OCCUPIED;
            const center = getLabelCenter(shape);

            return (
              <g
                key={spot.id}
                onClick={() => handleClick(spot)}
                onMouseEnter={() => setHoveredId(spot.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{ cursor: isClickable ? 'pointer' : 'not-allowed' }}
              >
                <SpotShape
                  shape={shape}
                  fill={fill}
                  stroke={isHovered || isSelected ? '#fff' : 'rgba(0,0,0,0.25)'}
                  strokeWidth={isSelected ? 3 : isHovered ? 2 : 1}
                />
                {/* Opacity overlay for hover */}
                {isHovered && (
                  <SpotShape
                    shape={shape}
                    fill="rgba(255,255,255,0.2)"
                    stroke="none"
                    strokeWidth={0}
                  />
                )}
                {/* Label */}
                {center.x > 0 && (
                  <text
                    x={center.x}
                    y={center.y + 1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    fontSize={12}
                    fontWeight={600}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {spot.code || spot.name}
                  </text>
                )}

                {/* Hover tooltip title attr for accessibility */}
                <title>{`${spot.name}${spot.maxPeople ? ` · max ${spot.maxPeople} persons` : ''} · ${
                  isSelected
                    ? 'Selected'
                    : spot.isAvailable === false || spot.status === SpotStatus.OCCUPIED
                    ? 'Unavailable'
                    : spot.status === SpotStatus.MAINTENANCE
                    ? 'Maintenance'
                    : 'Available'
                }`}</title>
              </g>
            );
          })}
        </svg>
      </Box>

      {/* Legend */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1.5 }}>
        {[
          { color: STATUS_COLORS.available, label: 'Available' },
          { color: STATUS_COLORS.reserved, label: 'Reserved' },
          { color: STATUS_COLORS.occupied, label: 'Unavailable' },
          { color: STATUS_COLORS.maintenance, label: 'Maintenance' },
          { color: STATUS_COLORS.selected, label: 'Selected' },
        ].map((item) => (
          <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Box
              sx={{
                width: 14,
                height: 14,
                borderRadius: 0.5,
                bgcolor: item.color,
                flexShrink: 0,
              }}
            />
            <Typography variant="caption" color="text.secondary">
              {item.label}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Spots without shapes (grid fallback) */}
      {spotsWithoutShape.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Spots (no map position set)
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {spotsWithoutShape.map((spot) => {
              const isSelected = selectedSpotIds.includes(spot.id);
              const color = getSpotColor(spot, isSelected);
              const isClickable =
                !readOnly &&
                spot.isAvailable !== false &&
                spot.status !== SpotStatus.MAINTENANCE &&
                spot.status !== SpotStatus.OCCUPIED;

              return (
                <Tooltip
                  key={spot.id}
                  title={`${spot.name}${spot.maxPeople ? ` · max ${spot.maxPeople}` : ''}`}
                >
                  <Box
                    onClick={() => handleClick(spot)}
                    sx={{
                      width: 52,
                      height: 52,
                      bgcolor: color,
                      borderRadius: 1.5,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: isClickable ? 'pointer' : 'not-allowed',
                      border: isSelected ? '3px solid #1565c0' : '2px solid rgba(0,0,0,0.1)',
                      transition: 'transform 0.1s, box-shadow 0.1s',
                      '&:hover': isClickable
                        ? { transform: 'scale(1.05)', boxShadow: 3 }
                        : undefined,
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ color: 'white', fontWeight: 700, lineHeight: 1.2, fontSize: '0.7rem' }}
                    >
                      {spot.code || spot.name.slice(0, 4)}
                    </Typography>
                  </Box>
                </Tooltip>
              );
            })}
          </Box>
        </Box>
      )}
    </Box>
  );
}
