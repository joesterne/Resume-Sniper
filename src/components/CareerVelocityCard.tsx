import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Calendar, 
  Zap, 
  Award, 
  BarChart2, 
  Activity, 
  ChevronDown, 
  ChevronUp,
  Info
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine
} from 'recharts';
import { DocumentVersion } from '../types';

interface CareerVelocityCardProps {
  history: DocumentVersion[];
}

type TimeframeOption = '7d' | '14d' | '30d' | 'all';
type MetricView = 'cumulative' | 'daily';

interface VelocityDataPoint {
  dateKey: string;     // YYYY-MM-DD
  displayDate: string; // e.g. "Oct 05"
  count: number;       // apps on this day
  cumulative: number;  // running total
  interviewing: number;
  offers: number;
}

// Helper to reliably parse timestamp into ms
function getTimestampMs(val: any): number {
  if (!val) return Date.now();
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const t = new Date(val).getTime();
    return isNaN(t) ? Date.now() : t;
  }
  if (typeof val === 'object') {
    const sec = val._seconds || val.seconds;
    if (typeof sec === 'number') return sec * 1000;
    if (typeof val.toDate === 'function') {
      try {
        return val.toDate().getTime();
      } catch {
        return Date.now();
      }
    }
  }
  return Date.now();
}

function formatDayLabel(dateStr: string): string {
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const mIdx = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      return `${months[mIdx] || parts[1]} ${d}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

export function CareerVelocityCard({ history }: CareerVelocityCardProps) {
  const [timeframe, setTimeframe] = useState<TimeframeOption>('14d');
  const [metricView, setMetricView] = useState<MetricView>('cumulative');
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Process history items into chronological velocity data
  const { chartData, metrics } = useMemo(() => {
    const now = new Date();
    const nowMs = now.getTime();

    // Map all history items to date keys
    const itemsWithDates = history.map(item => {
      const ms = getTimestampMs(item.created_at);
      const d = new Date(ms);
      const dateKey = d.toISOString().split('T')[0];
      const status = (item.status || 'draft').toLowerCase();
      return {
        ...item,
        timestampMs: ms,
        dateKey,
        isAppliedOrBeyond: status !== 'draft',
        isInterviewing: status === 'interviewing',
        isOffer: status === 'offer',
      };
    });

    // Determine cutoff date based on timeframe
    let daysToInclude = 14;
    if (timeframe === '7d') daysToInclude = 7;
    else if (timeframe === '14d') daysToInclude = 14;
    else if (timeframe === '30d') daysToInclude = 30;
    else if (timeframe === 'all') {
      if (itemsWithDates.length > 0) {
        const oldestMs = Math.min(...itemsWithDates.map(i => i.timestampMs));
        const diffDays = Math.ceil((nowMs - oldestMs) / (1000 * 60 * 60 * 24));
        daysToInclude = Math.max(diffDays + 2, 7);
      } else {
        daysToInclude = 14;
      }
    }

    // Generate continuous date slots for smooth trend visualization
    const dateMap = new Map<string, { count: number; interviewing: number; offers: number }>();
    
    // Seed days in chronological order
    for (let i = daysToInclude - 1; i >= 0; i--) {
      const d = new Date(nowMs - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split('T')[0];
      dateMap.set(key, { count: 0, interviewing: 0, offers: 0 });
    }

    // Populate actual counts
    itemsWithDates.forEach(item => {
      if (dateMap.has(item.dateKey)) {
        const current = dateMap.get(item.dateKey)!;
        current.count += 1;
        if (item.isInterviewing) current.interviewing += 1;
        if (item.isOffer) current.offers += 1;
      } else if (timeframe === 'all') {
        // If 'all' and before the generated window, add it
        dateMap.set(item.dateKey, {
          count: 1,
          interviewing: item.isInterviewing ? 1 : 0,
          offers: item.isOffer ? 1 : 0
        });
      }
    });

    // Sort keys chronologically
    const sortedKeys = Array.from(dateMap.keys()).sort();

    // Compute running cumulative total
    let runningTotal = 0;
    // Calculate total before window for true cumulative reflection
    if (timeframe !== 'all') {
      const windowStartMs = nowMs - daysToInclude * 24 * 60 * 60 * 1000;
      runningTotal = itemsWithDates.filter(i => i.timestampMs < windowStartMs).length;
    }

    const data: VelocityDataPoint[] = sortedKeys.map(key => {
      const entry = dateMap.get(key) || { count: 0, interviewing: 0, offers: 0 };
      runningTotal += entry.count;
      return {
        dateKey: key,
        displayDate: formatDayLabel(key),
        count: entry.count,
        cumulative: runningTotal,
        interviewing: entry.interviewing,
        offers: entry.offers
      };
    });

    // Velocity metrics calculations
    const totalApps = history.length;
    const past7DaysMs = nowMs - 7 * 24 * 60 * 60 * 1000;
    const prev7DaysMs = nowMs - 14 * 24 * 60 * 60 * 1000;

    const appsLast7Days = itemsWithDates.filter(i => i.timestampMs >= past7DaysMs).length;
    const appsPrev7Days = itemsWithDates.filter(i => i.timestampMs >= prev7DaysMs && i.timestampMs < past7DaysMs).length;

    // Velocity rate in apps/week
    const weeklyVelocity = appsLast7Days;
    
    // Pace acceleration compared to previous week
    let paceDelta = 0;
    if (appsPrev7Days > 0) {
      paceDelta = Math.round(((appsLast7Days - appsPrev7Days) / appsPrev7Days) * 100);
    } else if (appsLast7Days > 0) {
      paceDelta = 100;
    }

    // Active conversion rate (Interviewing or Offer vs total)
    const activePipelineCount = itemsWithDates.filter(i => i.isInterviewing || i.isOffer).length;
    const conversionRate = totalApps > 0 
      ? Math.round((activePipelineCount / totalApps) * 100) 
      : 0;

    // Offer status count
    const offerCount = history.filter(item => {
      const s = (item.status || '').toLowerCase().trim();
      return s === 'offer' || s === 'offered' || s === 'accepted';
    }).length;

    // Total applications submitted (excluding drafts)
    const submittedCount = history.filter(item => {
      if (!item.status) return true;
      const s = item.status.toLowerCase().trim();
      return s !== 'draft' && s !== 'drafted' && s !== 'saved';
    }).length;

    // Effective total submitted (if submittedCount is 0 but history has items, fallback to totalApps)
    const effectiveTotalSubmitted = submittedCount > 0 ? submittedCount : totalApps;

    // Application Success Rate: ratio of 'Offer' statuses to total applications submitted
    const successRate = effectiveTotalSubmitted > 0
      ? Math.round((offerCount / effectiveTotalSubmitted) * 100)
      : 0;

    return {
      chartData: data,
      metrics: {
        totalApps,
        weeklyVelocity,
        paceDelta,
        activePipelineCount,
        conversionRate,
        appsLast7Days,
        offerCount,
        totalSubmitted: effectiveTotalSubmitted,
        successRate
      }
    };
  }, [history, timeframe]);

  // Max value for Y-Axis padding
  const maxDailyCount = useMemo(() => {
    return Math.max(...chartData.map(d => d.count), 3);
  }, [chartData]);

  const maxCumulativeCount = useMemo(() => {
    return Math.max(...chartData.map(d => d.cumulative), 5);
  }, [chartData]);

  return (
    <div className="bg-white border border-grid shadow-[4px_4px_0px_#141414] overflow-hidden transition-all">
      {/* Header Bar */}
      <div className="p-4 border-b border-grid bg-bg flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-ink text-bg flex items-center justify-center font-bold">
            <Activity size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
                Career Velocity // Analytics
              </h3>
              <span className="text-[9px] font-mono px-1.5 py-0.2 bg-ink/10 text-ink/70 border border-grid/20 uppercase font-semibold">
                Live Pulse
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase font-semibold">
                Success Rate: {metrics.successRate}%
              </span>
            </div>
            <p className="text-[10px] font-mono opacity-60">
              Application volume trajectory and submission cadence over time
            </p>
          </div>
        </div>

        {/* Controls: Metric View, Timeframe & Collapse */}
        <div className="flex items-center gap-2">
          {/* Cumulative vs Daily */}
          <div className="flex items-center border border-grid bg-white p-0.5 text-[9px] font-mono uppercase font-bold">
            <button
              onClick={() => setMetricView('cumulative')}
              className={`px-2 py-1 transition-colors ${
                metricView === 'cumulative' ? 'bg-ink text-bg' : 'text-ink/60 hover:text-ink'
              }`}
              title="Show cumulative growth curve"
            >
              Cumulative
            </button>
            <button
              onClick={() => setMetricView('daily')}
              className={`px-2 py-1 transition-colors ${
                metricView === 'daily' ? 'bg-ink text-bg' : 'text-ink/60 hover:text-ink'
              }`}
              title="Show daily volume bars"
            >
              Daily Volume
            </button>
          </div>

          {/* Timeframe Selector */}
          <div className="flex items-center border border-grid bg-white p-0.5 text-[9px] font-mono uppercase font-bold">
            {(['7d', '14d', '30d', 'all'] as TimeframeOption[]).map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2 py-1 transition-colors ${
                  timeframe === tf ? 'bg-ink text-bg' : 'text-ink/60 hover:text-ink'
                }`}
              >
                {tf === 'all' ? 'All' : tf}
              </button>
            ))}
          </div>

          {/* Collapse/Expand Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 border border-grid bg-white hover:bg-black/5 text-ink transition-colors"
            title={isCollapsed ? 'Expand Velocity Card' : 'Minimize Velocity Card'}
          >
            {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <>
          {/* Velocity KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 border-b border-grid bg-main divide-x divide-grid font-mono">
            {/* Total Submissions */}
            <div className="p-4 flex flex-col justify-center">
              <div className="text-[10px] uppercase opacity-50 flex items-center gap-1 font-bold">
                <Calendar size={11} />
                <span>Total Applications</span>
              </div>
              <div className="text-2xl font-bold text-ink mt-1 tabular-nums">
                {metrics.totalApps.toString().padStart(2, '0')}
              </div>
              <div className="text-[9px] opacity-60 mt-0.5">
                Archived in database
              </div>
            </div>

            {/* 7-Day Velocity */}
            <div className="p-4 flex flex-col justify-center">
              <div className="text-[10px] uppercase opacity-50 flex items-center gap-1 font-bold">
                <Zap size={11} className="text-amber-700" />
                <span>7-Day Velocity</span>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-ink tabular-nums">
                  {metrics.weeklyVelocity}
                </span>
                <span className="text-[10px] uppercase opacity-60">apps / wk</span>
              </div>
              <div className="text-[9px] mt-0.5 font-bold">
                {metrics.paceDelta >= 0 ? (
                  <span className="text-green-700">▲ +{metrics.paceDelta}% vs prev week</span>
                ) : (
                  <span className="text-rose-700">▼ {metrics.paceDelta}% vs prev week</span>
                )}
              </div>
            </div>

            {/* Application Success Rate */}
            <div className="p-4 flex flex-col justify-center bg-white/40" data-testid="application-success-rate-card">
              <div className="text-[10px] uppercase opacity-70 flex items-center gap-1 font-bold text-emerald-800">
                <Award size={11} className="text-emerald-700" />
                <span>Application Success Rate</span>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-emerald-950 tabular-nums">
                  {metrics.successRate}%
                </span>
                <span className="text-[10px] uppercase opacity-60 font-semibold">
                  ({metrics.offerCount}/{metrics.totalSubmitted})
                </span>
              </div>
              <div className="text-[9px] opacity-70 mt-0.5">
                {metrics.offerCount} {metrics.offerCount === 1 ? 'offer' : 'offers'} of {metrics.totalSubmitted} submitted
              </div>
            </div>

            {/* Pipeline Momentum */}
            <div className="p-4 flex flex-col justify-center">
              <div className="text-[10px] uppercase opacity-50 flex items-center gap-1 font-bold">
                <TrendingUp size={11} className="text-blue-700" />
                <span>Active Funnel</span>
              </div>
              <div className="text-2xl font-bold text-ink mt-1 tabular-nums">
                {metrics.activePipelineCount}
              </div>
              <div className="text-[9px] opacity-60 mt-0.5">
                Interviewing or Offer stages
              </div>
            </div>

            {/* Conversion Rate */}
            <div className="p-4 flex flex-col justify-center">
              <div className="text-[10px] uppercase opacity-50 flex items-center gap-1 font-bold">
                <BarChart2 size={11} className="text-purple-700" />
                <span>Funnel Conversion</span>
              </div>
              <div className="text-2xl font-bold text-ink mt-1 tabular-nums">
                {metrics.conversionRate}%
              </div>
              <div className="text-[9px] opacity-60 mt-0.5">
                Stage progression rate
              </div>
            </div>
          </div>

          {/* Chart Viewport */}
          <div className="p-6 bg-white">
            <div className="h-60 w-full">
              {metricView === 'cumulative' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 12, right: 12, left: -20, bottom: 4 }}
                  >
                    <defs>
                      <linearGradient id="velocityGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#141414" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#141414" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="2 2" stroke="#E4E3E0" vertical={false} />
                    <XAxis
                      dataKey="displayDate"
                      tick={{ fill: '#141414', fontSize: 10, fontFamily: 'monospace' }}
                      tickLine={{ stroke: '#141414' }}
                      axisLine={{ stroke: '#141414' }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      domain={[0, maxCumulativeCount]}
                      allowDecimals={false}
                      tick={{ fill: '#141414', fontSize: 10, fontFamily: 'monospace' }}
                      tickLine={{ stroke: '#141414' }}
                      axisLine={{ stroke: '#141414' }}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload as VelocityDataPoint;
                          return (
                            <div className="bg-ink text-bg border border-ink p-2.5 font-mono text-[10px] shadow-md">
                              <div className="font-bold border-b border-white/20 pb-1 mb-1">
                                {data.dateKey} ({data.displayDate})
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="opacity-70">Cumulative Total:</span>
                                <span className="font-bold tabular-nums">{data.cumulative}</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="opacity-70">Day Volume:</span>
                                <span className="tabular-nums font-bold text-amber-300">+{data.count}</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="cumulative"
                      stroke="#141414"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#velocityGradient)"
                      activeDot={{ r: 5, fill: '#141414', stroke: '#FFFFFF', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 12, right: 12, left: -20, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="2 2" stroke="#E4E3E0" vertical={false} />
                    <XAxis
                      dataKey="displayDate"
                      tick={{ fill: '#141414', fontSize: 10, fontFamily: 'monospace' }}
                      tickLine={{ stroke: '#141414' }}
                      axisLine={{ stroke: '#141414' }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      domain={[0, maxDailyCount]}
                      allowDecimals={false}
                      tick={{ fill: '#141414', fontSize: 10, fontFamily: 'monospace' }}
                      tickLine={{ stroke: '#141414' }}
                      axisLine={{ stroke: '#141414' }}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload as VelocityDataPoint;
                          return (
                            <div className="bg-ink text-bg border border-ink p-2.5 font-mono text-[10px] shadow-md">
                              <div className="font-bold border-b border-white/20 pb-1 mb-1">
                                {data.dateKey} ({data.displayDate})
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="opacity-70">Submitted on date:</span>
                                <span className="font-bold tabular-nums text-green-300">
                                  {data.count} {data.count === 1 ? 'application' : 'applications'}
                                </span>
                              </div>
                              <div className="flex justify-between gap-4 text-white/60">
                                <span>Total to date:</span>
                                <span className="tabular-nums">{data.cumulative}</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      dataKey="count"
                      fill="#141414"
                      radius={[2, 2, 0, 0]}
                      maxBarSize={32}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Sub-Legend Footer */}
            <div className="mt-3 pt-3 border-t border-grid/20 flex flex-wrap items-center justify-between text-[9px] font-mono opacity-60">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-ink inline-block" />
                  <span>
                    {metricView === 'cumulative' ? 'Total Submissions Over Time' : 'Applications Dispatched Per Day'}
                  </span>
                </span>
                <span>Interval: <strong className="uppercase">{timeframe}</strong></span>
              </div>
              <div className="flex items-center gap-1">
                <Info size={11} />
                <span>Aggregated live from your Firestore application ledger</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
