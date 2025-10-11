import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'tr' | 'en';

interface Translations {
  [key: string]: {
    tr: string;
    en: string;
  };
}

const translations: Translations = {
  // Navigation
  'nav.chat': { tr: 'Sohbet', en: 'Chat' },
  'nav.mcp': { tr: 'MCP Sunucular', en: 'MCP Servers' },
  'nav.analytics': { tr: 'Analitik', en: 'Analytics' },
  'nav.settings': { tr: 'Ayarlar', en: 'Settings' },
  'nav.agents': { tr: 'Ajanlar', en: 'Agents' },
  'nav.collapse': { tr: 'Daralt', en: 'Collapse' },
  'nav.chats': { tr: 'Sohbetler', en: 'Chats' },
  'nav.menu': { tr: 'MENÜ', en: 'MENU' },

  // Chat Interface
  'chat.title': { tr: 'AiCoE Asistan', en: 'AiCoE Assistant' },
  'chat.subtitle': { tr: 'IBTech yapay zeka destekli akıllı asistan', en: 'IBTech AI-powered intelligent assistant' },
  'chat.ready': { tr: 'Yapay zeka destekli akıllı asistanınız hazır!', en: 'Your AI-powered intelligent assistant is ready!' },
  'chat.placeholder': { tr: "AiCoE Asistan'a mesaj gönderin...", en: 'Send a message to AiCoE Assistant...' },
  'chat.send': { tr: 'Gönder', en: 'Send' },
  'chat.thinking': { tr: 'Düşünüyor...', en: 'Thinking...' },
  'chat.newChat': { tr: 'Yeni Sohbet', en: 'New Chat' },
  'chat.feature.fast': { tr: 'Hızlı Yanıtlar', en: 'Fast Responses' },
  'chat.feature.smart': { tr: 'Akıllı Analiz', en: 'Smart Analysis' },
  'chat.feature.secure': { tr: 'Güvenli', en: 'Secure' },

  // Chat Prompts - Default
  'chat.prompt.help': { tr: 'Bugün size nasıl yardımcı olabilirim?', en: 'How can I help you today?' },
  'chat.prompt.capabilities': { tr: 'Yetenekleriniz nelerdir?', en: 'What are your capabilities?' },
  'chat.prompt.features': { tr: 'Özelliklerinizden bahseder misiniz?', en: 'Can you tell me about your features?' },

  // Chat Prompts - Planner
  'chat.prompt.planner.1': { tr: 'Yapay zeka trendleri için bir araştırma planı oluşturmama yardım et', en: 'Help me create a research plan for AI trends' },
  'chat.prompt.planner.2': { tr: 'Rekabet analizi yapmak için en iyi yaklaşım nedir?', en: "What's the best approach for competitive analysis?" },
  'chat.prompt.planner.3': { tr: 'Yenilenebilir enerji teknolojileri hakkında kapsamlı bir çalışma planla', en: 'Plan a comprehensive study on renewable energy technologies' },

  // Chat Prompts - Search
  'chat.prompt.search.1': { tr: 'Kuantum bilişimdeki son gelişmeleri ara', en: 'Search for recent developments in quantum computing' },
  'chat.prompt.search.2': { tr: 'Sürdürülebilir iş uygulamaları hakkında bilgi bul', en: 'Find information about sustainable business practices' },
  'chat.prompt.search.3': { tr: 'Uzaktan çalışma teknolojilerindeki güncel trendleri araştır', en: 'Research current trends in remote work technologies' },

  // Chat Prompts - Writer
  'chat.prompt.writer.1': { tr: 'Dijital dönüşüm hakkında kapsamlı bir rapor yaz', en: 'Write a comprehensive report on digital transformation' },
  'chat.prompt.writer.2': { tr: 'Pazar araştırması bulgularının yönetici özeti oluştur', en: 'Create an executive summary of market research findings' },
  'chat.prompt.writer.3': { tr: "Yeni API'miz için teknik dokümantasyon hazırla", en: 'Prepare technical documentation for our new API' },

  // Chat Prompts - Triage
  'chat.prompt.triage.1': { tr: 'Karmaşık bir araştırma projesinde yardıma ihtiyacım var', en: 'I need help with a complex research project' },
  'chat.prompt.triage.2': { tr: 'Bazı iş verilerini analiz edebilir misin?', en: 'Can you analyze some business data?' },
  'chat.prompt.triage.3': { tr: 'Pazar trendleri hakkında detaylı bir rapor oluşturmak istiyorum', en: 'I want to create a detailed report on market trends' },

  // Chat Prompts - Customer Service
  'chat.prompt.cs.1': { tr: 'Faturalandırma hakkında bir sorum var', en: 'I have a question about billing' },
  'chat.prompt.cs.2': { tr: 'Teknik sorunlar yaşıyorum', en: "I'm experiencing technical issues" },
  'chat.prompt.cs.3': { tr: 'Hizmetlerinizi anlamama yardımcı olabilir misiniz?', en: 'Can you help me understand your services?' },

  // MCP Server
  'mcp.title': { tr: 'MCP Sunucular', en: 'MCP Servers' },
  'mcp.addServer': { tr: 'Sunucu Ekle', en: 'Add Server' },
  'mcp.serverName': { tr: 'Sunucu Adı', en: 'Server Name' },
  'mcp.serverUrl': { tr: 'Sunucu URL', en: 'Server URL' },
  'mcp.discover': { tr: 'MCP araçlarını keşfet', en: 'Discover MCP tools' },
  'mcp.refresh': { tr: 'Yenile', en: 'Refresh' },
  'mcp.delete': { tr: 'Sil', en: 'Delete' },
  'mcp.tools': { tr: 'araç', en: 'tools' },
  'mcp.active': { tr: 'aktif', en: 'active' },

  // Analytics
  'analytics.title': { tr: 'Analitik', en: 'Analytics' },
  'analytics.subtitle': { tr: 'Performans metrikleri ve kullanım istatistikleri', en: 'Performance metrics and usage statistics' },
  'analytics.totalSessions': { tr: 'Toplam Oturum', en: 'Total Sessions' },
  'analytics.activeUsers': { tr: 'Aktif Kullanıcı', en: 'Active Users' },
  'analytics.totalMessages': { tr: 'Toplam Mesaj', en: 'Total Messages' },
  'analytics.avgResponseTime': { tr: 'Ort. Yanıt Süresi', en: 'Avg. Response Time' },
  'analytics.downloadReport': { tr: 'Rapor İndir', en: 'Download Report' },
  'analytics.loading': { tr: 'Analitik veriler yükleniyor...', en: 'Loading analytics data...' },
  'analytics.toolUsageStats': { tr: 'Tool Kullanım İstatistikleri', en: 'Tool Usage Statistics' },
  'analytics.performanceMetrics': { tr: 'Performans Metrikleri', en: 'Performance Metrics' },
  'analytics.recentActivities': { tr: 'Son Aktiviteler', en: 'Recent Activities' },
  'analytics.systemHealth': { tr: 'Sistem Sağlığı', en: 'System Health' },
  'analytics.noToolsYet': { tr: 'Henüz kullanılmış tool yok', en: 'No tools used yet' },
  'analytics.noActivities': { tr: 'Henüz aktivite yok', en: 'No activities yet' },

  // Analytics - Time Ranges
  'analytics.time.24h': { tr: 'Son 24 Saat', en: 'Last 24 Hours' },
  'analytics.time.7d': { tr: 'Son 7 Gün', en: 'Last 7 Days' },
  'analytics.time.30d': { tr: 'Son 30 Gün', en: 'Last 30 Days' },
  'analytics.time.90d': { tr: 'Son 90 Gün', en: 'Last 90 Days' },

  // Analytics - Metrics
  'analytics.metric.successRate': { tr: 'Başarı Oranı', en: 'Success Rate' },
  'analytics.metric.errorRate': { tr: 'Hata Oranı', en: 'Error Rate' },
  'analytics.metric.avgResponse': { tr: 'Ortalama Cevap Süresi', en: 'Average Response Time' },
  'analytics.metric.toolUsage': { tr: 'Tool Kullanımı', en: 'Tool Usage' },

  // Analytics - System Health
  'analytics.health.api': { tr: 'API Durumu', en: 'API Status' },
  'analytics.health.database': { tr: 'Veritabanı', en: 'Database' },
  'analytics.health.mcpServers': { tr: 'MCP Sunucular', en: 'MCP Servers' },
  'analytics.health.running': { tr: 'Çalışıyor', en: 'Running' },
  'analytics.health.healthy': { tr: 'Sağlıklı', en: 'Healthy' },
  'analytics.health.allActive': { tr: 'Tüm sistemler aktif', en: 'All systems active' },
  'analytics.health.stable': { tr: 'Bağlantı stabil', en: 'Connection stable' },
  'analytics.health.connected': { tr: 'Tüm sunucular bağlı', en: 'All servers connected' },
  'analytics.health.active': { tr: 'Aktif', en: 'Active' },

  // Settings
  'settings.title': { tr: 'Ayarlar', en: 'Settings' },
  'settings.subtitle': { tr: 'Sistem yapılandırması ve kullanıcı tercihleri', en: 'System configuration and user preferences' },
  'settings.general': { tr: 'Genel', en: 'General' },
  'settings.api': { tr: 'API Ayarları', en: 'API Settings' },
  'settings.notifications': { tr: 'Bildirimler', en: 'Notifications' },
  'settings.security': { tr: 'Güvenlik', en: 'Security' },
  'settings.appearance': { tr: 'Görünüm', en: 'Appearance' },
  'settings.language': { tr: 'Dil', en: 'Language' },
  'settings.timezone': { tr: 'Saat Dilimi', en: 'Timezone' },
  'settings.autoSave': { tr: 'Otomatik Kaydetme', en: 'Auto Save' },
  'settings.autoSave.desc': { tr: 'Değişiklikleri otomatik olarak kaydet', en: 'Automatically save changes' },
  'settings.theme': { tr: 'Tema', en: 'Theme' },
  'settings.theme.light': { tr: 'Açık Tema', en: 'Light Theme' },
  'settings.theme.dark': { tr: 'Koyu Tema', en: 'Dark Theme' },
  'settings.compactMode': { tr: 'Kompakt Mod', en: 'Compact Mode' },
  'settings.compactMode.desc': { tr: 'Daha fazla içerik göster', en: 'Show more content' },
  'settings.animations': { tr: 'Animasyonlar', en: 'Animations' },
  'settings.animations.desc': { tr: 'Geçiş animasyonlarını göster', en: 'Show transition animations' },
  'settings.save': { tr: 'Kaydet', en: 'Save' },
  'settings.reset': { tr: 'Sıfırla', en: 'Reset' },
  'settings.saving': { tr: 'Kaydediliyor...', en: 'Saving...' },
  'settings.saved': { tr: 'Kaydedildi', en: 'Saved' },

  // Settings - API
  'settings.api.key': { tr: 'OpenAI API Key', en: 'OpenAI API Key' },
  'settings.api.key.desc': { tr: 'API anahtarınız güvenli bir şekilde saklanır', en: 'Your API key is stored securely' },
  'settings.api.timeout': { tr: 'API Timeout (saniye)', en: 'API Timeout (seconds)' },
  'settings.api.maxRetries': { tr: 'Maksimum Tekrar Denemesi', en: 'Maximum Retries' },
  'settings.api.status': { tr: 'API Durumu', en: 'API Status' },
  'settings.api.status.active': { tr: 'Bağlantı aktif ve çalışıyor', en: 'Connection active and working' },

  // Settings - Notifications
  'settings.notif.email': { tr: 'E-posta Bildirimleri', en: 'Email Notifications' },
  'settings.notif.email.desc': { tr: 'Önemli olaylar için e-posta gönder', en: 'Send email for important events' },
  'settings.notif.desktop': { tr: 'Masaüstü Bildirimleri', en: 'Desktop Notifications' },
  'settings.notif.desktop.desc': { tr: 'Tarayıcı bildirimlerini etkinleştir', en: 'Enable browser notifications' },
  'settings.notif.session': { tr: 'Oturum Uyarıları', en: 'Session Alerts' },
  'settings.notif.session.desc': { tr: 'Oturum olayları için bildirim al', en: 'Receive notifications for session events' },

  // Settings - Security
  'settings.security.2fa': { tr: 'İki Faktörlü Kimlik Doğrulama', en: 'Two-Factor Authentication' },
  'settings.security.2fa.desc': { tr: 'Ekstra güvenlik katmanı ekle', en: 'Add extra security layer' },
  'settings.security.timeout': { tr: 'Oturum Zaman Aşımı (dakika)', en: 'Session Timeout (minutes)' },
  'settings.security.ipWhitelist': { tr: 'IP Beyaz Listesi', en: 'IP Whitelist' },
  'settings.security.ipWhitelist.desc': { tr: 'Her satıra bir IP adresi veya CIDR bloğu', en: 'One IP address or CIDR block per line' },

  // Common
  'common.loading': { tr: 'Yükleniyor...', en: 'Loading...' },
  'common.error': { tr: 'Hata', en: 'Error' },
  'common.success': { tr: 'Başarılı', en: 'Success' },
  'common.cancel': { tr: 'İptal', en: 'Cancel' },
  'common.confirm': { tr: 'Onayla', en: 'Confirm' },
  'common.delete': { tr: 'Sil', en: 'Delete' },
  'common.edit': { tr: 'Düzenle', en: 'Edit' },
  'common.add': { tr: 'Ekle', en: 'Add' },
  'common.search': { tr: 'Ara', en: 'Search' },
  'common.filter': { tr: 'Filtrele', en: 'Filter' },
  'common.close': { tr: 'Kapat', en: 'Close' },
  'common.refresh': { tr: 'Yenile', en: 'Refresh' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('language') as Language;
    return saved || 'tr';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    return translations[key]?.[language] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};
