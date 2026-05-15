import { useEffect, useRef, useCallback } from 'react';
import * as echarts from 'echarts/core';

interface EChartsCoreProps {
  echarts: typeof echarts;
  option: echarts.EChartsOption;
  style?: React.CSSProperties;
  className?: string;
  opts?: echarts.EChartsInitOpts;
  notMerge?: boolean;
  replaceMerge?: string | string[];
  lazyUpdate?: boolean;
  showLoading?: boolean;
  loadingOption?: echarts.LoadingOption;
  onChartReady?: (echartsInstance: echarts.ECharts) => void;
  onEvents?: Record<string, (params: unknown, instance: echarts.ECharts) => void>;
  autoResize?: boolean;
}

export default function EChartsCore({
  echarts: echartsLib,
  option,
  style = {},
  className = '',
  opts = {},
  notMerge = false,
  replaceMerge = null,
  lazyUpdate = false,
  showLoading = false,
  loadingOption = null,
  onChartReady,
  onEvents = {},
  autoResize = true,
}: EChartsCoreProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);
  const isInitialResizeRef = useRef(true);

  const initChart = useCallback(() => {
    if (!containerRef.current) return;
    
    if (chartRef.current) {
      chartRef.current.dispose();
    }

    const chart = echartsLib.init(containerRef.current, undefined, opts);
    chartRef.current = chart;

    if (onChartReady) {
      onChartReady(chart);
    }

    for (const [eventName, handler] of Object.entries(onEvents)) {
      chart.on(eventName, (params) => handler(params, chart));
    }

    updateChartOption();

    if (autoResize) {
      const resizeObserver = new ResizeObserver(() => {
        if (!isInitialResizeRef.current) {
          chart.resize({ width: 'auto', height: 'auto' });
        }
        isInitialResizeRef.current = false;
      });
      resizeObserver.observe(containerRef.current);
    }
  }, [echartsLib, opts, onChartReady, onEvents, autoResize]);

  const updateChartOption = useCallback(() => {
    if (!chartRef.current) return;

    chartRef.current.setOption(option, {
      notMerge,
      replaceMerge,
      lazyUpdate,
    });

    if (showLoading) {
      chartRef.current.showLoading(loadingOption);
    } else {
      chartRef.current.hideLoading();
    }
  }, [option, notMerge, replaceMerge, lazyUpdate, showLoading, loadingOption]);

  useEffect(() => {
    initChart();

    return () => {
      if (chartRef.current) {
        chartRef.current.dispose();
        chartRef.current = null;
      }
    };
  }, [initChart]);

  useEffect(() => {
    updateChartOption();
  }, [updateChartOption]);

  return (
    <div
      ref={containerRef}
      style={{ height: 300, ...style }}
      className={`echarts-for-react ${className}`}
    />
  );
}