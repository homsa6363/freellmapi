---
name: erko-ai-video-engine
description: >-
  End-to-end production engine for creating 16:9 (1920x1080 @ 30fps) animated YouTube explainer
  videos in the ekomen77 style featuring the hooded Pickle character, alternating between cozy
  wooden studio whiteboard scenes and full-screen motion graphics diagrams/terminals, synchronized
  to Turkish voiceover and procedural SFX. Use this skill whenever the user asks to produce, render,
  or continue a ekomen77-style animated video or chapter.
---

# Erko AI Animated Video Production Engine (`erko-ai-video-engine`)

This skill provides the complete, battle-tested pipeline, assets, fonts, character rigs, expressive AI assistant (Clawd), and Headless Chrome + FFmpeg renderer for producing 1080p 30fps YouTube explainer videos in the **ekomen77** explainer style.

## 1. Golden Rules (CRITICAL — Never Violate)

1. **ZERO Character Face/Mouth Modification (`%100 Saf Karakter`):**
   - **NEVER** crop, paste, patch, or draw synthetic mouths/ellipses onto the character sprites.
   - **ALWAYS** use the normalized, untouched transparent PNGs in [`./resources/pure_poses/pose_01.png`](./resources/pure_poses/pose_01.png) through [`pose_13.png`](./resources/pure_poses/pose_13.png).
2. **Steady, Calm Character Poses (No Rapid Switching While Talking):**
   - **NEVER** switch character poses based on frame-by-frame audio amplitude (`amp < 0.12`), as word pauses cause frantic 3–5 Hz body flickering.
   - **NEVER** apply continuous sine-wave jelly wobble to the character body.
   - Hold **1 steady pose per scene** (or at most 1 intentional pose transition when a major stamp/verdict hits).
3. **Alternate Between Studio Whiteboard & Full-Screen Motion Graphics:**
   - **Studio Scenes (`drawStudioBase`):** Use for narrative introductions, transitions, and 1–2 concise cards inside the wall whiteboard (`WB = { x: 1044, y: 274, w: 462, h: 294 }`). Place the character on the open wooden floor (`footX = 870, footY = 942, scale = 0.85`).
   - **Full-Screen Cream Paper Diagrams (`drawFullScreenPaperBg`):** Hide the studio background completely (`#EDE5D8` paper canvas) when showing 3+ large cards, architecture pillars, or podium diagrams (`x = 680..1800`).
   - **Full-Screen Dark Cyber / Decompiler Grid (`drawFullScreenCyberBg`):** Hide the studio background and render a dark `#0E1218` canvas with a 3D red perspective floor grid (`horizonY = 560`) when showing hex dumps, decompiler terminals, or locked black-box cards.
   - **`pose_08.png` ("THE PLAN" Easel Board) Rule:** Because `pose_08.png` has its own built-in easel whiteboard, **ONLY** use `pose_08.png` in **Full-Screen Paper Diagram scenes** (`footX = 285, footY = 885, scale = 0.82`), never in front of the studio wall whiteboard.
4. **Turkish Typography & Master Font System:**
   - **Whiteboard Scenes (Investigative Proof Board):** Use [`./resources/fonts/Kalam-Bold.ttf`](./resources/fonts/Kalam-Bold.ttf) for titles and primary callouts; use [`./resources/fonts/PatrickHand-Regular.ttf`](./resources/fonts/PatrickHand-Regular.ttf) for body bullets, questions, and notes. Both fonts are verified 100% native Turkish glyph support (`İ, ı, Ş, ş, Ğ, ğ, Ç, ç, Ö, ö, Ü, ü`).
   - **Full-Screen Motion Graphics & Terminal Scenes:** Use [`./resources/fonts/Montserrat-Black.ttf`](./resources/fonts/Montserrat-Black.ttf), [`./resources/fonts/SpaceMono-Bold.ttf`](./resources/fonts/SpaceMono-Bold.ttf), [`./resources/Fredoka-Bold.ttf`](./resources/Fredoka-Bold.ttf), and [`./resources/JetBrainsMono-Bold.ttf`](./resources/JetBrainsMono-Bold.ttf).
   - **NEVER** use `ctx.globalAlpha < 1` before calling `drawChunkyText`, because the black stroke will bleed through the semi-transparent fill and turn letters muddy grey. To dim background cards behind a stamp, draw cards at `globalAlpha = 1.0` and then draw a semi-transparent veil rectangle (`rgba(237, 229, 216, 0.42)`) over the cards before drawing the stamp.
5. **Always Deliver a Playable MP4:**
   - The renderer writes the final `.mp4` to `./out/<prefix>_1080p.mp4` next to your project files.
   - If an extra copy should land somewhere convenient (Desktop, shared drive), set `ERKO_DELIVER_DIR=<folder>` before running the render — the script copies the finished MP4 there automatically.
6. **Occasional AI Sidekick (Clawd) Rule:**
   - Clawd (the procedural hand-painted box mascot from [`./resources/clawd_assistant.js`](./resources/clawd_assistant.js)) is our live **R.E.A. AI Agent / Assistant**.
   - **NEVER keep Clawd permanently on screen** — that causes visual clutter and distracts from the narrator.
   - **Appear ONLY for punchlines, eureka moments, or interactive assists** (1–2 key appearances per chapter, lasting 3–8 seconds).
   - *Example appearances:*
     - Popping onto the studio desk/whiteboard edge with headphones or an idea lightbulb during a breakthrough.
     - Spawning with a detective fedora or engineering hard hat on a full-screen card to break a locked code block (`furious` / `determined`), then celebrating with sunglasses (`cool`).
7. **Dynamic Studio & Anti-Flatness Rules (Make Scenes Punchy):**
   - **Dynamic Camera Snap-Zooms:** Studio scenes must NOT stay at a fixed wide zoom. Snap the camera to 1.15x–1.25x with `easeOutBack` during key punchlines, then ease back out.
   - **Thematic Studio Lighting Shifts:** Adjust the ambiance based on the narrative mood:
     - *Late night deep work (Chapter 2):* Dim the room light, intensify glowing cyan/green monitors, and pulsate the fireplace embers.
     - *Breakthrough eureka moment:* Warm radiant golden aura bursts behind the character.
   - **Procedural Emotes:** Use `drawEmote('!', ...)` / `drawEmote('?', ...)` / `drawEmote('bulb', ...)` / `drawEmote('sweat', ...)` next to characters to visually punctuate dialogue punchlines.
   - **Stamp Impact Screen-Shake:** When a heavy stamp (`✔`, `❌`, `BOMBA!`) or error buzzer hits, apply 3–5 frames of subtle camera shake (`x += sin(t*40)*4, y += cos(t*40)*4`).
   - **Hand-drawn Transitions:** Use `drawBrushWipe(ctx, progress)` or `drawIris(ctx, progress)` between major scene boundaries for seamless storytelling flow.
8. **Custom AI Illustrations (Sparse Usage + Exact Character References + Pre-Announcement):**
   - **Core Backbone Remains Studio + Canvas Diagrams:** Do NOT turn the video into a slideshow of AI images. Keep 85–90% of every chapter as our classic Studio Whiteboard + Full-Screen Motion Graphics cards/terminals.
   - **Only Generate Custom Illustrations When Truly Needed:** At most 1 custom illustration per chapter for a concrete visual metaphor (e.g., Sandbox chamber, RPG chest, historical courtroom).
   - **Strict Reference Matching:** Whenever generating an image via `image-generator`, ALWAYS pass the exact reference images for **Pickle** (muted olive green texture, oversized black hoodie, thin stick legs) and **Clawd** (terracotta 10x6 rectangular box, 4 stubby peg legs, 2 nub arms, bold ink outline).
   - **Announce Visual Plan Before Rendering:** Before rendering a new chapter, briefly tell the user the scene-by-scene visual plan and whether any custom illustration will be used.
9. **Strict Foot-to-Shadow Alignment & No Overlapping Side Props:**
   - All 13 character poses (`pose_01..13.png`) are standardized to `700x780` with `CHAR_CENTER_X = 350` and `FOOT_BASELINE_Y = 741` (`39px` bottom transparent margin).
   - Never use an uncropped side-prop sprite (like the old `1050x780` `pose_08` easel) where a built-in prop gets trapped behind diagram cards or shifts the character away from the ground shadow. `pose_08.png` has the easel removed and Pickle centered at `x = 350`.
   - In `drawCharacter`, always draw the sprite at `y = footY - ih + 29 * scale + breathY` so the character's soles sit directly inside the contact shadow ellipse (`footY - 10`).
10. **Clawd Assistant Must Always Stand on a Solid Surface (Never Float):**
    - Never place Clawd in mid-air or hovering in front of furniture/monitors.
    - In **Studio Scenes**, place Clawd standing firmly on the open wooden floorboards right beside Pickle (`x = 685, y = 938`), with his crisp contact shadow directly beneath his 4 legs.
    - In **Full-Screen Diagram Scenes**, pass `podium: true` to `drawClawd(...)` (or place him on a solid floor/podium surface) so he stands on a matching wooden mini-podium with a clear contact shadow.
11. **Native Studio Whiteboard Polygon Clipping (No Floating `#FAF6EE` Patch):**
    - Never draw an opaque `ctx.fillRect(WB.x, WB.y, WB.w, WB.h)` over `studio_background_1080p.jpg`, because the background whiteboard's top metal frame has a subtle perspective slope and an opaque rectangle creates a visible sticker/patch seam over the frame.
    - Always clip to the exact 4-corner inner whiteboard polygon (`(1034, 294) -> (1510, 279) -> (1510, 580) -> (1034, 580)`), draw directly onto the studio background's natural whiteboard surface, and rotate whiteboard content by `-0.024 rad` (`-1.4°`) around `(WB.cx, WB.cy)` so headers and cards align naturally with the physical board's angle.
12. **Full-Screen Authentic YouTube Subscribe UI Overlay for Call-to-Action:**
    - Never hide important viewer calls-to-action (`Abone Ol`, `Bildirimleri Aç`, `Beğen`) inside the small background studio whiteboard.
    - Render a prominent, center-stage **Authentic YouTube Watch Page & Subscribe Player UI Overlay** (`drawYouTubeSubscribeOverlay`), complete with a live video viewport preview, red YouTube scrub bar, channel avatar, and an animated mouse cursor clicking `▶ ABONE OL` ➔ `✔ ABONE OLUNDU` and `🔔 TÜMÜ AÇIK!` with ripple/confetti burst.
13. **Mandatory First 15-Second Provocative Hook / Claim Rule (Uzun Videolar ve Shorts İçin Ortak Zorunluluk):**
    - **Format Bağımsızlığı:** Bu kural **hem tam uzunluktaki YouTube videolarında (Chapter 1 / Giriş) hem de YouTube Shorts / Reels videolarında İSTİSNASIZ zorunludur.** Uzun video diye yavaş, sıkıcı veya teorik giriş yapılmaz.
    - **Never begin with passive documentary/academic exposition** (e.g., *"Bugün sizlere X mimarisini anlatacağım..."* veya *"Yazılım dünyasında yeni bir gelişme var..."* kesinlikle yasaktır).
    - **Her videonun ilk 15 saniyesi (Uzun videoda Bölüm 1'in ilk saniyeleri, Shorts'ta giriş)** izleyicinin ezberini bozan, bir yalanı çürüten veya dev bir iddia ortaya atan 3 adımlı yapıdan oluşur:
      - **0.0s – 5.0s (Şok İddia / The Shock Claim):** Yerleşik bir yanılgıyı yüzlerine vur (*"Yazılım şirketlerinin 'kırılamaz' dediği kapalı kutu programlar koca bir yalan!"* / *"ChatGPT'nin seni anladığını sanıyorsan fena halde kandırılıyorsun!"*).
      - **5.0s – 10.0s (İddiayı & Meydan Okumayı Yükselt / High Stakes):** İddiayı cesur bir benzetmeyle zirveye çıkar (*"İddia ediyorum: Bir ekibin 5 yılda gizlediği sistemi, tek bir yapay zeka ajanı 10 dakikada deşifre edebilir!"* / *"Karşındaki bir zeka değil, tarihin en büyük şans çarkı!"*).
      - **10.0s – 15.0s (İspat Kapısı / The Proof Gate):** İzleyiciyi videonun kalanını izlemeye mecbur bırak (*"İnanmıyor musun? Arkadaki sihri ve büyük illüzyonu adım adım ispatlıyorum, iyi izleyin!"*).
14. **Official Studio Whiteboard Formula: Investigative Proof Board (Dedektif Panosu + Clawd):**
    - **No Cheap Cartoon Cards or Tacky Circles:** Never draw chunky rounded web boxes or arbitrary red circles around words (they clutter the board, look amateurish, and feel like generic AI templates).
    - **Chisel-Tip Neon Highlighter Wash:** Key takeaway words have a semi-transparent fluorescent highlighter band drawn *behind* the text (`rgba(253, 224, 71, 0.65)` neon yellow, `rgba(74, 222, 128, 0.5)` mint green, `rgba(251, 146, 60, 0.45)` orange).
    - **Taped Polaroid / Document Evidence Card (`drawPolaroid`):** Attach a physical-looking Polaroid card with semi-transparent duct tape (`rgba(180, 175, 165, 0.85)`) on top, displaying the concrete visual metaphor (roulette wheel, 3D dice, chip architecture, decompiler snippet).
    - **Angled Rubber Ink Stamp (`drawRubberStamp`):** To debunk myths or confirm facts, stamp directly over the claim at `-8°` to `-12°` with distressed double-bordered red ink (`[ ÇÜRÜTÜLDÜ ]`, `[ KANITLANDI ]`, `[ İLLÜZYON ]`, `[ HACKLENDİ ]`).
    - **Taped Yellow Post-It Note (`drawPostIt`):** Pinned or taped with scotch tape on the side for formulas, percentages, and rules.
    - **Clawd on Whiteboard Ledge:** Clawd sits firmly on the wooden trim/tray below the whiteboard (`x = 1045, y = 642, scale = 6`), wearing his brown detective fedora with an idea lightbulb `💡` or reacting emote, seamlessly integrating the duo into the teaching moment.
15. **Strict Anti-Patterns & Failure Prevention (Önceki Hataları Asla Tekrarlamama Kuralları):**
    - **Zero "Sticker Syndrome" / Disconnected Character Compositing (YASAK: Havada Asılı / Yapıştırma Karakterler):** Karakter etkileşime girdiği nesneye fiziksel olarak temas etmeli, oda ışığına (loş, sıcak şömine, siber) bürünmeli, temassız yapıştırma gibi durmamalıdır.
    - **Zero Cheap HTML/CSS Mockups (YASAK: Web Div'leri ve Emojilerle Sahte İllüstrasyon Yapmak):** Asla sahte emojili `🍎 🍒 777` web kutuları üretilmez. Gerçekçi açılı GitHub/terminal kartları veya organik tebeşir diyagramları çizilir.
    - **Zero Visual Clutter / Breathe Rule (Görsel Dağınıklık Yasağı):** Bir sahneye 4–5 farklı karmaşık öğe tıkıştırılmaz. Sahne tek bir güçlü analoji etrafında ferah ve odaklı olmalıdır.
    - **Organic Material Texture over Sterile Vectors (Dijital Jilet Çizgi Yasağı):** Dümdüz steril cetvel çizgileri yasaktır. Çizgiler tebeşir tanecikli, hafif dalgalı ve köşeleri hafif taşmalıdır (overshoot).
16. **Official Full-Screen Scene Archetype: Dark Slate Chalkboard + Tilted Evidence Card:**
    - **Zemin:** Koyu arduvaz kara tahta slate dokusu (`#20201F` / `#282725` organik tanecikli mat doku, hafif silgi tozu izleri ve kenar vinyeti).
    - **Sol Taraf (Kanıt Kartı / Polaroid Artifact):** $-5.5^\circ$ sola eğik (`transform: rotate(-5.5deg)`), kalın fildişi fotoğraf kenarlığı (`#f2eee5`), derin yumuşak gölge, gerçek kod veya terminal içeriği.
    - **Sağ Taraf (Organik Tebeşir Mimari Ağacı):** Üst girdi kutusu $\rightarrow$ Orta işlem kutusu $\rightarrow$ Alt dağılım kutuları.
17. **Official Visual & Typography Direction: "Doğal Tebeşir & Sıcak Amber" (Stil 2 - Kullanıcı Onaylı Ana Standart):**
    - **Tipografi Hiyerarşisi:**
      - **Başlıklar, Büyük İddialar, Mühürler:** [`./resources/fonts/Kalam-Bold.ttf`](./resources/fonts/Kalam-Bold.ttf) (700 weight). Doğal tebeşir el yazısı, güçlü vuruşlar, eksiksiz Türkçe karakter desteği (`İ, ı, Ş, ş, Ğ, ğ, Ç, ç, Ö, ö, Ü, ü`).
      - **Açıklama Metinleri, Alt Maddeler, Sorular:** [`./resources/fonts/PatrickHand-Regular.ttf`](./resources/fonts/PatrickHand-Regular.ttf) (400 weight). Samimi, okunaklı ve organik tebeşir not karakteri.
      - **Kod Satırları, Terminal Logları, Token Sayaçları:** [`./resources/JetBrainsMono-Bold.ttf`](./resources/JetBrainsMono-Bold.ttf). Monospace mühendislik okunurluğu.
    - **Renk Disiplini (Sıfır Renk Karmaşası):**
      - Asla gökkuşağı gibi 4-5 farklı rastgele canlı renk (mor, pembe, mavi kutular bir arada) KULLANILMAZ.
      - **Zemin:** Organik Koyu Arduvaz Kara Tahta (`#20201F` / `#282725`).
      - **Ana Çizim & Metin:** Doğal Toz Tebeşir Beyazı (`#F2EFEB` / `rgba(242, 239, 235, 0.92)`).
      - **Birincil Vurgu:** Sıcak Amber Altın Sarısı (`#F5A524` / `#F59E0B`) — Önemli anahtar kelimeler, akış okları, aktif istasyon kutuları.
      - **İkincil / Nötr:** Yumuşak Tebeşir Grisi (`rgba(242, 239, 235, 0.45)`).
      - **Uyarı & Mühür Rengi:** Canlı Kırmızı (`#EF4F45`) — **SADECE VE SADECE** saatli bomba, kritik hata, tehlike uyarısı ve `[ ÇÜRÜTÜLDÜ ]` mühürlerinde kullanılır; genel kutu çerçevesi veya sıradan başlıklar için ASLA kullanılmaz.
18. **Zero Line & Box Collision in Loops / Architecture Diagrams (Döngü ve Hat Çakışması Yasağı):**
    - Geri dönüş döngüleri (feedback loops) ASLA arkadaki yazıların, kutuların veya etiketlerin üzerinden/altından rastgele geçirilmez.
    - **Standart Çözüm:** Akış hattı üzerine belirgin bir inline istasyon kutusu (`[ ⟲ DÖNGÜ ]`) konur; ok alttan kutuya girer ve üstten temiz bir şekilde girdi kutusuna döner (veya `quadraticCurveTo` ile dıştan temiz yay çizilir).
19. **Dynamic Reveal & Typing Text Padding (Taşan / Kesilen Harf Yasağı):**
    - Dinamik daktilo veya tebeşir metin animasyonlarında (`writeText`), maskeleme genişliği daima fazladan yatay boşluk payı (`w + 40px`) içermelidir.
    - Türkçe büyük noktalı `İ`, ünlem `!`, soru işareti `?` ve tırnak işaretleri asla sağ veya sol sınırına çarpıp kırpılmamalı/kesilmemelidir.
20. **Automated Voice-Matching & Procedural SFX Synchronization (Kullanıcı Sesi Entegrasyonu):**
    - Kullanıcının harici olarak yüklediği herhangi bir ses dosyası (`.opus`, `.mp3`, `.wav`, `.m4a`), [`./scripts/ses_degistir.py`](./scripts/ses_degistir.py) ve [`./scripts/build_audio_with_sfx.py`](./scripts/build_audio_with_sfx.py) motoru ile otomatik olarak projeye dahil edilir:
      - 48 kHz mono PCM WAV standardına dönüştürülür.
      - RMS enerji analiziyle cümle sınırları milisaniyelik olarak tespit edilir.
      - Görsel olaylar ile SFX ses efektleri (konuşma balonu `pop`, itiraf snap-zoom `chime`, tahta geçiş `whoosh`, test geçiş `ding`, bomba mühür bas darbesi + kamera sarsıntısı) milisaniyesine kadar sesin doğal vurgularına (örneğin `"BOMBA"` hecesi) kilitlenir.

---

## 2. Bundled Resources & Character Pose Catalog

All reusable assets are stored in [`./resources/`](./resources/):
- **Studio Background:** [`./resources/studio_background_1080p.jpg`](./resources/studio_background_1080p.jpg) (`1920x1080`)
- **Dark Slate Chalkboard Background:** [`./resources/slate_chalkboard_1080p.png`](./resources/slate_chalkboard_1080p.png) (`1920x1080`)
- **Master Fonts Directory (`./resources/fonts/`):**
  - **Whiteboard Headings:** [`./resources/fonts/Kalam-Bold.ttf`](./resources/fonts/Kalam-Bold.ttf) (100% verified Turkish glyph support)
  - **Whiteboard Body & Bullets:** [`./resources/fonts/PatrickHand-Regular.ttf`](./resources/fonts/PatrickHand-Regular.ttf) & [`Caveat-Bold.ttf`](./resources/fonts/Caveat-Bold.ttf)
  - **Modern Editorial & Stamp Display:** [`./resources/fonts/Montserrat-Black.ttf`](./resources/fonts/Montserrat-Black.ttf)
  - **Technical Labels & HUD:** [`./resources/fonts/SpaceMono-Bold.ttf`](./resources/fonts/SpaceMono-Bold.ttf) & [`JetBrainsMono-Bold.ttf`](./resources/JetBrainsMono-Bold.ttf)
  - **Brutalist Dymo Tape:** [`./resources/fonts/BebasNeue-Regular.ttf`](./resources/fonts/BebasNeue-Regular.ttf)
  - **Classic Cartoon:** [`./resources/Fredoka-Bold.ttf`](./resources/Fredoka-Bold.ttf)
- **AI Assistant Engine:** [`./resources/clawd_assistant.js`](./resources/clawd_assistant.js) (`drawClawd`, `drawEmote`, `drawBrushWipe`, `drawIris`)
- **Normalized Pure Character Poses (`./resources/pure_poses/`):**
  All 13 sprites (`pose_01..13.png`) are `700x780` with locked proportions (`BODY_H = 520px`, `FOOT_BASELINE_Y = 741`, `CHAR_CENTER_X = 350`).

| Pose File | Expression & Props | Best Scene Usage |
| :--- | :--- | :--- |
| `pose_01.png` | Holding notebook, calm explanation | Studio explanation / analytical reading |
| `pose_02.png` | Arms crossed, confident smirk | Behind `KLASİK AI` podium / after `✔ ÇOCUK OYUNCAĞI!` stamp |
| `pose_03.png` | Hand on temple + coffee mug, thinking | Deep analysis / pondering a tough bug |
| `pose_04.png` | Thinking, hand on chin | Analyzing a mystery / snap-zoom confession |
| `pose_05.png` | Glowing Eureka lightbulb above head | Breakthrough / new technology discovery |
| `pose_06.png` | Holding red `ERROR` laptop, shocked | Dark Cyber / Decompiler / `403 LOCKED` scenes |
| `pose_07.png` | Both hands shrugging ("what now?") | Stuck traditional methods / `?` questions / studio talking |
| `pose_08.png` | Pointing right with pointer stick + coffee (easel removed) | Pointing directly at Full-Screen architecture / comparison cards |
| `pose_09.png` | Holding coffee mug + skateboard, gesturing | Studio or Podium active explanation |
| `pose_10.png` | Holding steaming coffee mug + skateboard, happy talk | Studio intro / warm coffee sign-off (`"Kahvenizi taze tutun!"`) |
| `pose_11.png` | Pointing right toward board/cards | Directing attention to right-side diagram |
| `pose_12.png` | Hands on head / worried | Complex bug or system crash |
| `pose_13.png` | Holding coffee mug, calm closed-mouth smile | Calm studio standing |

---

## 3. Step-by-Step Production Workflow

### Step 1: Prepare Project Directory & Assets
Copy the assets you need from [`./resources/`](./resources/) and the scripts from [`./scripts/`](./scripts/) into one flat project folder (e.g. `my-video/`). The example templates load fonts and `clawd_assistant.js` by bare filename, so those files must sit next to the animation HTML.

### Step 2: Audio Envelope & Procedural SFX Mix
Given a voiceover file (e.g., user audio `voice.mp3` or `voice.opus`):
1. Run [`./scripts/build_audio_with_sfx.py`](./scripts/build_audio_with_sfx.py):
   ```powershell
   python build_audio_with_sfx.py "path/to/user_voice.mp3" intro
   ```
2. The script:
   - Converts the audio to 48kHz mono PCM WAV.
   - Automatically detects speech boundaries and energy peaks.
   - Generates procedural SFX (`pop`, `chime/ding`, `whoosh`, `test-ding`, `heavy-impact`).
   - Exports `intro_audio_mix.wav` and `intro_envelope.json` (RMS envelope + frame timings).

> **Alternative lane:** [`./scripts/build_audio_and_envelope.py`](./scripts/build_audio_and_envelope.py) produces the same `<prefix>_envelope.json` + `<prefix>_audio_mix.wav` from the standard library only (no numpy), mixing in a cozy stereo background bed instead of the sharp procedural SFX.

### Step 3: Build the HTML5 Canvas Scene Timeline
Use [`./examples/intro_bomba_animation.html`](./examples/intro_bomba_animation.html) or [`./examples/chapter_01_animation.html`](./examples/chapter_01_animation.html) as the master template:
- Enforce **Stil 2: Doğal Tebeşir & Sıcak Amber** (`Kalam-Bold` + `PatrickHand-Regular` + `JetBrainsMono-Bold`).
- Define `TIMING` segments and `SUBS` array matched to speech cues.
- Include studio intro with dynamic snap-zoom (`easeOutBack`), smooth chalkboard wipe transition, tilted code card, and animated grenade stamp with screen shake.
- Expose `window.renderAtTime(t, amp)` for deterministic frame-by-frame rendering at `30 FPS`.

### Step 4: Render 1080p MP4 & Verify Visual Contact Sheet
Run [`./scripts/render_video.js`](./scripts/render_video.js) as a **single standalone command**:
```powershell
node render_video.js intro
```
The render process runs Headless Chrome (`--window-size=1920,1080`), pipe-encoding JPEG frames directly into FFmpeg H.264 + AAC at ~15 fps encode speed (~65 seconds total for 960 frames).

When rendering finishes:
1. Build a 4-panel or 6-panel contact sheet (`video_render_contact_sheet.jpg`) from key timestamp stills.
2. Verify zero text overlap, crisp tebeşir typography, grounded contact shadows, and stamp timing.
3. The finished MP4 lands in `./out/<prefix>_1080p.mp4`, together with `still_*.jpg` preview frames you can turn into a contact sheet.

### Step 5: Quick Voice Swapping (`ses_degistir.py`)
To swap in a newly recorded voiceover (e.g., Opus, MP3, WAV):
```powershell
python ses_degistir.py "new_voice.opus" intro
```
The script normalizes the audio, re-mixes SFX, re-renders the 1080p MP4 into `./out/`, and is usually done in under 30 seconds.
