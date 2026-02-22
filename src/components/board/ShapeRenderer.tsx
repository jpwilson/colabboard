'use client'

import { memo } from 'react'
import { Rect, Circle, Ellipse, RegularPolygon, Star, Arrow, Line, Group, Text, Image as KonvaImage } from 'react-konva'
import useImage from 'use-image'
import type Konva from 'konva'
import type { CanvasObject } from '@/lib/board-sync'
import { getContrastTextColor } from '@/lib/shape-defaults'
import getStroke from 'perfect-freehand'

/** Convert flat [x1,y1,x2,y2,...] to outline polygon via perfect-freehand */
function getFreedrawOutline(
  flatPoints: number[],
  strokeWidth: number,
): number[] {
  const inputPoints: [number, number][] = []
  for (let i = 0; i < flatPoints.length; i += 2) {
    inputPoints.push([flatPoints[i], flatPoints[i + 1]])
  }
  const outline = getStroke(inputPoints, {
    size: strokeWidth * 2.5,
    thinning: 0.5,
    smoothing: 0.5,
    streamline: 0.5,
    start: { taper: true },
    end: { taper: true },
  })
  return outline.flat()
}

/** Separate component for image rendering — hooks can't be called inside switch */
const ImageShape = memo(function ImageShape({
  obj,
  groupProps,
}: {
  obj: CanvasObject
  groupProps: Record<string, unknown>
}) {
  const [image, status] = useImage(obj.imageUrl || '', 'anonymous')
  return (
    <Group {...groupProps}>
      {status === 'loaded' && image ? (
        <KonvaImage
          image={image}
          width={obj.width}
          height={obj.height}
          opacity={obj.opacity ?? 1}
        />
      ) : (
        <>
          <Rect
            width={obj.width}
            height={obj.height}
            fill="#f8fafc"
            stroke="#e2e8f0"
            strokeWidth={1}
            cornerRadius={4}
          />
          <Text
            x={0}
            y={obj.height / 2 - 8}
            width={obj.width}
            text={status === 'loading' ? 'Loading...' : 'Image'}
            fontSize={12}
            fill="#94a3b8"
            align="center"
          />
        </>
      )}
    </Group>
  )
})

interface ShapeRendererProps {
  obj: CanvasObject
  isEditing: boolean
  onSelect: (id: string, e?: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void
  onDoubleClick: (id: string) => void
  onDragStart?: (id: string) => void
  onDragMove?: (id: string, x: number, y: number) => void
  onDragEnd: (id: string, x: number, y: number) => void
  onTransformEnd: (id: string, node: Konva.Node) => void
}

export const ShapeRenderer = memo(function ShapeRenderer({
  obj,
  isEditing,
  onSelect,
  onDoubleClick,
  onDragStart,
  onDragMove,
  onDragEnd,
  onTransformEnd,
}: ShapeRendererProps) {
  const commonGroupProps = {
    id: obj.id,
    x: obj.x,
    y: obj.y,
    width: obj.width,
    height: obj.height,
    rotation: obj.rotation ?? 0,
    draggable: obj.type !== 'connector',
    onClick: (e: Konva.KonvaEventObject<MouseEvent>) => onSelect(obj.id, e),
    onTap: (e: Konva.KonvaEventObject<TouchEvent>) => onSelect(obj.id, e),
    onDragStart: () => onDragStart?.(obj.id),
    onDragMove: (e: Konva.KonvaEventObject<DragEvent>) =>
      onDragMove?.(obj.id, e.target.x(), e.target.y()),
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) =>
      onDragEnd(obj.id, e.target.x(), e.target.y()),
    onTransformEnd: (e: Konva.KonvaEventObject<Event>) =>
      onTransformEnd(obj.id, e.target),
  }

  const fill = obj.fill
  const stroke = obj.stroke ?? 'transparent'
  const strokeWidth = obj.strokeWidth ?? 0
  const opacity = obj.opacity ?? 1

  switch (obj.type) {
    case 'sticky_note':
      return (
        <Group
          {...commonGroupProps}
          onDblClick={() => onDoubleClick(obj.id)}
          onDblTap={() => onDoubleClick(obj.id)}
        >
          <Rect
            width={obj.width}
            height={obj.height}
            fill={fill}
            opacity={opacity}
            shadowColor="rgba(0,0,0,0.1)"
            shadowBlur={8}
            shadowOffsetY={2}
            cornerRadius={4}
          />
          {!isEditing && (
            <Text
              id={`text-${obj.id}`}
              x={10}
              y={10}
              width={obj.width - 20}
              height={obj.height - 20}
              text={obj.text || ''}
              fontSize={14}
              fontFamily={obj.fontFamily || 'sans-serif'}
              fill={getContrastTextColor(fill || '#EAB308')}
              lineHeight={1.4}
            />
          )}
        </Group>
      )

    case 'rectangle':
      return (
        <Rect
          {...commonGroupProps}
          fill={fill}
          stroke={stroke || '#94a3b8'}
          strokeWidth={strokeWidth || 1}
          opacity={opacity}
          cornerRadius={4}
        />
      )

    case 'rounded_rectangle':
      return (
        <Rect
          {...commonGroupProps}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          opacity={opacity}
          cornerRadius={12}
        />
      )

    case 'circle':
      return (
        <Group {...commonGroupProps}>
          <Circle
            x={obj.width / 2}
            y={obj.height / 2}
            radius={Math.min(obj.width, obj.height) / 2}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            opacity={opacity}
          />
        </Group>
      )

    case 'ellipse':
      return (
        <Group {...commonGroupProps}>
          <Ellipse
            x={obj.width / 2}
            y={obj.height / 2}
            radiusX={obj.width / 2}
            radiusY={obj.height / 2}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            opacity={opacity}
          />
        </Group>
      )

    case 'triangle':
      return (
        <Group {...commonGroupProps}>
          <RegularPolygon
            x={obj.width / 2}
            y={obj.height / 2}
            sides={3}
            radius={obj.height / 2}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            opacity={opacity}
          />
        </Group>
      )

    case 'diamond':
      return (
        <Group {...commonGroupProps}>
          <Line
            points={[
              obj.width / 2, 0,
              obj.width, obj.height / 2,
              obj.width / 2, obj.height,
              0, obj.height / 2,
            ]}
            closed
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            opacity={opacity}
          />
        </Group>
      )

    case 'star':
      return (
        <Group {...commonGroupProps}>
          <Star
            x={obj.width / 2}
            y={obj.height / 2}
            numPoints={5}
            innerRadius={Math.min(obj.width, obj.height) * 0.2}
            outerRadius={Math.min(obj.width, obj.height) / 2}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            opacity={opacity}
          />
        </Group>
      )

    case 'hexagon':
      return (
        <Group {...commonGroupProps}>
          <RegularPolygon
            x={obj.width / 2}
            y={obj.height / 2}
            sides={6}
            radius={Math.min(obj.width, obj.height) / 2}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            opacity={opacity}
          />
        </Group>
      )

    case 'pentagon':
      return (
        <Group {...commonGroupProps}>
          <RegularPolygon
            x={obj.width / 2}
            y={obj.height / 2}
            sides={5}
            radius={Math.min(obj.width, obj.height) / 2}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            opacity={opacity}
          />
        </Group>
      )

    case 'arrow':
      return (
        <Group {...commonGroupProps}>
          <Arrow
            points={[0, obj.height / 2, obj.width, obj.height / 2]}
            pointerLength={10}
            pointerWidth={10}
            fill={stroke || fill}
            stroke={stroke || fill}
            strokeWidth={strokeWidth || 2}
            opacity={opacity}
          />
        </Group>
      )

    case 'line':
      return (
        <Group {...commonGroupProps}>
          <Line
            points={[0, 0, obj.width, obj.height]}
            stroke={stroke || '#1f2937'}
            strokeWidth={strokeWidth || 2}
            opacity={opacity}
            hitStrokeWidth={16}
          />
        </Group>
      )

    case 'freedraw': {
      const rawPts = obj.points || []
      const sw = strokeWidth || 3
      const outlinePoints = rawPts.length >= 4 ? getFreedrawOutline(rawPts, sw) : rawPts
      return (
        <Group {...commonGroupProps}>
          {/* Invisible rect for hit detection */}
          <Rect
            width={obj.width}
            height={obj.height}
            fill="transparent"
            listening={true}
          />
          <Line
            points={outlinePoints}
            fill={stroke || '#1f2937'}
            closed={true}
            opacity={opacity}
            listening={false}
          />
        </Group>
      )
    }

    case 'text':
      return (
        <Group
          {...commonGroupProps}
          onDblClick={() => onDoubleClick(obj.id)}
          onDblTap={() => onDoubleClick(obj.id)}
        >
          {/* Invisible hit rect for draggability */}
          <Rect
            width={obj.width}
            height={obj.height}
            fill="transparent"
            listening={true}
          />
          <Text
            id={`text-${obj.id}`}
            width={obj.width}
            height={obj.height}
            text={isEditing ? '' : (obj.text || '')}
            fontSize={obj.fontSize || 18}
            fontFamily={obj.fontFamily || 'sans-serif'}
            fill={fill || '#1f2937'}
            opacity={opacity}
            lineHeight={1.4}
          />
        </Group>
      )

    case 'connector': {
      const style = obj.connectorStyle || 'arrow-end'
      const pts = obj.points || []
      const commonConnectorProps = {
        id: obj.id,
        stroke: stroke || '#1f2937',
        strokeWidth: strokeWidth || 2,
        opacity,
        hitStrokeWidth: 12,
        onClick: (e: Konva.KonvaEventObject<MouseEvent>) => onSelect(obj.id, e),
        onTap: (e: Konva.KonvaEventObject<TouchEvent>) => onSelect(obj.id, e),
      }

      if (style === 'none') {
        return <Line points={pts} {...commonConnectorProps} />
      }

      // For arrow styles, reverse points for start-only arrow
      const renderPts = style === 'arrow-start' ? [pts[2], pts[3], pts[0], pts[1]] : pts
      const pointerProps = { pointerLength: 10, pointerWidth: 10, fill: stroke || '#1f2937' }

      if (style === 'arrow-both') {
        // Render two arrows (one each direction) for bidirectional
        return (
          <Group>
            <Arrow points={pts} {...commonConnectorProps} {...pointerProps} />
            <Arrow
              points={[pts[2], pts[3], pts[0], pts[1]]}
              {...commonConnectorProps}
              {...pointerProps}
              id={undefined}
            />
          </Group>
        )
      }

      return <Arrow points={renderPts} {...commonConnectorProps} {...pointerProps} />
    }

    case 'image':
      return <ImageShape obj={obj} groupProps={commonGroupProps} />

    case 'model3d':
      return (
        <Group {...commonGroupProps}>
          <Rect
            width={obj.width}
            height={obj.height}
            fill="#f1f5f9"
            stroke="#94a3b8"
            strokeWidth={1}
            cornerRadius={4}
            opacity={opacity}
          />
          <Text
            x={0}
            y={obj.height / 2 - 16}
            width={obj.width}
            text="3D"
            fontSize={24}
            fontStyle="bold"
            fill="#94a3b8"
            align="center"
          />
          <Text
            x={0}
            y={obj.height / 2 + 8}
            width={obj.width}
            text="Double-click to interact"
            fontSize={10}
            fill="#cbd5e1"
            align="center"
          />
        </Group>
      )

    default:
      return (
        <Rect
          {...commonGroupProps}
          fill={fill}
          stroke={stroke || '#94a3b8'}
          strokeWidth={strokeWidth || 1}
          opacity={opacity}
          cornerRadius={4}
        />
      )
  }
})
