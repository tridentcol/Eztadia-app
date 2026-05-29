'use client'

import { useMemo } from 'react'
import { scaleLinear } from '@visx/scale'
import { LinePath } from '@visx/shape'
import { Group } from '@visx/group'
import { curveMonotoneX } from '@visx/curve'
import { ParentSize } from '@visx/responsive'
import type { ChartPoint } from '@/lib/copilot/render/answer-ast'

const HEIGHT = 60
const MARGIN = { top: 6, right: 4, bottom: 6, left: 4 }

function Inner({ width, points }: { width: number; points: ChartPoint[] }) {
  const xMax = width - MARGIN.left - MARGIN.right
  const yMax = HEIGHT - MARGIN.top - MARGIN.bottom

  const xScale = useMemo(
    () => scaleLinear({ domain: [0, Math.max(1, points.length - 1)], range: [0, xMax] }),
    [points.length, xMax],
  )
  const yScale = useMemo(() => {
    const ys = points.map((p) => p.y)
    return scaleLinear({
      domain: [Math.min(...ys, 0), Math.max(...ys, 1)],
      range: [yMax, 0],
      nice: true,
    })
  }, [points, yMax])

  return (
    <svg width={width} height={HEIGHT}>
      <Group top={MARGIN.top} left={MARGIN.left}>
        <LinePath<ChartPoint>
          data={points}
          x={(_, i) => xScale(i) ?? 0}
          y={(p) => yScale(p.y) ?? 0}
          curve={curveMonotoneX}
          stroke="var(--accent-ai)"
          strokeWidth={1.5}
          strokeOpacity={0.9}
        />
      </Group>
    </svg>
  )
}

export function MiniChartBlock({
  points,
  annotation,
}: {
  points: ChartPoint[]
  annotation?: string
}) {
  if (points.length < 2) return null
  return (
    <div className="flex flex-col gap-1">
      <div className="h-[60px] w-full">
        <ParentSize>{({ width }) => <Inner width={width} points={points} />}</ParentSize>
      </div>
      {annotation && (
        <span className="text-text-tertiary amount tabular text-[11px]">{annotation}</span>
      )}
    </div>
  )
}
