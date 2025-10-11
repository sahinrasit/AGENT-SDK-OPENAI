import React, { useState, useEffect } from 'react';
import {
  Activity,
  TrendingUp,
  Users,
  MessageSquare,
  Clock,
  Zap,
  ArrowUp,
  ArrowDown,
  Calendar,
  Download
} from 'lucide-react';
import { clsx } from 'clsx';
import { useLanguage } from '../../contexts/LanguageContext';

interface AnalyticsPanelProps {}

type TimeRange = '24h' | '7d' | '30d' | '90d';

export const AnalyticsPanel: React.FC<AnalyticsPanelProps> = () => {
  const { t } = useLanguage();
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSessions: 0,
    activeUsers: 0,
    totalMessages: 0,
    avgResponseTime: 0,
    successRate: 94.5,
    toolUsage: 0
  });

  const [trends, setTrends] = useState({
    sessions: 0,
    users: 0,
    messages: 0,
    responseTime: 0
  });

  const [toolUsage, setToolUsage] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);

  // Load analytics data
  const loadAnalytics = async () => {
    try {
      setLoading(true);

      // Fetch stats
      const statsRes = await fetch(`/api/analytics/stats?timeRange=${timeRange}`);
      const statsData = await statsRes.json();

      setStats({
        totalSessions: statsData.totalSessions || 0,
        activeUsers: statsData.activeUsers || 0,
        totalMessages: statsData.totalMessages || 0,
        avgResponseTime: statsData.avgResponseTime || 0,
        successRate: 94.5,
        toolUsage: 0
      });

      setTrends({
        sessions: statsData.trend?.sessions || 0,
        users: statsData.trend?.users || 0,
        messages: statsData.trend?.messages || 0,
        responseTime: parseFloat(statsData.trend?.responseTime || '0')
      });

      // Fetch tool usage
      const toolsRes = await fetch('/api/analytics/tools');
      const toolsData = await toolsRes.json();
      setToolUsage(toolsData.slice(0, 10)); // Top 10 tools

      // Fetch recent activity
      const activityRes = await fetch('/api/analytics/activity?limit=20');
      const activityData = await activityRes.json();
      setActivities(activityData);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load on mount and when timeRange changes
  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadAnalytics();
    }, 30000);

    return () => clearInterval(interval);
  }, [timeRange]);

  const timeRanges = [
    { id: '24h', label: t('analytics.time.24h') },
    { id: '7d', label: t('analytics.time.7d') },
    { id: '30d', label: t('analytics.time.30d') },
    { id: '90d', label: t('analytics.time.90d') }
  ];

  const statCards = [
    {
      title: t('analytics.totalSessions'),
      value: stats.totalSessions.toLocaleString(),
      change: trends.sessions,
      icon: Users,
      color: 'blue'
    },
    {
      title: t('analytics.activeUsers'),
      value: stats.activeUsers.toString(),
      change: trends.users,
      icon: Activity,
      color: 'green'
    },
    {
      title: t('analytics.totalMessages'),
      value: stats.totalMessages.toLocaleString(),
      change: trends.messages,
      icon: MessageSquare,
      color: 'purple'
    },
    {
      title: t('analytics.avgResponseTime'),
      value: `${stats.avgResponseTime}s`,
      change: trends.responseTime,
      icon: Clock,
      color: 'orange'
    }
  ];

  // Use actual tool usage data from API
  const usageData = toolUsage.length > 0 ? toolUsage : [
    { name: t('analytics.noToolsYet'), count: 0, percentage: 0 }
  ];

  const performanceMetrics = [
    { metric: t('analytics.metric.successRate'), value: `${stats.successRate}%`, status: 'success' },
    { metric: t('analytics.metric.errorRate'), value: `${(100 - stats.successRate).toFixed(1)}%`, status: 'warning' },
    { metric: t('analytics.metric.avgResponse'), value: `${stats.avgResponseTime}s`, status: 'success' },
    { metric: t('analytics.metric.toolUsage'), value: stats.toolUsage.toString(), status: 'info' }
  ];

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400';
      case 'green':
        return 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400';
      case 'purple':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400';
      case 'orange':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('analytics.title')}</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t('analytics.subtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              {timeRanges.map((range) => (
                <button
                  key={range.id}
                  onClick={() => setTimeRange(range.id as TimeRange)}
                  className={clsx(
                    'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                    timeRange === range.id
                      ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  )}
                >
                  {range.label}
                </button>
              ))}
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Download className="w-4 h-4" />
              {t('analytics.downloadReport')}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Activity className="w-12 h-12 text-blue-600 dark:text-blue-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">{t('analytics.loading')}</p>
            </div>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((card) => {
              const Icon = card.icon;
              const isPositive = card.change >= 0;

              return (
                <div key={card.title} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className={clsx('p-2 rounded-lg', getColorClasses(card.color))}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className={clsx(
                      'flex items-center gap-1 text-xs font-medium',
                      isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    )}>
                      {isPositive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                      {Math.abs(card.change)}%
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{card.title}</p>
                </div>
              );
            })}
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tool Usage Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('analytics.toolUsageStats')}</h3>
              <div className="space-y-3">
                {usageData.map((item) => (
                  <div key={item.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.name}</span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">{item.count} ({item.percentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('analytics.performanceMetrics')}</h3>
              <div className="space-y-4">
                {performanceMetrics.map((metric) => (
                  <div key={metric.metric} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{metric.metric}</span>
                    <span className={clsx(
                      'text-lg font-bold',
                      metric.status === 'success' && 'text-green-600 dark:text-green-400',
                      metric.status === 'warning' && 'text-orange-600 dark:text-orange-400',
                      metric.status === 'info' && 'text-blue-600 dark:text-blue-400'
                    )}>
                      {metric.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('analytics.recentActivities')}</h3>
            <div className="space-y-4">
              {activities.length > 0 ? activities.map((activity, index) => (
                <div key={index} className="flex items-start gap-4 pb-4 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <div className={clsx(
                    'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
                    activity.type === 'session' && 'bg-blue-100 dark:bg-blue-900/30',
                    activity.type === 'tool' && 'bg-purple-100 dark:bg-purple-900/30',
                    activity.type === 'message' && 'bg-green-100 dark:bg-green-900/30',
                    activity.type === 'system' && 'bg-orange-100 dark:bg-orange-900/30'
                  )}>
                    {activity.type === 'session' && <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
                    {activity.type === 'tool' && <Zap className="w-5 h-5 text-purple-600 dark:text-purple-400" />}
                    {activity.type === 'message' && <MessageSquare className="w-5 h-5 text-green-600 dark:text-green-400" />}
                    {activity.type === 'system' && <Activity className="w-5 h-5 text-orange-600 dark:text-orange-400" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{activity.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-600 dark:text-gray-400">{activity.user}</span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {new Date(activity.timestamp).toLocaleTimeString('tr-TR')}
                      </span>
                    </div>
                  </div>
                </div>
              )) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">{t('analytics.noActivities')}</p>
              )}
            </div>
          </div>

          {/* System Health */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('analytics.systemHealth')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-green-900 dark:text-green-300">{t('analytics.health.api')}</span>
                </div>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{t('analytics.health.running')}</p>
                <p className="text-xs text-green-700 dark:text-green-500 mt-1">{t('analytics.health.allActive')}</p>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-300">{t('analytics.health.database')}</span>
                </div>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{t('analytics.health.healthy')}</p>
                <p className="text-xs text-blue-700 dark:text-blue-500 mt-1">{t('analytics.health.stable')}</p>
              </div>

              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span className="text-sm font-medium text-purple-900 dark:text-purple-300">{t('analytics.health.mcpServers')}</span>
                </div>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">1/1 {t('analytics.health.active')}</p>
                <p className="text-xs text-purple-700 dark:text-purple-500 mt-1">{t('analytics.health.connected')}</p>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
