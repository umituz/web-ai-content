# TEST_SCENARIOS.md — @umituz/web-ai-content

Bu doküman, `@umituz/web-ai-content` paketinin tüm public API yüzeyini **manuel olarak** test etmek için adım adım senaryolar içerir. Her senaryo:

- **Önkoşul**: Testi koşmadan önce sahip olmanız gereken yapılandırma.
- **Adımlar**: Kodun nasıl çağrılacağı.
- **Başarı kriteri**: Davranışın doğru sayılması için ne gözlemlenmeli.
- **Başarısızlık**: Yanlış çalışıyorsa, hata genelde nasıl görünür.

> ℹ️ API anahtarları gerçek **olmayan** anahtarlar olabilir; senaryoların çoğu **validation/guard** katmanını test eder, gerçek ağ çağrısı yapmaz. Gerçek sağlayıcı çağrısı gerektiren adımlar açıkça işaretlenmiştir.

---

## 0. Ortak Kurulum

Bir test konsolu uygulaması oluşturun (ör. Next.js/React veya basit bir Vite + React projesi). Paketi kurun ve temsili bir `ai.config.ts` hazırlayın:

```ts
// src/ai.config.ts
import type { ProviderConfig } from '@umituz/web-ai-content';

export const AI_PROVIDER_CONFIG: ProviderConfig = {
  priority: ['groq', 'fal', 'pruna', 'gemini'],
  fallbackEnabled: true,
  retryAttempts: 2,
  timeout: 30_000,
  groq:  { enabled: true,  apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY  ?? 'gsk_test' },
  fal:   { enabled: true,  apiKey: process.env.NEXT_PUBLIC_FAL_API_KEY   ?? 'fal_test' },
  pruna: { enabled: true,  apiKey: process.env.NEXT_PUBLIC_PRUNA_API_KEY ?? 'p_test' },
  gemini:{ enabled: false, apiKey: '' },
};
```

`useAIContent` hook'unu mutlaka tek bir component içinde çağırın ve döndürülen fonksiyonları UI'dan tetikleyin.

---

## 1. `useAIContent` — Temel Kullanım

### 1.1 Başarılı servis oluşturma
- **Önkoşul**: `providers` veya `apiKey` verilmiş olmalı.
- **Adım**:
  ```tsx
  const { isLoading, error } = useAIContent({ providers: AI_PROVIDER_CONFIG });
  ```
- **Başarı kriteri**: `isLoading === false`, `error === null` (sayfa yüklenir yüklenmez).
- **Başarısızlık**: Console'da `Either providers or apiKey must be provided to useAIContent` görülür.

### 1.2 Hata kodu (`errorCode`) kontrolü
- **Adım**: `useAIContent` içinde olmayan bir provider ile tetikleme (ör. `useAIGeneration`'da yalnızca pruna gerekli).
- **Başarı kriteri**: `error === 'No providers are registered...'` ve `errorCode === 'PROVIDER_UNAVAILABLE'`.
- **Başarısızlık**: `error` string olur ama `errorCode` hâlâ `null` kalır.

### 1.3 `onError` callback'i çağrılıyor mu?
- **Adım**: Bilerek 501 dönen bir sahte `groq.apiKey` ile bir blog isteği gönderin.
- **Başarı kriteri**: `onError` callback'i `Error` nesnesiyle tetiklenir, UI'da `error` state'i dolar.
- **Başarısızlık**: Callback tetiklenmez; state senkronize kalmaz.

### 1.4 `onProgress` callback'i
- **Adım**: `generateImage` çağrısı yapın, `reportProgress: true` davranışı (hook içinde) `progress` state'ini 0 → 100 yapar.
- **Başarı kriteri**: Çağrı boyunca `progress` 0..100 arası değişir, sonunda `100` olur.

---

## 2. Blog Üretimi (`generateBlogPost`)

### 2.1 Geçerli istek
- **Adım**:
  ```ts
  const result = await generateBlogPost({
    topic: 'AI in marketing',
    blogType: 'tutorial',
    targetKeywords: ['marketing', 'AI', 'automation'],
    tone: 'professional',
    targetAudience: 'marketers',
    wordCount: 800,
    seoOptimization: true,
    includeImages: true,
    includeSchema: false,
  });
  ```
- **Başarı kriteri**:
  - `result` null değil; `id` `blog-<uuid>` şeklinde.
  - `result.title`, `result.content` (markdown), `result.metaDescription` dolu.
  - `result.blogType === 'tutorial'`, `result.tone === 'professional'`.

### 2.2 Boş topic
- **Adım**: `topic: ''` ile çağırın.
- **Başarı kriteri**: `error === 'Topic cannot be empty'`, `errorCode === 'VALIDATION_ERROR'`, `result === null`.

### 2.3 Aşırı uzun topic
- **Adım**: 600 karakterlik bir topic verin (limit 500).
- **Başarı kriteri**: `error` "exceeds maximum length of 500 characters" içerir, `errorCode === 'VALIDATION_ERROR'`.

### 2.4 Çok fazla anahtar kelime
- **Adım**: 25 anahtar kelime verin (limit 20).
- **Başarı kriteri**: `error === 'Cannot process more than 20 keywords'`.

### 2.5 Keywords boşluk temizleme
- **Adım**: `'  marketing  '`, `''` (boş) gibi karışık liste verin.
- **Başarı kriteri**: Sonuç yalnızca boş olmayan, kırpılmış anahtar kelimeler içerir.

### 2.6 id Üretimi (collision yok)
- **Adım**: 1000 ardışık `generateBlogPost` çağrısı yapın.
- **Başarı kriteri**: Tüm `id` değerleri benzersizdir.
- **Başarısızlık**: `Math.random()`'a düşmüş eski sürümde duplicate id'ler görülebilir.

---

## 3. Sosyal İçerik (`generateSocialContent`, `generateForAllPlatforms`)

### 3.1 Tek platform üretimi
- **Adım**:
  ```ts
  const r = await generateSocialContent({
    topic: 'Yeni ürün lansmanı',
    platform: 'twitter',
    tone: 'casual',
    hashtags: true,
  });
  ```
- **Başarı kriteri**: `r.content` 280 karakteri geçmez, `r.platform === 'twitter'`, `r.characterCount === r.content.length`.

### 3.2 Tüm platformlar
- **Adım**:
  ```ts
  const arr = await generateForAllPlatforms('Yeni ürün', 'enthusiastic');
  ```
- **Başarı kriteri**: `arr` en az 5 platform içerir (twitter, linkedin, instagram, threads, tiktok). Hiçbiri `undefined` değil.

### 3.3 Bilinmeyen platform
- **Adım**: `platform: 'myspace'` verin.
- **Başarı kriteri**: `error === 'Unsupported platform: myspace'`, `errorCode === 'VALIDATION_ERROR'`.

### 3.4 Karakter sayacı doğruluğu
- **Adım**: Her platform için `content.length === characterCount` olduğunu kontrol edin.

---

## 4. Video Script & Voice Script

### 4.1 Geçerli video script
- **Adım**:
  ```ts
  const s = await generateVideoScript({
    topic: 'How to make cold brew',
    tone: 'casual',
    duration: 60,
    targetAudience: 'home baristas',
    includeVisuals: true,
    includeCallToAction: true,
  });
  ```
- **Başarı kriteri**: `s.duration === 60`, `s.wordCount > 0`, `s.script` dolu.

### 4.2 Süre limitleri
- **Adım**: `duration: 5` (min 10) ve `duration: 700` (max 600).
- **Başarı kriteri**: Her ikisi de `error === 'Duration must be between 10 and 600 seconds'`.

### 4.3 Voice script
- **Adım**:
  ```ts
  const v = await generateVoiceScript('Yeni podcast', 'excited', 90);
  ```
- **Başarı kriteri**: `v.duration === 90`, `v.script` dolu.

### 4.4 Boş script durumu
- **Adım**: Sahte modelin boş döndüğü bir test senaryosu (mock gerekli).
- **Başarı kriteri**: `error === 'AI response missing script field'`.

---

## 5. İçerik Analizi

### 5.1 Sentiment — pozitif içerik
- **Adım**: `analyzeSentiment('Bu ürünü çok sevdim, harika!')`
- **Başarı kriteri**: `result.sentiment === 'positive'`, `result.confidence` 0..1 arası.

### 5.2 Sentiment — nötr içerik
- **Adım**: `analyzeSentiment('Toplantı yarın saat 10\'da.')`
- **Başarı kriteri**: `result.sentiment === 'neutral'`.

### 5.3 Confidence clamping
- **Adım**: Model `confidence: 5` dönerse.
- **Başarı kriteri**: Sonuç `confidence: 1` (clamp edildi).

### 5.4 Content Analysis tam
- **Adım**: `analyzeContent({ content: 'lorem ipsum...', detectEmotions: true })`
- **Başarı kriteri**: `sentiment`, `keywords`, `entities`, `suggestedImprovements`, `readabilityScore`, `estimatedEngagement` alanlarının hepsi dolu, `readabilityScore` 0..100 arası.

### 5.5 Boş içerik
- **Adım**: `analyzeSentiment('   ')`
- **Başarı kriteri**: `error === 'Content cannot be empty'`.

---

## 6. SEO

### 6.1 Optimize
- **Adım**:
  ```ts
  const opt = await optimizeSEO({ content: '...', keywords: ['a', 'b', 'c'] });
  ```
- **Başarı kriteri**: `opt.score` 0..100 arası, `opt.suggestions` array.

### 6.2 Skor hesapla
- **Adım**: `calculateSEOScore(content, ['x', 'y'])`
- **Başarı kriteri**: Tüm skor alanları 0..100 arasında (clamp uygulanmış).

### 6.3 Anahtar kelime analizi (deterministik)
- **Adım**: `analyzeKeywords('apple apple banana', ['apple', 'banana'])`
- **Başarı kriteri**:
  - `apple`: count 2, density yüksek.
  - `banana`: count 1, density düşük.
  - `prominence`: density eşiklerine göre `high`/`medium`/`low`.

### 6.4 Sıfır kelime içerik
- **Adım**: `analyzeKeywords('', ['x'])`
- **Başarı kriteri**: `error === 'Content cannot be empty'`.

---

## 7. A/B Test

### 7.1 Prediction
- **Adım**:
  ```ts
  await predictABTest({
    variants: [
      { id: 'A', content: 'Kısa', contentType: 'social', tone: 'casual' },
      { id: 'B', content: 'Daha uzun ve açıklayıcı içerik', contentType: 'social', tone: 'casual' },
    ],
    targetAudience: 'genç yetişkin',
    platform: 'twitter',
    goals: ['engagement'],
  });
  ```
- **Başarı kriteri**: 2 prediction döner, her biri `variantId` doğru, `predictedEngagement` 0..100 arası clamp edilmiş.

### 7.2 Variant karşılaştırma
- **Adım**: `compareVariants('A metni', 'B metni')`
- **Başarı kriteri**: `winner` `A` veya `B`; `improvement` yüzde formatında (`+15% engagement`).

---

## 8. Hashtag

### 8.1 Üretim
- **Adım**: `generateHashtags('Yazılım geliştirme trendleri 2026', 5)`
- **Başarı kriteri**: Dönen dizi 5 öğeden az veya eşit, her öğe `#` ile başlar.

### 8.2 Optimize
- **Adım**:
  ```ts
  optimizeHashtags(['a', 'longer-tag', 'very-long-tag-here', 'xy'], 'twitter');
  ```
- **Başarı kriteri**: Twitter için max 5 hashtag; en uzunları öncelikli tutulur.

### 8.3 Count limitleri
- **Adım**: `generateHashtags(content, 100)` (max 50).
- **Başarı kriteri**: `error === 'Hashtag count must be between 1 and 50'`.

---

## 9. Image Prompts

### 9.1 Tek prompt
- **Adım**: `generateImagePrompt('A mountain at sunrise', 'realistic')`
- **Başarı kriteri**: Dönen string prompt ≥ 50 karakter; İngilizce, detaylı.

### 9.2 Blog için toplu
- **Adım**: 1500+ karakterlik bir blog içeriği ile `generateImagePromptsForBlog(content)`.
- **Başarı kriteri**: Dönen array 0..5 öğe içerir (model çıktısına göre).

### 9.3 Boş açıklama
- **Adım**: `generateImagePrompt('', 'realistic')`
- **Başarı kriteri**: `error === 'Topic cannot be empty'`.

---

## 10. Content Calendar

### 10.1 Geçerli
- **Adım**:
  ```ts
  await generateContentCalendar('vegan yemek tarifleri', 7);
  ```
- **Başarı kriteri**: 7 öğe döner; her birinde `date` (Date objesi), `topic`, `contentType`, `platform`, `priority` dolu.

### 10.2 Sınır dışı gün
- **Adım**: `days: 100`
- **Başarı kriteri**: `error === 'Days must be between 1 and 90'`.

### 10.3 Negatif gün
- **Adım**: `days: 0`
- **Başarı kriteri**: Aynı validation hatası.

---

## 11. Provider / Media Generation

### 11.1 `generateImage` provider-backed
- **Önkoşul**: Geçerli `fal` veya `pruna` API anahtarı.
- **Adım**:
  ```ts
  const img = await generateImage({ type: 'image', prompt: 'A robot', format: 'square', quality: 'hd' });
  ```
- **Başarı kriteri**: `img.url` dolu, `img.metadata.provider` 'fal' veya 'pruna'.

### 11.2 Provider yok
- **Adım**: `useAIContent({ apiKey: 'sk-test' })` ile provider'sız başlatın, ardından `generateImage(...)` çağırın.
- **Başarı kriteri**: `error` içinde `'No providers are registered...'` geçer.

### 11.3 Fallback
- **Önkoşul**: İlk provider'ın API anahtarı geçersiz, ikincisi geçerli.
- **Adım**: `generateImage(...)` çağrısı.
- **Başarı kriteri**: Sistem otomatik olarak ikinci provider'a düşer; sonuç başarılı.

### 11.4 Health cache
- **Adım**: `providerFactory.refreshAllHealth()` ardından `providerFactory.getAllProviders()`.
- **Başarı kriteri**: Her provider için `healthCheck` çağrısı yapılmış olur, cache doldurulur.

### 11.5 Groq streaming
- **Adım**: `groqProvider.streamText({ type: 'text', prompt: '...' }, chunk => {...}, () => {...})`
- **Başarı kriteri**: `onChunk` en az 1 kez çağrılır, `onComplete` tam metinle çağrılır.

---

## 12. Wizard Hook'ları

### 12.1 İlk step
- **Adım**: `useContentWizard()` mount.
- **Başarı kriteri**: `currentStep === 'select-type'`, `progress === 0`.

### 12.2 İleri / geri navigasyon
- **Adım**: `next()` ardından `next()`, sonra `back()`.
- **Başarı kriteri**: `currentStep` doğru sırada değişir, `onStepChange` her geçişte tetiklenir.

### 12.3 Opsiyonel step atlama
- **Adım**: `currentStep === 'advanced'` iken `skip()`.
- **Başarı kriteri**: `currentStep` bir sonraki zorunlu step'e atlar.

### 12.4 Validation başarısız
- **Adım**: `updateData` ile yalnızca `topic: ''` set edin, ardından `next()` (input-topic step'indeyken).
- **Başarı kriteri**: UI üzerinde `canGoNext()` `false` döner; manuel `next()` çağrısı state'i ilerletmez.

### 12.5 `buildRequest` üretimi
- **Adım**: Tüm zorunlu alanları doldurun, `buildRequest()` çağırın.
- **Başarı kriteri**:
  - `social` tipinde: `platform`, `tone` dolu; `hashtags: true`.
  - `blog` tipinde: `blogType: 'tutorial'`, `wordCount: 1000` (default).
  - `script` tipinde: `duration: 60` (default).

### 12.6 `useImageWizard.buildRequest`
- **Adım**: Image wizard'da tüm zorunlu alanları doldurun, `buildRequest()`.
- **Başarı kriteri**: `{ type: 'image', prompt, style, format, quality, quantity }` döner; `quantity === 1` default.

### 12.7 `useVideoWizard.buildRequest`
- **Adım**: Video wizard'da `generationType: 'image-to-video'` seçin, `imageUrl` set edin.
- **Başarı kriteri**: `{ type: 'video', imageUrl, motion: 'medium', camera: 'static' }` döner.

### 12.8 `reset`
- **Adım**: Veri toplayın, ardından `reset()` çağırın.
- **Başarı kriteri**: `wizardData === {}`, `currentStep` başlangıç step'ine döner.

### 12.9 `onComplete`
- **Adım**: Son step'e (`results`) gelene kadar `next()` çağırın.
- **Başarı kriteri**: `onComplete` callback'i son `wizardData` ile tetiklenir.

---

## 13. `useAIGeneration` (Pruna tabanlı)

### 13.1 Metin → Görsel
- **Önkoşul**: Geçerli `pruna.apiKey`.
- **Adım**:
  ```ts
  const { generateImage, status, result, error } = useAIGeneration({
    apiKey: 'p_test',
    checkCredits: () => true,
  });
  await generateImage({ type: 'text-to-image', prompt: 'A cat', quality: 'hd' });
  ```
- **Başarı kriteri**: `status` sırasıyla `processing` → `completed`; `result.url` dolu.

### 13.2 Yetersiz kredi
- **Adım**: `checkCredits: () => false`.
- **Başarı kriteri**: `error.message` içinde `'Insufficient credits. Required: '` geçer.

### 13.3 Cancel
- **Adım**: `generateImage` çağrısı devam ederken `cancel()`.
- **Başarı kriteri**: `status === 'cancelled'`, hata fırlatılır.

### 13.4 Reset
- **Adım**: Üretim tamamlandıktan sonra `reset()`.
- **Başarı kriteri**: `status === 'idle'`, `result === null`, `error === null`.

### 13.5 Dosya → Görsel
- **Adım**:
  ```ts
  const file = new File([blob], 'input.jpg', { type: 'image/jpeg' });
  await generateFromFiles([file], 'image-to-image', 'Make it red', 'hd');
  ```
- **Başarı kriteri**: `uploadPhoto` çağrılır, sonra `generateImage` çalışır.

### 13.6 Base64 input
- **Adım**: `image: 'data:image/png;base64,...'` ile çağırın.
- **Başarı kriteri**: Base64 → File dönüşümü otomatik yapılır, `uploadPhoto` çağrılır.

---

## 14. Cancellation & Memory

### 14.1 Hızlı ardışık çağrı iptali
- **Adım**: `useAIGeneration` içinde peş peşe 3 farklı üretim başlatın.
- **Başarı kriteri**: Yalnızca son çağrı tamamlanır, önceki iki `AbortController` iptal edilir (status `cancelled` olur, leak yok).

### 14.2 Component unmount sırasında abort
- **Adım**: Üretim devam ederken component'i unmount edin.
- **Başarı kriteri**: Devam eden fetch iptal olur, console'da "unmounted component" uyarısı yok.

### 14.3 Prompt token hesabı
- **Adım**: 60 saniyelik bir video script üretin.
- **Başarı kriteri**: `maxTokens` = 600 (60 × 10) hesaplanır; AI'ye yeterli bütçe ayrılır.

---

## 15. Hata Yönetimi (AIErrorCode)

| Kod | Ne zaman | UI'da nasıl gösterilir |
|---|---|---|
| `VALIDATION_ERROR` | Boş topic, aşırı uzun input, vb. | Inline form hatası |
| `PROVIDER_UNAVAILABLE` | Tüm provider'lar exhausted | Toast: "Tüm sağlayıcılar yanıt vermiyor" |
| `PROVIDER_QUOTA_EXHAUSTED` | Kota dolu | Toast: "API kotası doldu, yarın tekrar deneyin" |
| `NETWORK_ERROR` | Fetch başarısız | Toast: "İnternet bağlantınızı kontrol edin" |
| `TIMEOUT` | 30s aşıldı | Toast: "Üretim zaman aşımına uğradı" |
| `ABORTED` | Kullanıcı iptal etti | Sessiz (state zaten cancelled) |
| `PARSE_ERROR` | AI geçersiz JSON döndü | Toast: "Üretilen içerik ayrıştırılamadı" |
| `NO_RESULT` | Provider URL döndürmedi | Toast: "Üretim başarısız oldu" |
| `UNKNOWN` | Beklenmeyen | Generic toast: "Beklenmeyen bir hata oluştu" |

### 15.1 Kod doğruluğu
- **Adım**: Yukarıdaki senaryolardan herhangi birinde hata alın, `errorCode` değerinin doğru kod olduğunu doğrulayın.

---

## 16. Build, Lint, TypeScript

### 16.1 Build
```bash
npm run build
```
- **Başarı kriteri**: CJS, ESM, DTS üçü de `Build success` raporlar; hiçbir `error TS…` yok.

### 16.2 Lint
```bash
npm run lint
```
- **Başarı kriteri**: `0 errors`. Kalan uyarılar yalnızca interface-implementation parametreleri (`_request`) içindir; bunlar **bilinen** ve kasıtlıdır.

### 16.3 Tip kontrolü
```bash
npx tsc --noEmit
```
- **Başarı kriteri**: Hata yok.

---

## 17. Smoke Test (5 dakikada hızlı sağlık kontrolü)

```tsx
import { useAIContent } from '@umituz/web-ai-content';
import { AI_PROVIDER_CONFIG } from './ai.config';

export function SmokeTest() {
  const { isLoading, error, errorCode, generateBlogPost, analyzeSentiment } = useAIContent({
    providers: AI_PROVIDER_CONFIG,
  });

  return (
    <div>
      <button
        disabled={isLoading}
        onClick={async () => {
          const r = await generateBlogPost({
            topic: 'Test',
            blogType: 'tutorial',
            targetKeywords: ['test'],
            tone: 'casual',
            targetAudience: 'devs',
            wordCount: 200,
            seoOptimization: false,
            includeImages: false,
            includeSchema: false,
          });
          if (r) console.log('Blog OK', r.id);
          const s = await analyzeSentiment('Mutluyum!');
          if (s) console.log('Sentiment OK', s.sentiment);
        }}
      >
        Run
      </button>
      {error && <p style={{ color: 'crimson' }}>{errorCode}: {error}</p>}
    </div>
  );
}
```

| Beklenen | Gözlem |
|---|---|
| Component mount olur | `isLoading: false`, `error: null` |
| "Run" tıklanır | Buton disabled olur, console'da `Blog OK ...` ve `Sentiment OK ...` |
| AI yanıt vermezse | `error` UI'da görünür, `errorCode` bir yukarıdaki tablodaki kodlardan biri |

---

## 18. Bilinen Sınırlamalar (Bu Senaryo Kapsamı Dışı)

- **Aynı anda 100+ istek**: `useAIContent` her component instance'ında ayrı bir `AIContentService` oluşturur. Çoklu component için provider'ı context/memoize ile paylaşın.
- **Kalıcı depolama**: Bu pakette cache/saved-state yok; tüketici tarafında eklenmeli.
- **Çoklu dil çevirisi**: Promptlar İngilizce; başka diller için `language` parametresi kullanın.

---

## 19. Hata Ayıklama İpuçları

| Belirti | Olası Sebep | Çözüm |
|---|---|---|
| `Either providers or apiKey must be provided` | Hook'a config geçilmedi | `AI_PROVIDER_CONFIG` veya `apiKey` ekleyin |
| `Unsupported platform: X` | `PLATFORM_SPECS`'te olmayan platform | Geçerli `SocialPlatform` kullanın |
| `Topic exceeds maximum length of 500 characters` | Input çok uzun | Daha kısa konu verin |
| `All providers failed for type: video` | Video provider'lar sağlıksız | Health check loglarını inceleyin |
| `Provider returned no text content` | Streaming response boş | Retry veya farklı provider |
| Hook sürekli re-render | `providers` prop'u her render'da yeni object | `useMemo` ile sabitleyin |

---

## 20. Test Sonuçları Şablonu

Manuel testleri bitirdikten sonra bu tabloyu doldurun:

| Senaryo ID | Geçti | Başarısız | Notlar |
|---|---|---|---|
| 1.1 | ☐ | ☐ | |
| 1.2 | ☐ | ☐ | |
| 1.3 | ☐ | ☐ | |
| 2.1 | ☐ | ☐ | |
| 2.2 | ☐ | ☐ | |
| ... | ☐ | ☐ | |
| 20.1 (Build) | ☐ | ☐ | |
| 20.2 (Lint) | ☐ | ☐ | |
