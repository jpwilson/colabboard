'use client'

import { memo } from 'react'
import { Rect, Circle, Ellipse, RegularPolygon, Star, Arrow, Line, Group, Text } from 'react-konva'
import type Konva from 'konva'
import type { CanvasObject } from '@/lib/board-sync'

interface ShapeRendererProps {
  obj: CanvasObject
  isEditing: boolean
  onSelect: (id: string) => void
  onDoubleClick: (id: string) => void
  onDragEnd: (id: string, x: number, y: number) => void
  onTransformEnd: (id: string, node: Konva.Node) => void
}

export const ShapeRenderer = memo(function ShapeRenderer({
  obj,
  isEditing,
  onSelect,
  onDoubleClick,
  onDragEnd,
  onTransformEnd,
}: ShapeRendererProps) {
  const commonGroupProps = {
    id: obj.id,
    x: obj.x,
    y: obj.y,
    width: obj.width,
    height: obj.height,
    draggable: true,
    onClick: () => onSelect(obj.id),
    onTap: () => onSelect(obj.id),
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
              fill="#1f2937"
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
          />
        </Group>
      )

    case 'freedraw':
      return (
        <Group {...commonGroupProps}>
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
