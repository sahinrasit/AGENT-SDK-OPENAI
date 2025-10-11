import React, { useState, useEffect } from 'react';
import {
  Settings,
  Key,
  Bell,
  Shield,
  Palette,
  Globe,
  Database,
  Save,
  RefreshCw,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { clsx } from 'clsx';
import { useLanguage } from '../../contexts/LanguageContext';

interface SettingsPanelProps {}

type SettingsTab = 'general' | 'api' | 'notifications' | 'security' | 'appearance';

export const SettingsPanel: React.FC<SettingsPanelProps> = () => {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [loading, setLoading] = useState(true);

  // Settings state
  const [settings, setSettings] = useState({
    // General
    language: 'tr',
    timezone: 'Europe/Istanbul',
    autoSave: true,

    // API
    openaiApiKey: '',
    apiTimeout: 30,
    maxRetries: 3,

    // Notifications
    emailNotifications: true,
    desktopNotifications: false,
    sessionAlerts: true,

    // Security
    twoFactorAuth: false,
    sessionTimeout: 30,
    ipWhitelist: '',

    // Appearance
    theme: 'light',
    compactMode: false,
    animations: true
  });

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/settings');
      const data = await response.json();

      // Flatten the nested structure
      setSettings({
        language: data.general?.language || 'tr',
        timezone: data.general?.timezone || 'Europe/Istanbul',
        autoSave: data.general?.autoSave ?? true,
        openaiApiKey: data.api?.openaiApiKey || '',
        apiTimeout: data.api?.apiTimeout || 30,
        maxRetries: data.api?.maxRetries || 3,
        emailNotifications: data.notifications?.emailNotifications ?? true,
        desktopNotifications: data.notifications?.desktopNotifications ?? false,
        sessionAlerts: data.notifications?.sessionAlerts ?? true,
        twoFactorAuth: data.security?.twoFactorAuth ?? false,
        sessionTimeout: data.security?.sessionTimeout || 30,
        ipWhitelist: data.security?.ipWhitelist || '',
        theme: data.appearance?.theme || 'light',
        compactMode: data.appearance?.compactMode ?? false,
        animations: data.appearance?.animations ?? true
      });
    } catch (error) {
      console.error('Failed to load settings:', error);
      setSaveStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'general', name: t('settings.general'), icon: Settings },
    { id: 'api', name: t('settings.api'), icon: Key },
    { id: 'notifications', name: t('settings.notifications'), icon: Bell },
    { id: 'security', name: t('settings.security'), icon: Shield },
    { id: 'appearance', name: t('settings.appearance'), icon: Palette }
  ];

  const handleSave = async () => {
    try {
      setSaveStatus('saving');

      // Convert flat structure back to nested
      const payload = {
        general: {
          language: settings.language,
          timezone: settings.timezone,
          autoSave: settings.autoSave
        },
        api: {
          openaiApiKey: settings.openaiApiKey,
          apiTimeout: settings.apiTimeout,
          maxRetries: settings.maxRetries
        },
        notifications: {
          emailNotifications: settings.emailNotifications,
          desktopNotifications: settings.desktopNotifications,
          sessionAlerts: settings.sessionAlerts
        },
        security: {
          twoFactorAuth: settings.twoFactorAuth,
          sessionTimeout: settings.sessionTimeout,
          ipWhitelist: settings.ipWhitelist
        },
        appearance: {
          theme: settings.theme,
          compactMode: settings.compactMode,
          animations: settings.animations
        }
      };

      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleReset = async () => {
    if (confirm('Ayarları varsayılana döndürmek istediğinize emin misiniz?')) {
      try {
        setSaveStatus('saving');

        const response = await fetch('/api/settings/reset', {
          method: 'POST'
        });

        if (!response.ok) {
          throw new Error('Failed to reset settings');
        }

        // Reload settings from backend
        await loadSettings();
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (error) {
        console.error('Failed to reset settings:', error);
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Dil
              </label>
              <select
                value={settings.language}
                onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="tr">Türkçe</option>
                <option value="en">English</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Saat Dilimi
              </label>
              <select
                value={settings.timezone}
                onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Europe/Istanbul">Europe/Istanbul (GMT+3)</option>
                <option value="UTC">UTC (GMT+0)</option>
                <option value="America/New_York">America/New_York (GMT-5)</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Otomatik Kaydetme</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Değişiklikleri otomatik olarak kaydet</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, autoSave: !settings.autoSave })}
                className={clsx(
                  'w-12 h-6 rounded-full relative transition-colors',
                  settings.autoSave ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'
                )}
              >
                <div className={clsx(
                  'w-4 h-4 bg-white rounded-full absolute top-1 transition-transform duration-200',
                  settings.autoSave ? 'translate-x-7' : 'translate-x-1'
                )} />
              </button>
            </div>
          </div>
        );

      case 'api':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                OpenAI API Key
              </label>
              <input
                type="password"
                value={settings.openaiApiKey}
                onChange={(e) => setSettings({ ...settings, openaiApiKey: e.target.value })}
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                placeholder="sk-..."
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">API anahtarınız güvenli bir şekilde saklanır</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                API Timeout (saniye)
              </label>
              <input
                type="number"
                value={settings.apiTimeout}
                onChange={(e) => setSettings({ ...settings, apiTimeout: parseInt(e.target.value) })}
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="5"
                max="120"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Maksimum Tekrar Denemesi
              </label>
              <input
                type="number"
                value={settings.maxRetries}
                onChange={(e) => setSettings({ ...settings, maxRetries: parseInt(e.target.value) })}
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="0"
                max="10"
              />
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900 dark:text-blue-300">API Durumu</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">Bağlantı aktif ve çalışıyor</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">E-posta Bildirimleri</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Önemli olaylar için e-posta gönder</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, emailNotifications: !settings.emailNotifications })}
                className={clsx(
                  'w-12 h-6 rounded-full relative transition-colors',
                  settings.emailNotifications ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'
                )}
              >
                <div className={clsx(
                  'w-4 h-4 bg-white rounded-full absolute top-1 transition-transform duration-200',
                  settings.emailNotifications ? 'translate-x-7' : 'translate-x-1'
                )} />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Masaüstü Bildirimleri</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Tarayıcı bildirimlerini etkinleştir</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, desktopNotifications: !settings.desktopNotifications })}
                className={clsx(
                  'w-12 h-6 rounded-full relative transition-colors',
                  settings.desktopNotifications ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'
                )}
              >
                <div className={clsx(
                  'w-4 h-4 bg-white rounded-full absolute top-1 transition-transform duration-200',
                  settings.desktopNotifications ? 'translate-x-7' : 'translate-x-1'
                )} />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Oturum Uyarıları</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Oturum olayları için bildirim al</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, sessionAlerts: !settings.sessionAlerts })}
                className={clsx(
                  'w-12 h-6 rounded-full relative transition-colors',
                  settings.sessionAlerts ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'
                )}
              >
                <div className={clsx(
                  'w-4 h-4 bg-white rounded-full absolute top-1 transition-transform duration-200',
                  settings.sessionAlerts ? 'translate-x-7' : 'translate-x-1'
                )} />
              </button>
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">İki Faktörlü Kimlik Doğrulama</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Ekstra güvenlik katmanı ekle</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, twoFactorAuth: !settings.twoFactorAuth })}
                className={clsx(
                  'w-12 h-6 rounded-full relative transition-colors',
                  settings.twoFactorAuth ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'
                )}
              >
                <div className={clsx(
                  'w-4 h-4 bg-white rounded-full absolute top-1 transition-transform duration-200',
                  settings.twoFactorAuth ? 'translate-x-7' : 'translate-x-1'
                )} />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Oturum Zaman Aşımı (dakika)
              </label>
              <input
                type="number"
                value={settings.sessionTimeout}
                onChange={(e) => setSettings({ ...settings, sessionTimeout: parseInt(e.target.value) })}
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="5"
                max="1440"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                IP Beyaz Listesi
              </label>
              <textarea
                value={settings.ipWhitelist}
                onChange={(e) => setSettings({ ...settings, ipWhitelist: e.target.value })}
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                rows={4}
                placeholder="192.168.1.1&#10;10.0.0.0/8"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Her satıra bir IP adresi veya CIDR bloğu</p>
            </div>
          </div>
        );

      case 'appearance':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tema
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSettings({ ...settings, theme: 'light' })}
                  className={clsx(
                    'p-4 rounded-lg border-2 transition-all',
                    settings.theme === 'light'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  )}
                >
                  <div className="w-full h-20 bg-white rounded border border-gray-200 mb-2"></div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Açık Tema</p>
                </button>
                <button
                  onClick={() => setSettings({ ...settings, theme: 'dark' })}
                  className={clsx(
                    'p-4 rounded-lg border-2 transition-all',
                    settings.theme === 'dark'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  )}
                >
                  <div className="w-full h-20 bg-gray-800 rounded border border-gray-700 mb-2"></div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Koyu Tema</p>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Kompakt Mod</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Daha fazla içerik göster</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, compactMode: !settings.compactMode })}
                className={clsx(
                  'w-12 h-6 rounded-full relative transition-colors',
                  settings.compactMode ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'
                )}
              >
                <div className={clsx(
                  'w-4 h-4 bg-white rounded-full absolute top-1 transition-transform duration-200',
                  settings.compactMode ? 'translate-x-7' : 'translate-x-1'
                )} />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Animasyonlar</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Geçiş animasyonlarını göster</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, animations: !settings.animations })}
                className={clsx(
                  'w-12 h-6 rounded-full relative transition-colors',
                  settings.animations ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'
                )}
              >
                <div className={clsx(
                  'w-4 h-4 bg-white rounded-full absolute top-1 transition-transform duration-200',
                  settings.animations ? 'translate-x-7' : 'translate-x-1'
                )} />
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ayarlar</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Sistem yapılandırması ve kullanıcı tercihleri</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Sıfırla
            </button>
            <button
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-lg transition-all',
                saveStatus === 'saved'
                  ? 'bg-green-600 text-white'
                  : 'bg-blue-600 text-white hover:bg-blue-700',
                saveStatus === 'saving' && 'opacity-75 cursor-wait'
              )}
            >
              {saveStatus === 'saving' ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Kaydediliyor...
                </>
              ) : saveStatus === 'saved' ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Kaydedildi
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Kaydet
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
          <nav className="p-4 space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as SettingsTab)}
                  className={clsx(
                    'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left',
                    activeTab === tab.id
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-3xl">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
              </div>
            ) : (
              renderTabContent()
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
