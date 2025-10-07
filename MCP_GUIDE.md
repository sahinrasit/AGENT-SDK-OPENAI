# MCP Server Kullanım Kılavuzu

## MCP Nedir?

Model Context Protocol (MCP), AI uygulamalarının araçlar ve bağlam ile bağlantı kurması için standart bir protokoldür.

## MCP Server Tipleri

### 1. **Hosted MCP** (Önerilen - Odeabank için)
- Model tarafından **direkt çağrılır**
- Sunucu URL'si OpenAI API'ye gönderilir
- Toollar **runtime'da** model tarafından keşfedilir
- **Backend bağlantısı gerektirmez**

**Ne zaman kullanılır:**
- Odeabank gibi bulut tabanlı MCP servisleri için
- Model'in direkt erişebileceği public API'ler için

**Odeabank Örneği:**
```json
{
  "name": "odeabank",
  "type": "hosted",
  "serverLabel": "odeabank",
  "serverUrl": "https://mcp.cloud.odeabank.com.tr/mcp/sse"
}
```

### 2. **HTTP MCP**
- Backend sunucumuz MCP sunucusuna **HTTP ile bağlanır**
- Toollar startup'ta listelenir
- Backend sürekli bağlantı tutar

**Ne zaman kullanılır:**
- Kendi sunucunuzda çalışan MCP servisleri için
- Local network'te çalışan servisler için

**Örnek:**
```json
{
  "name": "my-http-server",
  "type": "http",
  "url": "http://localhost:8080/mcp"
}
```

### 3. **Stdio MCP** (Henüz desteklenmiyor)
- Lokalde komut satırı olarak çalışan MCP sunucuları
- Örnek: `npx @modelcontextprotocol/server-filesystem`

## UI'dan MCP Ekleme

1. **MCP Servers** sayfasına gidin
2. **Add Server** butonuna tıklayın
3. Formu doldurun:
   - **Name**: Server adı (örn: `odeabank`)
   - **Type**: `Hosted` veya `HTTP` seçin
   - **Hosted ise**:
     - Server Label: Server etiketi (örn: `odeabank`)
     - Server URL: MCP sunucu URL'i
   - **HTTP ise**:
     - URL: HTTP endpoint URL'i

4. **Submit** edin

## Odeabank MCP Ekleme

**Doğru Konfigürasyon:**
```
Name: odeabank
Type: Hosted
Server Label: odeabank
Server URL: https://mcp.cloud.odeabank.com.tr/mcp/sse
```

⚠️ **DİKKAT**: Odeabank için **Hosted** tipi seçilmelidir, HTTP değil!

## Toolların Keşfedilmesi

### Hosted MCP (Odeabank)
- Toollar **agent ilk çalıştığında** model tarafından keşfedilir
- Dashboard'da başlangıçta "Tools will be discovered when first used" gösterilir
- Chat'te bir soru sorduğunuzda toollar otomatik keşfedilir
- Keşfedilen toollar `mcpToolRegistry`'e cache'lenir

### HTTP MCP
- Toollar **backend startup'ta** listelenir
- Hemen dashboard'da görünür
- Daha hızlı başlangıç

## Sorun Giderme

### "HTTP 405 Error"
- **Neden**: Hosted MCP'yi HTTP olarak eklemeye çalıştınız
- **Çözüm**: Server tipini "Hosted" olarak değiştirin

### "Tools showing 0"
- **Hosted MCP için**: Normal, agent çalışana kadar toollar keşfedilemez
- **HTTP MCP için**: Backend bağlantı sorunu olabilir

### "Invalid URL"
- URL formatını kontrol edin (`https://` ile başlamalı)
- Hosted için `serverUrl`, HTTP için `url` alanını doldurun

## mcp.json Formatı

Sistem `mcp.json` dosyasından konfigürasyon okur:

```json
{
  "servers": [
    {
      "name": "odeabank",
      "type": "hosted",
      "serverLabel": "odeabank",
      "serverUrl": "https://mcp.cloud.odeabank.com.tr/mcp/sse"
    },
    {
      "name": "my-local-mcp",
      "type": "http",
      "url": "http://localhost:8080/mcp"
    }
  ]
}
```

## Kaynaklar

- [OpenAI Agents SDK](https://github.com/openai/openai-agents-js)
- [MCP Dokümantasyonu](https://openai.github.io/openai-agents-js/guides/mcp/)
