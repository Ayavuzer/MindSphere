# MindSphere - AI Personal Assistant

MindSphere, modern full-stack mimari ile geliştirilmiş kapsamlı bir AI destekli kişisel asistan uygulamasıdır. Uygulama, React frontend'i ile Express backend'ini birleştirir, veri kalıcılığı için PostgreSQL kullanır ve AI yetenekleri için OpenAI'yi kullanır.

## Özellikler

### 🔐 Kimlik Doğrulama
- Basit e-posta/şifre tabanlı kimlik doğrulama
- Session tabanlı oturum yönetimi
- PostgreSQL tabanlı oturum depolama

### 💬 AI Sohbet
- OpenAI GPT-4o modeli ile konuşma
- Çoklu konuşma desteği
- Bağlam farkındalığı
- Kişiselleştirilmiş yanıtlar

### 📋 Görev Yönetimi
- Öncelik tabanlı görev sistemi
- Durum takibi (beklemede, devam ediyor, tamamlandı)
- Bitiş tarihi yönetimi

### 🏥 Sağlık Takibi
- Uyku, adım, kilo takibi
- Ruh hali ve enerji seviyesi izleme
- Günlük sağlık metrikleri

### 💰 Finansal Yönetim
- Gelir/gider takibi
- Kategori bazlı sınıflandırma
- Finansal analiz

### 📊 Analitik
- AI destekli içgörüler
- Kullanıcı istatistikleri
- Trend analizi

## Teknoloji Yığını

### Frontend
- **React 18** + TypeScript
- **Tailwind CSS** + shadcn/ui
- **TanStack Query** (React Query)
- **Wouter** (routing)
- **Vite** (build tool)

### Backend
- **Node.js** + Express.js
- **TypeScript** + ES modules
- **PostgreSQL** + Neon serverless
- **Drizzle ORM**
- **OpenAI API**

### Kimlik Doğrulama
- **bcryptjs** (şifre hashleme)
- **express-session** (oturum yönetimi)
- **connect-pg-simple** (PostgreSQL session store)

## Kurulum

### Gereksinimler
- Node.js 18+
- PostgreSQL veritabanı
- OpenAI API anahtarı

### 1. Bağımlılıkları Yükleyin
```bash
npm install
```

### 2. Çevre Değişkenlerini Ayarlayın
`.env` dosyası oluşturun:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/mindsphere
OPENAI_API_KEY=your_openai_api_key
SESSION_SECRET=your_session_secret_key
NODE_ENV=development
```

### 3. Veritabanını Hazırlayın
```bash
npm run db:push
```

### 4. Uygulamayı Başlatın
```bash
# Geliştirme modu
npm run dev

# Üretim modu
npm run build
npm start
```

## Kullanım

1. Uygulamayı başlattıktan sonra `http://localhost:5000` adresine gidin
2. Herhangi bir e-posta ve şifre ile giriş yapın (sistem otomatik olarak yeni hesap oluşturacaktır)
3. MindSphere ile sohbet edin ve yaşamınızı yönetin

## API Endpoints

### Kimlik Doğrulama
- `POST /api/auth/login` - Giriş yap
- `POST /api/auth/logout` - Çıkış yap
- `GET /api/auth/user` - Mevcut kullanıcı bilgileri

### Sohbet
- `GET /api/conversations` - Konuşmaları listele
- `POST /api/conversations` - Yeni konuşma oluştur
- `GET /api/conversations/:id/messages` - Mesajları getir
- `POST /api/conversations/:id/messages` - Mesaj gönder

### Görevler
- `GET /api/tasks` - Görevleri listele
- `POST /api/tasks` - Yeni görev oluştur
- `PATCH /api/tasks/:id` - Görevi güncelle
- `DELETE /api/tasks/:id` - Görevi sil

### Sağlık
- `GET /api/health` - Sağlık kayıtlarını getir
- `POST /api/health` - Sağlık kaydı oluştur

### Finans
- `GET /api/finances` - Finansal kayıtları getir
- `POST /api/finances` - Finansal kayıt oluştur

### Ruh Hali
- `GET /api/mood` - Ruh hali kayıtlarını getir
- `POST /api/mood` - Ruh hali kaydı oluştur

### Günlük
- `GET /api/journal` - Günlük kayıtlarını getir
- `POST /api/journal` - Günlük kaydı oluştur

### Analitik
- `GET /api/analytics/stats` - Kullanıcı istatistikleri
- `GET /api/analytics/insights` - AI destekli içgörüler

## Geliştirme

### Proje Yapısı
```
MindSphere/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # UI bileşenleri
│   │   ├── hooks/         # Custom hooks
│   │   ├── pages/         # Sayfa bileşenleri
│   │   └── lib/           # Yardımcı fonksiyonlar
├── server/                # Express backend
│   ├── services/          # İş mantığı servisleri
│   ├── routes.ts          # API rotaları
│   ├── auth.ts            # Kimlik doğrulama
│   └── storage.ts         # Veritabanı işlemleri
├── shared/                # Paylaşılan kod
│   └── schema.ts          # Veritabanı şeması
└── dist/                  # Build çıktısı
```

### Veritabanı Şeması
Proje, Drizzle ORM kullanarak type-safe veritabanı işlemleri sağlar. Şema değişiklikleri `shared/schema.ts` dosyasında yapılır.

### AI Entegrasyonu
OpenAI API entegrasyonu `server/services/openai.ts` dosyasında bulunur. AI servisi, sohbet yanıtları, analitik içgörüler ve günlük analizi sağlar.

## Lisans

MIT License

## Değişiklik Geçmişi

### v2.0.0 - Replit Bağımsızlığı
- Replit Auth sistemini kaldırıldı
- Basit e-posta/şifre kimlik doğrulama eklendi
- Replit plugin'leri kaldırıldı
- Standalone deployment desteği eklendi

### v1.0.0 - İlk Sürüm
- Temel AI sohbet özelliği
- Görev yönetimi
- Sağlık ve finansal takip
- Replit Auth entegrasyonu 