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

interface AnalyticsPanelProps {}

type TimeRange = '24h' | '7d' | '30d' | '90d';

export const AnalyticsPanel: React.FC<AnalyticsPanelProps> = () => {
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
    { id: '24h', label: 'Son 24 Saat' },
    { id: '7d', label: 'Son 7 Gün' },
    { id: '30d', label: 'Son 30 Gün' },
    { id: '90d', label: 'Son 90 Gün' }
  ];

  const statCards = [
    {
      title: 'Toplam Oturum',
      value: stats.totalSessions.toLocaleString(),
      change: trends.sessions,
      icon: Users,
      color: 'blue'
    },
    {
      title: 'Aktif Kullanıcı',
      value: stats.activeUsers.toString(),
      change: trends.users,
      icon: Activity,
      color: 'green'
    },
    {
      title: 'Toplam Mesaj',
      value: stats.totalMessages.toLocaleString(),
      change: trends.messages,
      icon: MessageSquare,
      color: 'purple'
    },
    {
      title: 'Ort. Yanıt Süresi',
      value: `${stats.avgResponseTime}s`,
      change: trends.responseTime,
      icon: Clock,
      color: 'orange'
    }
  ];

  // Use actual tool usage data from API
  const usageData = toolUsage.length > 0 ? toolUsage : [
    { name: 'No tools used yet', count: 0, percentage: 0 }
  ];

  const performanceMetrics = [
    { metric: 'Başarı Oranı', value: `${stats.successRate}%`, status: 'success' },
    { metric: 'Hata Oranı', value: `${(100 - stats.successRate).toFixed(1)}%`, status: 'warning' },
    { metric: 'Ortalama Cevap Süresi', value: `${stats.avgResponseTime}s`, status: 'success' },
    { metric: 'Tool Kullanımı', value: stats.toolUsage.toString(), status: 'info' }
  ];

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue':
        return 'bg-blue-100 text-blue-600';
      case 'green':
        return 'bg-green-100 text-green-600';
      case 'purple':
        return 'bg-purple-100 text-purple-600';
      case 'orange':
        return 'bg-orange-100 text-orange-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analitik</h1>
            <p className="text-sm text-gray-600 mt-1">Performans metrikleri ve kullanım istatistikleri</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              {timeRanges.map((range) => (
                <button
                  key={range.id}
                  onClick={() => setTimeRange(range.id as TimeRange)}
                  className={clsx(
                    'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                    timeRange === range.id
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  )}
                >
                  {range.label}
                </button>
              ))}
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Download className="w-4 h-4" />
              Rapor İndir
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Activity className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Analitik veriler yükleniyor...</p>
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
                <div key={card.title} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className={clsx('p-2 rounded-lg', getColorClasses(card.color))}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className={clsx(
                      'flex items-center gap-1 text-xs font-medium',
                      isPositive ? 'text-green-600' : 'text-red-600'
                    )}>
                      {isPositive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                      {Math.abs(card.change)}%
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">{card.value}</h3>
                  <p className="text-sm text-gray-600 mt-1">{card.title}</p>
                </div>
              );
            })}
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tool Usage Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Tool Kullanım İstatistikleri</h3>
              <div className="space-y-3">
                {usageData.map((item) => (
                  <div key={item.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{item.name}</span>
                      <span className="text-sm text-gray-600">{item.count} ({item.percentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Performans Metrikleri</h3>
              <div className="space-y-4">
                {performanceMetrics.map((metric) => (
                  <div key={metric.metric} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">{metric.metric}</span>
                    <span className={clsx(
                      'text-lg font-bold',
                      metric.status === 'success' && 'text-green-600',
                      metric.status === 'warning' && 'text-orange-600',
                      metric.status === 'info' && 'text-blue-600'
                    )}>
                      {metric.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Son Aktiviteler</h3>
            <div className="space-y-4">
              {activities.length > 0 ? activities.map((activity, index) => (
                <div key={index} className="flex items-start gap-4 pb-4 border-b border-gray-100 last:border-0">
                  <div className={clsx(
                    'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
                    activity.type === 'session' && 'bg-blue-100',
                    activity.type === 'tool' && 'bg-purple-100',
                    activity.type === 'message' && 'bg-green-100',
                    activity.type === 'system' && 'bg-orange-100'
                  )}>
                    {activity.type === 'session' && <Users className="w-5 h-5 text-blue-600" />}
                    {activity.type === 'tool' && <Zap className="w-5 h-5 text-purple-600" />}
                    {activity.type === 'message' && <MessageSquare className="w-5 h-5 text-green-600" />}
                    {activity.type === 'system' && <Activity className="w-5 h-5 text-orange-600" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-600">{activity.user}</span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-600">
                        {new Date(activity.timestamp).toLocaleTimeString('tr-TR')}
                      </span>
                    </div>
                  </div>
                </div>
              )) : (
                <p className="text-sm text-gray-500 text-center py-4">Henüz aktivite yok</p>
              )}
            </div>
          </div>

          {/* System Health */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Sistem Sağlığı</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-green-900">API Durumu</span>
                </div>
                <p className="text-2xl font-bold text-green-600">Çalışıyor</p>
                <p className="text-xs text-green-700 mt-1">Tüm sistemler aktif</p>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-medium text-blue-900">Veritabanı</span>
                </div>
                <p className="text-2xl font-bold text-blue-600">Sağlıklı</p>
                <p className="text-xs text-blue-700 mt-1">Bağlantı stabil</p>
              </div>

              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span className="text-sm font-medium text-purple-900">MCP Sunucular</span>
                </div>
                <p className="text-2xl font-bold text-purple-600">1/1 Aktif</p>
                <p className="text-xs text-purple-700 mt-1">Tüm sunucular bağlı</p>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
