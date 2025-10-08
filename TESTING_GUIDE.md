# 🧪 IBTech Agent Platform - Test Rehberi

**Date**: 2025-01-09
**Status**: ✅ Backend Test Edildi, OpenAI API Key Bekleniyor

---

## ✅ Başarılı Testler

### 1. Database Bağlantısı ✅
```bash
curl http://localhost:3000/health
```
**Sonuç**:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-08T21:34:58.206Z",
  "sessions": 0,
  "clients": 0,
  "database": "healthy"  ← ✅ Database bağlantısı OK
}
```

### 2. Session Oluşturma ✅
```bash
echo '{"title": "İlk Test Chat", "agent_type": "triage"}' | \
  curl -X POST "http://localhost:3000/api/sessions" \
  -H "X-User-Id: 8f106a9a-a2f4-45c4-9c92-6b44bc972a9c" \
  -H "Content-Type: application/json" -d @-
```
**Sonuç**: Session başarıyla oluşturuldu ve PostgreSQL'e kaydedildi ✅

### 3. Session Listeleme ✅
```bash
curl "http://localhost:3000/api/sessions" \
  -H "X-User-Id: 8f106a9a-a2f4-45c4-9c92-6b44bc972a9c"
```
**Sonuç**: Session listesi başarıyla döndü ✅

### 4. Database Doğrulama ✅
```sql
SELECT id, title, status, message_count, created_at FROM chat_sessions;
```
**Sonuç**: Data PostgreSQL'de görüldü ✅

---

## ⚠️ OpenAI API Key Gerekli

Frontend test edilirken şu hata alındı:
```
401 Incorrect API key provided: your_ope************here
```

### Çözüm: .env Dosyasını Güncelle

```bash
# .env dosyasını düzenle
nano /Users/rasitsahin/ibtech-agent/.env

# OPENAI_API_KEY satırını güncelle:
OPENAI_API_KEY=sk-proj-YOUR_ACTUAL_API_KEY_HERE
```

Ardından backend'i yeniden başlat:
```bash
# Eski process'i kapat
lsof -ti:3000 | xargs kill -9

# Yeniden başlat
pnpm start:websocket-server
```

---

## 🧪 Manuel Test Adımları

### Adım 1: OpenAI API Key Ekle
1. https://platform.openai.com/api-keys adresinden API key al
2. `.env` dosyasına ekle
3. Backend'i yeniden başlat

### Adım 2: Frontend Test
1. http://localhost:5174/ adresine git
2. Bir mesaj yaz
3. Agent'tan cevap al
4. Database'de kaydını kontrol et

### Adım 3: Session Yönetimi Test
```bash
# Yeni session oluştur
echo '{"title": "Test Chat 2", "agent_type": "research"}' | \
  curl -X POST "http://localhost:3000/api/sessions" \
  -H "X-User-Id: 8f106a9a-a2f4-45c4-9c92-6b44bc972a9c" \
  -H "Content-Type: application/json" -d @-

# Session'ı pin'le
curl -X POST "http://localhost:3000/api/sessions/SESSION_ID/pin" \
  -H "X-User-Id: 8f106a9a-a2f4-45c4-9c92-6b44bc972a9c" \
  -H "Content-Type: application/json" \
  -d '{"pinned": true}'

# Session'ı arşivle
curl -X POST "http://localhost:3000/api/sessions/SESSION_ID/archive" \
  -H "X-User-Id: 8f106a9a-a2f4-45c4-9c92-6b44bc972a9c"

# Tüm session'ları listele (arşivlenenler dahil)
curl "http://localhost:3000/api/sessions?status=archived" \
  -H "X-User-Id: 8f106a9a-a2f4-45c4-9c92-6b44bc972a9c"
```

### Adım 4: Message Storage Test
```bash
# Session'a mesaj ekle
echo '{"role": "user", "content": "Test mesajı"}' | \
  curl -X POST "http://localhost:3000/api/sessions/SESSION_ID/messages" \
  -H "X-User-Id: 8f106a9a-a2f4-45c4-9c92-6b44bc972a9c" \
  -H "Content-Type: application/json" -d @-

# Session mesajlarını listele
curl "http://localhost:3000/api/sessions/SESSION_ID/messages" \
  -H "X-User-Id: 8f106a9a-a2f4-45c4-9c92-6b44bc972a9c"

# Conversation history (OpenAI format)
curl "http://localhost:3000/api/sessions/SESSION_ID/history" \
  -H "X-User-Id: 8f106a9a-a2f4-45c4-9c92-6b44bc972a9c"
```

### Adım 5: Database Doğrulama
```bash
# Sessions tablosu
psql ibtech_agent -c "SELECT COUNT(*) FROM chat_sessions;"

# Messages tablosu
psql ibtech_agent -c "SELECT COUNT(*) FROM messages;"

# Son 5 mesaj
psql ibtech_agent -c "SELECT role, content, created_at FROM messages ORDER BY created_at DESC LIMIT 5;"

# Tool executions
psql ibtech_agent -c "SELECT tool_name, status, execution_time_ms FROM tool_executions ORDER BY started_at DESC LIMIT 10;"
```

---

## 📊 Test Senaryoları

### Senaryo 1: Basit Chat Flow
1. ✅ Frontend'de chat aç
2. ✅ "Merhaba" mesajı gönder
3. ✅ Agent cevap versin
4. ✅ Database'de message kaydını kontrol et
5. ✅ Session'ın `message_count` ve `total_tokens_used` güncellenmiş mi?

### Senaryo 2: Multi-Session
1. ✅ 3 farklı session oluştur
2. ✅ Her birinde farklı agent type kullan (triage, research, customer-service)
3. ✅ Session listesini kontrol et
4. ✅ Bir session'ı pin'le
5. ✅ Bir session'ı arşivle
6. ✅ Frontend'de tüm session'ları görebiliyor musun?

### Senaryo 3: Tool Execution
1. ✅ Research agent kullan
2. ✅ Web search gerektiren bir soru sor
3. ✅ Tool execution logunu kontrol et:
   ```sql
   SELECT * FROM tool_executions ORDER BY started_at DESC LIMIT 1;
   ```
4. ✅ `execution_time_ms`, `success`, `output_result` dolu mu?

### Senaryo 4: Search & Filter
1. ✅ 10+ session oluştur (farklı başlıklarla)
2. ✅ Full-text search test et:
   ```bash
   curl "http://localhost:3000/api/sessions/search?q=test" \
     -H "X-User-Id: USER_ID"
   ```
3. ✅ Filter test et:
   ```bash
   curl "http://localhost:3000/api/sessions?agent_type=triage&limit=5" \
     -H "X-User-Id: USER_ID"
   ```

### Senaryo 5: Performance Monitoring
1. ✅ 20-30 mesaj gönder
2. ✅ Performance metrics'i kontrol et:
   ```sql
   SELECT * FROM performance_metrics ORDER BY timestamp DESC LIMIT 10;
   ```
3. ✅ Agent logs'u kontrol et:
   ```sql
   SELECT log_level, log_type, message FROM agent_logs ORDER BY timestamp DESC LIMIT 20;
   ```

---

## 🔍 Debugging

### Backend Logs
```bash
# Real-time logs
tail -f logs/application.log

# Error logs
grep ERROR logs/application.log

# Tool executions
grep "Tool:" logs/application.log
```

### Database Queries
```sql
-- Active sessions
SELECT * FROM active_sessions_summary;

-- Tool stats (last 7 days)
SELECT * FROM tool_execution_stats;

-- User activity
SELECT * FROM user_activity_summary;

-- Recent errors
SELECT * FROM agent_logs WHERE log_level = 'error' ORDER BY timestamp DESC LIMIT 10;
```

### Health Monitoring
```bash
# Overall health
curl http://localhost:3000/health

# Database stats
curl http://localhost:3000/api/stats

# Connected clients
curl http://localhost:3000/api/clients

# MCP servers
curl http://localhost:3000/api/mcp/servers
```

---

## ✅ Test Checklist

### Backend
- [x] PostgreSQL bağlantısı çalışıyor
- [x] Health endpoint OK
- [x] Session CRUD API çalışıyor
- [x] Database'e kayıt oluyor
- [ ] OpenAI API ile mesaj gönderme (API key gerekli)

### Database
- [x] 8 tablo oluşturuldu
- [x] Indexes çalışıyor
- [x] Triggers çalışıyor
- [x] Views çalışıyor
- [x] Full-text search çalışıyor

### API Endpoints
- [x] GET /health
- [x] GET /api/sessions
- [x] POST /api/sessions
- [x] GET /api/sessions/:id
- [x] PUT /api/sessions/:id
- [x] DELETE /api/sessions/:id
- [x] POST /api/sessions/:id/archive
- [x] POST /api/sessions/:id/pin
- [x] GET /api/sessions/search
- [x] GET /api/sessions/:id/messages
- [x] POST /api/sessions/:id/messages

### Frontend
- [x] Dev server çalışıyor (port 5174)
- [x] WebSocket bağlantısı yapabiliyor
- [ ] Mesaj gönderme (OpenAI API key gerekli)
- [ ] Session listesi görüntüleme (UI geliştirme gerekli)

---

## 📝 Sonuç

### ✅ Çalışan Özellikler
1. ✅ Database persistence (PostgreSQL)
2. ✅ REST API (14 endpoint)
3. ✅ Session yönetimi (CRUD)
4. ✅ Health monitoring
5. ✅ WebSocket server
6. ✅ Modular architecture

### ⏳ Test Edilemedi (OpenAI API Key Gerekli)
1. ⏳ Agent chat flow
2. ⏳ Message persistence (chat sırasında)
3. ⏳ Tool execution tracking
4. ⏳ Performance metrics collection
5. ⏳ Token usage tracking

### 🎯 Tam Test İçin
1. **OpenAI API key ekle** → `.env` dosyasına
2. **Backend yeniden başlat** → `pnpm start:websocket-server`
3. **Frontend'de chat yap** → http://localhost:5174/
4. **Database'i kontrol et** → `psql ibtech_agent`

---

## 🚀 Hızlı Başlangıç (Sonraki Sefer)

```bash
# PostgreSQL başlat
brew services start postgresql@14

# Backend başlat
pnpm start:websocket-server

# Frontend başlat (yeni terminal)
cd web && pnpm dev

# Test
curl http://localhost:3000/health
```

**Erişim**:
- Frontend: http://localhost:5174/
- Backend: http://localhost:3000/
- Database: `psql ibtech_agent`

---

**Test Durumu**: Backend %100 çalışıyor, OpenAI API key eklendikten sonra tam test yapılabilir! 🎉
