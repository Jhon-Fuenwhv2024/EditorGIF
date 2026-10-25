# Fotogif

Web app en español para convertir **video a GIF** por completo en el navegador (sin backend ni claves API). Usa Vite, React, TypeScript, Tailwind CSS y [ffmpeg.wasm](https://ffmpegwasm.netlify.app/) (build single-thread).

## Qué puedes hacer

1. Subir un video (arrastrar o elegir: MP4, WebM, MOV) y previsualizarlo.
2. Editar antes de convertir: recortar inicio/fin, ancho, FPS, velocidad, área (crop), texto opcional, invertir y loop.
3. Convertir a GIF con paleta de alta calidad (`palettegen` / `paletteuse`) y barra de progreso.
4. Previsualizar el resultado, ver el peso, volver a editar y descargar.
5. Interfaz responsive y usable en móvil.

Todo el procesamiento ocurre en tu dispositivo; los archivos no se suben a ningún servidor.

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
npm run preview  # servir el build
```

## Notas técnicas

- Se usa el core **single-thread** de `@ffmpeg/core` (compatible sin SharedArrayBuffer estricto).
- Tras `npm install`, el script `postinstall` copia el core a `public/ffmpeg/`.
- En desarrollo y en Netlify se envían cabeceras `Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy`.
- Fuente DejaVu para texto en GIF: `public/fonts/DejaVuSans.ttf`.

### Prueba de humo (opcional)

Con el servidor en marcha (`npm run dev`):

```bash
# genera un MP4 corto y ejecuta Playwright contra la UI
ffmpeg -y -f lavfi -i testsrc=size=320x240:rate=10 -t 2 -pix_fmt yuv420p test-assets/sample.mp4
npm run test:smoke
```

## Licencia

Uso libre para este proyecto de demostración.
