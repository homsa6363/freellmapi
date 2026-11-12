const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// ---------------------------------------------------------------------------
// render_video.js — HTML5 Canvas timeline -> 1080p 30 fps MP4
//
// Usage:
//   node render_video.js [prefix] [workDir]
//
//   [prefix]   base name of your project files (default: "intro")
//   [workDir]  folder that contains the project files (default: the folder
//              this script lives in — i.e. your project folder in the
//              recommended flat layout)
//
// Reads:   <prefix>_animation.html   canvas page exposing window.renderAtTime(t, amp)
//          <prefix>_envelope.json    fps / totalFrames / envelope from the audio step
//          <prefix>_audio_mix.wav    final audio master (from the audio step)
// Writes:  <workDir>/out/<prefix>_1080p.mp4  (+ still_*.jpg preview frames in out/)
//
// Optional environment variables:
//   CHROME_PATH        path to a Chrome/Chromium binary (auto-detected otherwise)
//   ERKO_DELIVER_DIR   an extra folder that also receives the finished MP4
// ---------------------------------------------------------------------------

const PREFIX = (process.argv[2] || 'intro').trim();
const WORK_DIR = process.argv[3] ? path.resolve(process.argv[3]) : __dirname;
const OUT_DIR = path.join(WORK_DIR, 'out');
fs.mkdirSync(OUT_DIR, { recursive: true });

const envData = JSON.parse(fs.readFileSync(path.join(WORK_DIR, `${PREFIX}_envelope.json`), 'utf8'));
const htmlRaw = fs.readFileSync(path.join(WORK_DIR, `${PREFIX}_animation.html`), 'utf8');
const audioPath = path.join(WORK_DIR, `${PREFIX}_audio_mix.wav`);
const outputMp4 = path.join(OUT_DIR, `${PREFIX}_1080p.mp4`);

const FPS = envData.fps || 30;
const TOTAL_FRAMES = envData.totalFrames || Math.round((envData.duration || 20) * FPS);

// One JPEG still is captured for each of these timestamps (seconds). A few
// stills from across the timeline make it easy to build a contact sheet.
const PREVIEW_AT_SECONDS = [3.6, 11.8, 15.5, 22.2, 35.0, 49.5];
const previewFrames = new Set(PREVIEW_AT_SECONDS.map(s => Math.round(s * FPS)));

console.log(`Rendering ${TOTAL_FRAMES} frames (${envData.duration}s @ ${FPS} fps) -> ${outputMp4}`);

const ffmpegArgs = [
  '-y',
  '-f', 'image2pipe',
  '-vcodec', 'mjpeg',
  '-r', String(FPS),
  '-i', '-',
  '-i', audioPath,
  '-c:v', 'libx264',
  '-preset', 'fast',
  '-crf', '18',
  '-pix_fmt', 'yuv420p',
  '-c:a', 'aac',
  '-b:a', '192k',
  '-movflags', '+faststart',
  '-shortest',
  outputMp4
];

const ffmpeg = spawn('ffmpeg', ffmpegArgs, { stdio: ['pipe', 'ignore', 'pipe'] });
let ffmpegStderr = '';
ffmpeg.stderr.on('data', chunk => { ffmpegStderr += chunk.toString(); });

const driverScript = `
<script>
const ENVELOPE = ${JSON.stringify(envData.envelope)};
const FPS = ${FPS};
const TOTAL_FRAMES = ${TOTAL_FRAMES};

async function runRenderLoop() {
  if (document.fonts) { await document.fonts.ready; }
  await new Promise(r => setTimeout(r, 400));

  for (let f = 0; f < TOTAL_FRAMES; f++) {
    const t = f / FPS;
    const amp = ENVELOPE[f] || 0.05;
    window.renderAtTime(t, amp);

    const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.94));
    const buf = await blob.arrayBuffer();
    await fetch('/frame?f=' + f, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: buf
    });
  }
  await fetch('/done');
}
window.addEventListener('load', () => { setTimeout(runRenderLoop, 300); });
</script>
`;

// Timing data used by the bundled intro template. Only injected when the
// envelope JSON actually contains it (build_audio_with_sfx.py does).
const headInjection = `
<script>
${envData.timing ? `window.TIMING = ${JSON.stringify(envData.timing)};` : ''}
${envData.bomb_t !== undefined ? `window.BOMB_T = ${envData.bomb_t};` : ''}
</script>
`;

const servedHtml = htmlRaw
  .replace('</head>', headInjection + '\n</head>')
  .replace('</body>', driverScript + '\n</body>');

let chromeProc = null;
const startTime = Date.now();

const server = http.createServer((req, res) => {
  const reqUrl = req.url.split('?')[0];

  if (req.method === 'GET' && reqUrl === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(servedHtml);
  } else if (req.method === 'GET') {
    const filePath = path.join(WORK_DIR, decodeURIComponent(reqUrl.slice(1)));
    if (fs.existsSync(filePath)) {
      res.writeHead(200);
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404);
      res.end();
    }
  } else if (req.method === 'POST' && req.url.startsWith('/frame')) {
    const urlObj = new URL(req.url, 'http://127.0.0.1');
    const f = parseInt(urlObj.searchParams.get('f'), 10);
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      const buffer = Buffer.concat(chunks);
      if (previewFrames.has(f)) {
        fs.writeFileSync(path.join(OUT_DIR, `still_${(f / FPS).toFixed(1)}s.jpg`), buffer);
      }
      if (f % 100 === 0 || f === TOTAL_FRAMES - 1) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`  Rendered frame ${f + 1}/${TOTAL_FRAMES} (${elapsed}s)`);
      }
      ffmpeg.stdin.write(buffer);
      res.writeHead(200);
      res.end('ok');

      if (f === TOTAL_FRAMES - 1) {
        console.log('All frames sent to FFmpeg. Finalizing MP4...');
        try { ffmpeg.stdin.end(); } catch (e) {}
        if (chromeProc) { try { chromeProc.kill(); } catch (e) {} }
      }
    });
  } else if (req.url === '/done') {
    res.writeHead(200);
    res.end('done');
    try { ffmpeg.stdin.end(); } catch (e) {}
    if (chromeProc) { try { chromeProc.kill(); } catch (e) {} }
  } else {
    res.writeHead(404);
    res.end();
  }
});

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium'
  ];
  for (const c of candidates) {
    if (c && fs.existsSync(c)) return c;
  }
  return 'google-chrome'; // fall back to PATH lookup
}

server.listen(0, '127.0.0.1', () => {
  const port = server.address().port;
  const url = `http://127.0.0.1:${port}/`;
  console.log(`Render server listening at ${url}`);

  const chromePath = findChrome();
  console.log(`Using Chrome binary: ${chromePath}`);
  chromeProc = spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--window-size=1920,1080',
    url
  ], { stdio: 'ignore' });
});

ffmpeg.on('close', code => {
  if (code === 0) {
    const stat = fs.statSync(outputMp4);
    console.log(`SUCCESS! ${outputMp4} (${(stat.size / (1024 * 1024)).toFixed(2)} MB)`);
    const deliverDir = process.env.ERKO_DELIVER_DIR;
    if (deliverDir) {
      try {
        fs.mkdirSync(deliverDir, { recursive: true });
        const dest = path.join(deliverDir, path.basename(outputMp4));
        fs.copyFileSync(outputMp4, dest);
        console.log(`Copied final MP4 to: ${dest}`);
      } catch (e) {
        console.warn('Could not copy to ERKO_DELIVER_DIR:', e.message);
      }
    }
    process.exit(0);
  } else {
    console.error('FFmpeg exited with code:', code);
    console.error(ffmpegStderr.slice(-1000));
    process.exit(1);
  }
});
