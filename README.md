# Fotogif

Web app en español para convertir **video a GIF** en el navegador. Usa Vite, React, TypeScript, Tailwind CSS y [ffmpeg.wasm](https://ffmpegwasm.netlify.app/) (build single-thread).

## Qué puedes hacer

1. Subir un video (arrastrar o elegir: MP4, WebM, MOV) **o importarlo desde un enlace** (URL directa, Google Drive o Dropbox).
2. Editar antes de convertir: recortar inicio/fin, ancho, FPS, velocidad, área (crop), texto opcional, invertir y loop.
3. Convertir a GIF con paleta de alta calidad (`palettegen` / `paletteuse`) y barra de progreso.
4. Previsualizar el resultado, ver el peso, volver a editar y descargar.
5. Interfaz responsive y usable en móvil.

La conversión con FFmpeg ocurre en tu dispositivo. Al importar por enlace, un pequeño endpoint (`/api/fetch-video`) descarga el archivo cuando el navegador no puede por CORS (típico en Google Drive).

## Requisitos

- Node.js 20+ recomendado
- Navegador moderno con WebAssembly

## Cómo ejecutar

```bash
npm install
npm run dev
```

Abre la URL que muestre Vite (por defecto `http://127.0.0.1:4521`).

### Otros comandos

```bash
npm run build    # comprobación TypeScript + build de producción
npm run preview  # servir el build (incluye el proxy de enlaces)
```

## Enlaces y Google Drive

- El archivo en Drive debe estar compartido como **«Cualquier persona con el enlace»** (lector).
- Acepta URLs del tipo `https://drive.google.com/file/d/ID/view`.
- También Dropbox (`dl=0` → descarga) y URLs directas a un `.mp4` / `.webm` / `.mov`.
- Límite orientativo por enlace: **~50 MB**. Videos más grandes: descárgalos y súbelos como archivo.
- En producción, despliega en **Netlify** para que la function `netlify/functions/fetch-video.ts` esté disponible.

## Notas técnicas

- Core **single-thread** de `@ffmpeg/core` (compatible sin SharedArrayBuffer estricto).
- Tras `npm install`, `postinstall` copia el core a `public/ffmpeg/`.
- Cabeceras `Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy` en Vite y Netlify.
- Fuente DejaVu para texto en GIF: `public/fonts/DejaVuSans.ttf`.

### Prueba de humo (opcional)

Con el servidor en marcha (`npm run dev`):

```bash
ffmpeg -y -f lavfi -i testsrc=size=320x240:rate=10 -t 2 -pix_fmt yuv420p test-assets/sample.mp4
npm run test:smoke
```

## Licencia

Uso libre para este proyecto de demostración.
