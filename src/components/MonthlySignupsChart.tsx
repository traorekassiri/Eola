import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { BarChart3 } from 'lucide-react';
import type { MonthlySignupPoint } from '../types';

interface MonthlySignupsChartProps {
  data: MonthlySignupPoint[];
  monthsWindow: 6 | 12;
  onChangeWindow: (months: 6 | 12) => void;
}

export const MonthlySignupsChart: React.FC<MonthlySignupsChartProps> = ({
  data,
  monthsWindow,
  onChangeWindow,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [width, setWidth] = useState(680);
  const [hovered, setHovered] = useState<{ point: MonthlySignupPoint; x: number; y: number } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateSize = () => {
      const next = Math.max(300, Math.floor(el.clientWidth));
      setWidth(next);
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl || data.length === 0) return;

    const height = 270;
    const margin = { top: 22, right: 20, bottom: 38, left: 40 };
    const innerWidth = Math.max(120, width - margin.left - margin.right);
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();
    svg.attr('viewBox', `0 0 ${width} ${height}`).attr('width', width).attr('height', height);

    const defs = svg.append('defs');
    const grad = defs
      .append('linearGradient')
      .attr('id', 'zola-bar-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    grad.append('stop').attr('offset', '0%').attr('stop-color', '#ff6b1a');
    grad.append('stop').attr('offset', '100%').attr('stop-color', '#e62e2d');

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const maxVal = Math.max(1, d3.max(data, (d) => d.count) ?? 0);
    const yMax = maxVal <= 4 ? maxVal + 1 : Math.ceil(maxVal * 1.15);

    const x = d3
      .scaleBand<string>()
      .domain(data.map((d) => d.label))
      .range([0, innerWidth])
      .padding(0.32);

    const y = d3.scaleLinear().domain([0, yMax]).nice().range([innerHeight, 0]);

    // Horizontal grid lines
    g.append('g')
      .attr('class', 'zola-d3-grid')
      .call(
        d3
          .axisLeft(y)
          .ticks(Math.min(5, yMax))
          .tickSize(-innerWidth)
          .tickFormat(() => '')
      )
      .call((axisG) => {
        axisG.select('.domain').remove();
        axisG.selectAll('line').attr('stroke', 'rgba(255,255,255,0.07)').attr('stroke-dasharray', '3 3');
      });

    // Y axis
    g.append('g')
      .call(
        d3
          .axisLeft(y)
          .ticks(Math.min(5, yMax))
          .tickFormat((v) => (Number.isInteger(Number(v)) ? String(v) : ''))
      )
      .call((axisG) => {
        axisG.select('.domain').remove();
        axisG.selectAll('line').remove();
        axisG.selectAll('text').attr('fill', '#a8a29e').attr('font-size', '11px');
      });

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).tickSizeOuter(0))
      .call((axisG) => {
        axisG.select('.domain').attr('stroke', 'rgba(255,255,255,0.12)');
        axisG.selectAll('line').remove();
        axisG.selectAll('text').attr('fill', '#d6d3d1').attr('font-size', '11px').attr('dy', '1em');
      });

    // Bars with smooth entrance
    const bars = g
      .selectAll<SVGRectElement, MonthlySignupPoint>('rect.zola-bar')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'zola-bar')
      .attr('x', (d) => x(d.label) ?? 0)
      .attr('width', x.bandwidth())
      .attr('rx', 6)
      .attr('ry', 6)
      .attr('y', innerHeight)
      .attr('height', 0)
      .attr('fill', (d) => (d.count > 0 ? 'url(#zola-bar-gradient)' : 'rgba(255,255,255,0.08)'))
      .style('cursor', 'pointer')
      .on('mouseenter', function (_event, d) {
        d3.select(this).attr('opacity', 0.85);
        const bx = (x(d.label) ?? 0) + x.bandwidth() / 2 + margin.left;
        const by = y(d.count) + margin.top;
        setHovered({ point: d, x: bx, y: by });
      })
      .on('mouseleave', function () {
        d3.select(this).attr('opacity', 1);
        setHovered(null);
      });

    bars
      .transition()
      .duration(480)
      .ease(d3.easeCubicOut)
      .attr('y', (d) => (d.count > 0 ? y(d.count) : innerHeight - 4))
      .attr('height', (d) => (d.count > 0 ? Math.max(4, innerHeight - y(d.count)) : 4));

    // Value labels above bars
    g.selectAll<SVGTextElement, MonthlySignupPoint>('text.zola-bar-val')
      .data(data)
      .enter()
      .append('text')
      .attr('class', 'zola-bar-val')
      .attr('x', (d) => (x(d.label) ?? 0) + x.bandwidth() / 2)
      .attr('y', (d) => (d.count > 0 ? y(d.count) - 7 : innerHeight - 9))
      .attr('text-anchor', 'middle')
      .attr('fill', (d) => (d.count > 0 ? '#fbbf24' : '#78716c'))
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .text((d) => String(d.count));
  }, [data, width]);

  const totalWindow = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <section className="zola-card rounded-2xl p-5 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-orange-400" />
            <h2 className="font-display text-lg font-bold text-white">
              Évolution des inscriptions par mois
            </h2>
          </div>
          <p className="text-xs text-stone-400 mt-0.5 tabular-nums">
            {totalWindow} inscription(s) enregistrée(s) sur les {monthsWindow} derniers mois
          </p>
        </div>

        <div className="inline-flex rounded-xl border border-white/10 bg-white/5 p-1 text-xs">
          <button
            type="button"
            onClick={() => onChangeWindow(6)}
            className={`rounded-lg px-3 py-1 font-semibold transition-colors ${
              monthsWindow === 6 ? 'zola-gradient text-white' : 'text-stone-300 hover:text-white'
            }`}
          >
            6 mois
          </button>
          <button
            type="button"
            onClick={() => onChangeWindow(12)}
            className={`rounded-lg px-3 py-1 font-semibold transition-colors ${
              monthsWindow === 12 ? 'zola-gradient text-white' : 'text-stone-300 hover:text-white'
            }`}
          >
            12 mois
          </button>
        </div>
      </div>

      <div ref={containerRef} className="relative w-full overflow-hidden">
        <svg ref={svgRef} className="block w-full select-none" role="img" aria-label="Graphique des inscriptions par mois" />
        {hovered && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-xl border border-orange-500/40 bg-[#181210]/95 px-3 py-1.5 text-xs shadow-lg"
            style={{ left: hovered.x, top: Math.max(36, hovered.y - 8) }}
          >
            <p className="font-semibold text-white">{hovered.point.label}</p>
            <p className="text-amber-300 tabular-nums">
              {hovered.point.count} inscription{hovered.point.count > 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export const MonthlyRevenueChart: React.FC<{ data: MonthlySignupPoint[] }> = ({ data }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [width, setWidth] = useState(480);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateSize = () => setWidth(Math.max(260, Math.floor(el.clientWidth)));
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl || data.length === 0) return;

    const height = 230;
    const margin = { top: 20, right: 16, bottom: 34, left: 56 };
    const innerWidth = Math.max(100, width - margin.left - margin.right);
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();
    svg.attr('viewBox', `0 0 ${width} ${height}`).attr('width', width).attr('height', height);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    const maxVal = Math.max(5000, d3.max(data, (d) => d.revenue_fcfa || 0) ?? 0);

    const x = d3
      .scaleBand<string>()
      .domain(data.map((d) => d.label))
      .range([0, innerWidth])
      .padding(0.32);

    const y = d3.scaleLinear().domain([0, Math.ceil(maxVal * 1.15)]).nice().range([innerHeight, 0]);

    g.append('g')
      .call(
        d3
          .axisLeft(y)
          .ticks(4)
          .tickFormat((v) => `${Math.round(Number(v) / 1000)}k`)
      )
      .call((axisG) => {
        axisG.select('.domain').remove();
        axisG.selectAll('line').attr('stroke', 'rgba(255,255,255,0.06)');
        axisG.selectAll('text').attr('fill', '#a8a29e').attr('font-size', '11px');
      });

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).tickSizeOuter(0))
      .call((axisG) => {
        axisG.select('.domain').attr('stroke', 'rgba(255,255,255,0.12)');
        axisG.selectAll('line').remove();
        axisG.selectAll('text').attr('fill', '#d6d3d1').attr('font-size', '10px');
      });

    g.selectAll('rect.zola-rev-bar')
      .data(data)
      .enter()
      .append('rect')
      .attr('x', (d) => x(d.label) ?? 0)
      .attr('width', x.bandwidth())
      .attr('rx', 5)
      .attr('y', (d) => ((d.revenue_fcfa || 0) > 0 ? y(d.revenue_fcfa || 0) : innerHeight - 3))
      .attr('height', (d) => ((d.revenue_fcfa || 0) > 0 ? Math.max(3, innerHeight - y(d.revenue_fcfa || 0)) : 3))
      .attr('fill', (d) => ((d.revenue_fcfa || 0) > 0 ? '#f59e0b' : 'rgba(255,255,255,0.08)'));
  }, [data, width]);

  const totalRev = data.reduce((sum, d) => sum + (d.revenue_fcfa || 0), 0);

  return (
    <section className="zola-card rounded-2xl p-5 space-y-3">
      <div>
        <h2 className="font-display text-base font-bold text-white">Revenus Premium mensuels (FCFA)</h2>
        <p className="text-xs text-amber-300 tabular-nums mt-0.5">
          {totalRev.toLocaleString('fr-FR')} FCFA sur la période
        </p>
      </div>
      <div ref={containerRef} className="w-full overflow-hidden">
        <svg ref={svgRef} className="block w-full select-none" role="img" aria-label="Revenus mensuels FCFA" />
      </div>
    </section>
  );
};

export const CountryDistributionChart: React.FC<{
  data: Array<{ country: string; count: number }>;
}> = ({ data }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [width, setWidth] = useState(480);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateSize = () => setWidth(Math.max(260, Math.floor(el.clientWidth)));
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl || data.length === 0) return;

    const height = Math.max(180, data.length * 30 + 24);
    const margin = { top: 8, right: 32, bottom: 16, left: 112 };
    const innerWidth = Math.max(80, width - margin.left - margin.right);
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();
    svg.attr('viewBox', `0 0 ${width} ${height}`).attr('width', width).attr('height', height);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    const maxVal = Math.max(1, d3.max(data, (d) => d.count) ?? 1);

    const y = d3
      .scaleBand<string>()
      .domain(data.map((d) => d.country))
      .range([0, innerHeight])
      .padding(0.28);

    const x = d3.scaleLinear().domain([0, maxVal]).range([0, innerWidth]);

    g.append('g')
      .call(d3.axisLeft(y).tickSizeOuter(0))
      .call((axisG) => {
        axisG.select('.domain').remove();
        axisG.selectAll('line').remove();
        axisG.selectAll('text').attr('fill', '#e7e5e4').attr('font-size', '11px');
      });

    g.selectAll('rect.zola-country-bar')
      .data(data)
      .enter()
      .append('rect')
      .attr('x', 0)
      .attr('y', (d) => y(d.country) ?? 0)
      .attr('height', y.bandwidth())
      .attr('width', (d) => Math.max(4, x(d.count)))
      .attr('rx', 5)
      .attr('fill', '#ff6b1a');

    g.selectAll('text.zola-country-val')
      .data(data)
      .enter()
      .append('text')
      .attr('x', (d) => Math.max(4, x(d.count)) + 6)
      .attr('y', (d) => (y(d.country) ?? 0) + y.bandwidth() / 2 + 4)
      .attr('fill', '#fbbf24')
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .text((d) => String(d.count));
  }, [data, width]);

  return (
    <section className="zola-card rounded-2xl p-5 space-y-3">
      <div>
        <h2 className="font-display text-base font-bold text-white">Répartition géographique par pays</h2>
        <p className="text-xs text-stone-400 mt-0.5">Top pays actifs de la communauté ZOLA</p>
      </div>
      <div ref={containerRef} className="w-full overflow-hidden">
        <svg ref={svgRef} className="block w-full select-none" role="img" aria-label="Répartition par pays" />
      </div>
    </section>
  );
};
