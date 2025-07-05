# 🚀 Ollama + MindSphere Kurulum Rehberi (macOS)

Bu rehber, macOS üzerinde Ollama kurulumu ve MindSphere projesi ile entegrasyonu için adım adım talimatlar içerir. Bu sayede tamamen **ücretsiz** ve **yerel** AI sistemi kurabilirsiniz!

## 📋 İçindekiler

1. [Sistem Gereksinimleri](#sistem-gereksinimleri)
2. [Ollama Kurulumu](#ollama-kurulumu)
3. [Model İndirme](#model-i̇ndirme)
4. [MindSphere Entegrasyonu](#mindsphere-entegrasyonu)
5. [Model Yönetimi](#model-yönetimi)
6. [Performans Optimizasyonu](#performans-optimizasyonu)
7. [Sorun Giderme](#sorun-giderme)

---

## 🖥️ Sistem Gereksinimleri

### Minimum Gereksinimler:
- **macOS 10.15** (Catalina) veya üzeri
- **8 GB RAM** (16 GB önerilir)
- **10 GB boş disk alanı** (küçük modeller için)
- **Intel/Apple Silicon** işlemci

### Önerilen Gereksinimler:
- **macOS 12** (Monterey) veya üzeri
- **16 GB+ RAM** (büyük modeller için)
- **50 GB+ boş disk alanı** (birden fazla model için)
- **Apple Silicon (M1/M2/M3)** işlemci

---

## 🔧 Ollama Kurulumu

### Yöntem 1: Homebrew ile Kurulum (Önerilen)

```bash
# Homebrew kurulu değilse önce kurun:
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Ollama'yı kurun:
brew install ollama

# Ollama servisini başlatın:
brew services start ollama
```

### Yöntem 2: Resmi Installer ile Kurulum

1. [Ollama resmi sitesini](https://ollama.com) ziyaret edin
2. **Download for macOS** butonuna tıklayın
3. İndirilen `.dmg` dosyasını açın
4. Ollama'yı Applications klasörüne sürükleyin
5. Spotlight'tan "Ollama" arayarak çalıştırın

### Kurulum Doğrulama

Terminal açıp şu komutu çalıştırın:

```bash
ollama --version
```

Sürüm bilgisi görünüyorsa kurulum başarılıdır!

---

## 📦 Model İndirme

### Önerilen Modeller

#### 🚀 Başlangıç İçin (8-16 GB RAM)
```bash
# Llama 3.1 8B - En popüler ve dengeli model
ollama pull llama3.1:8b

# Mistral 7B - Hızlı ve etkili
ollama pull mistral:7b
```

#### 💪 Güçlü Performans İçin (16+ GB RAM)
```bash
# Llama 3.1 70B - En yüksek kalite
ollama pull llama3.1:70b

# Code Llama - Kod yazma için özel
ollama pull codellama:13b
```

#### 🖼️ Görsel Analiz İçin
```bash
# LLaVA - Görüntü analizi yapabilen model
ollama pull llava:13b
```

### Model Boyutları ve Gereksinimler

| Model | Boyut | RAM Gereksinimi | Kullanım Alanı |
|-------|-------|----------------|-----------------|
| `llama3.1:8b` | ~4.7 GB | 8 GB | Genel amaçlı, hızlı |
| `mistral:7b` | ~4.1 GB | 8 GB | Hızlı yanıtlar |
| `llama3.1:70b` | ~40 GB | 64 GB | En yüksek kalite |
| `codellama:13b` | ~7.3 GB | 16 GB | Kod yazma |
| `llava:13b` | ~7.3 GB | 16 GB | Görüntü analizi |

---

## 🔗 MindSphere Entegrasyonu

### 1. Ollama Servisini Başlatma

```bash
# Ollama'yı arka planda çalıştırın:
ollama serve
```

**Not:** Bu komut terminali açık tutacaktır. Arka planda çalıştırmak için:

```bash
# macOS için LaunchAgent olarak çalıştırma:
brew services start ollama
```

### 2. MindSphere Konfigürasyonu

MindSphere projesindeki `.env` dosyasında:

```env
OLLAMA_URL=http://localhost:11434
```

**Bu ayar zaten projenizde mevcut!** Ekstra konfigürasyon gerekmez.

### 3. Bağlantı Testi

1. MindSphere uygulamasını başlatın:
   ```bash
   npm run dev
   ```

2. Tarayıcıda `http://localhost:8000/preferences` adresine gidin

3. **AI Providers** sekmesine tıklayın

4. **Local LLM (Ollama)** kartında şu bilgileri görmelisiniz:
   - ✅ **Online** durumu
   - 🔢 İndirdiğiniz model sayısı
   - 🚀 **No API key required!** yazısı

### 4. Test Etme

1. AI Providers sayfasında Local LLM kartında **"Test Connection"** butonuna tıklayın

2. Başarılı olursa:
   ```
   ✅ Connection successful!
   local_llm API key is working. Response time: XXXms
   ```

---

## 🎛️ Model Yönetimi

### Yüklü Modelleri Listeleme
```bash
ollama list
```

### Model İndirme
```bash
# Yeni model indirme:
ollama pull [model-adı]

# Örnek:
ollama pull phi3:mini
```

### Model Silme
```bash
# Gereksiz modelleri silme:
ollama rm [model-adı]

# Örnek:
ollama rm llama2:7b
```

### Model Detayları
```bash
# Model bilgilerini görme:
ollama show [model-adı]

# Örnek:
ollama show llama3.1:8b
```

### Disk Alanı Temizleme

```bash
# Kullanılmayan modelleri temizleme:
ollama prune

# Tüm cache'i temizleme:
rm -rf ~/.ollama/models/manifests/*
```

---

## ⚡ Performans Optimizasyonu

### 1. RAM Optimizasyonu

**Küçük modeller için (8 GB RAM):**
```bash
# Sadece küçük modelleri kullanın:
ollama pull llama3.1:8b
ollama pull mistral:7b
```

**Büyük modeller için (16+ GB RAM):**
```bash
# Büyük modelleri çalıştırırken diğer uygulamaları kapatın
ollama pull llama3.1:70b
```

### 2. CPU/GPU Optimizasyonu

Apple Silicon için otomatik GPU ivmelendirilmesi aktiftir. Manuel ayar gerekmez.

### 3. Model Değiştirme

MindSphere'de varsayılan olarak en uygun model otomatik seçilir:
1. `llama3.1:latest`
2. `llama3.1:8b`
3. `llama2:latest`
4. `mistral:latest`

### 4. Bağlantı Optimizasyonu

Ollama'nın her zaman çalışır durumda olması için:

```bash
# System startup'ta otomatik başlatma:
brew services start ollama

# Manuel başlatma:
ollama serve &
```

---

## 🔧 Sorun Giderme

### Problem 1: "Connection failed" Hatası

**Çözüm:**
```bash
# Ollama çalışıyor mu kontrol edin:
ps aux | grep ollama

# Çalışmıyorsa başlatın:
ollama serve

# Veya servis olarak:
brew services start ollama
```

### Problem 2: "No models available" Hatası

**Çözüm:**
```bash
# Model listesini kontrol edin:
ollama list

# Model yoksa indirin:
ollama pull llama3.1:8b
```

### Problem 3: Port Çakışması (11434)

**Port kullanımı kontrol:**
```bash
lsof -i :11434
```

**Farklı port kullanma:**
```bash
# Ollama'yı farklı portta çalıştırma:
OLLAMA_HOST=0.0.0.0:11435 ollama serve
```

**.env dosyasında da güncelleyin:**
```env
OLLAMA_URL=http://localhost:11435
```

### Problem 4: Yavaş Yanıtlar

**Çözümler:**
1. **Daha küçük model kullanın:**
   ```bash
   ollama pull mistral:7b-instruct
   ```

2. **RAM'i kontrol edin:**
   ```bash
   # Bellek kullanımını kontrol:
   memory_pressure
   ```

3. **Diğer uygulamaları kapatın**

### Problem 5: Model İndirme Hatası

**Network sorunları için:**
```bash
# Proxy ayarları:
export HTTP_PROXY=http://proxy:port
export HTTPS_PROXY=http://proxy:port

# DNS ayarları:
sudo dscacheutil -flushcache
```

### Problem 6: MindSphere Provider Offline

**Kontrol adımları:**
1. **Ollama durumunu kontrol:**
   ```bash
   curl http://localhost:11434/api/version
   ```

2. **Model listesini kontrol:**
   ```bash
   curl http://localhost:11434/api/tags
   ```

3. **MindSphere servisini yeniden başlat:**
   ```bash
   # MindSphere dev server'ı yeniden başlatın
   npm run dev
   ```

---

## 🎯 Kullanım Senaryoları

### 1. MindSphere Chat

1. **Dashboard**'a gidin
2. **Chat** sekmesine tıklayın
3. Local LLM otomatik olarak kullanılacak
4. Tamamen ücretsiz ve offline çalışır!

### 2. Journal Analizi

1. **Journal** sayfasına gidin
2. Günlük kaydınızı yazın
3. Local LLM otomatik analiz yapacak
4. Kişisel verileriniz yerel kalır

### 3. Sağlık Verisi İnceleme

1. **Health** verilerinizi girin
2. Local LLM analiz ve öneriler sunar
3. Verileriniz internete çıkmaz

---

## 📊 Model Karşılaştırması

| Özellik | Llama 3.1 8B | Mistral 7B | Llama 3.1 70B |
|---------|---------------|------------|----------------|
| **Hız** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| **Kalite** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **RAM Gereksimi** | 8 GB | 8 GB | 64 GB |
| **Disk Boyutu** | 4.7 GB | 4.1 GB | 40 GB |
| **Türkçe Desteği** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

### Öneri:
- **Başlangıç:** `llama3.1:8b`
- **Hız odaklı:** `mistral:7b`
- **En iyi kalite:** `llama3.1:70b` (güçlü sistem gerekli)

---

## 🚀 Hızlı Başlangıç (5 Dakika)

```bash
# 1. Ollama'yı kurun
brew install ollama

# 2. Ollama'yı başlatın
brew services start ollama

# 3. Model indirin
ollama pull llama3.1:8b

# 4. MindSphere'i başlatın
npm run dev

# 5. Test edin
# http://localhost:8000/preferences → AI Providers → Test Connection
```

**Tebrikler! 🎉 Artık tamamen ücretsiz, yerel AI sisteminiz hazır!**

---

## 📚 Ek Kaynaklar

- [Ollama Resmi Dokümantasyon](https://ollama.com/docs)
- [Model Hub](https://ollama.com/library)
- [MindSphere GitHub Repo](https://github.com/anthropics/mindsphere)

---

## 💡 İpuçları

1. **Multiple Models:** Farklı görevler için farklı modeller kullanabilirsiniz
2. **Updates:** `ollama pull model-name` ile modelleri güncelleyebilirsiniz
3. **Monitoring:** `ollama ps` ile çalışan modelleri görebilirsiniz
4. **Backup:** `~/.ollama/models/` klasörünü yedekleyebilirsiniz

---

**🔒 Güvenlik:** Tüm verileriniz yerel kalır, internete çıkmaz!
**💰 Maliyet:** Tamamen ücretsiz, API limiti yok!
**⚡ Performans:** Apple Silicon'da optimize edilmiş çalışır!