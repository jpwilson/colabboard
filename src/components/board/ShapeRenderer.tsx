'use client'

import { memo } from 'react'
import { Rect, Circle, Ellipse, RegularPolygon, Star, Arrow, Line, Group, Text } from 'react-konva'
import type Konva from 'konva'
import type { CanvasObject } from '@/lib/board-sync'
import { getContrastTextColor } from '@/lib/shape-defaults'

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

    case 'freedraw':
      return (
        <Group {...commonGroupProps}>
          {/* Invisible rect for hit detection — Line alone has a tiny hit area */}
          <Rect
            width={obj.width}
            height={obj.height}
            fill="transparent"
            listening={true}
          />
          <Line
            points={obj.points || []}
            stroke={stroke || '#1f2937'}
            strokeWidth={strokeWidth || 3}
            tension={0.5}
            lineCap="round"
            lineJoin="round"
            opacity={opacity}
          />
        </Group>
      )

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
