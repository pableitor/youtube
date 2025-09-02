const express = require('express');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const app = express();
const port = 3000;

// Configurar WebSocket
const wss = new WebSocket.Server({ port: 3001 });

// Mantener un cliente WebSocket activo
let wsClient = null;
wss.on('connection', (ws) => {
    console.log('Cliente WebSocket conectado');
    wsClient = ws;
    ws.on('close', () => {
        console.log('Cliente WebSocket desconectado');
        wsClient = null;
    });
});

// Función para enviar progreso
function sendProgress(stage, progress) {
    if (wsClient && wsClient.readyState === WebSocket.OPEN) {
        wsClient.send(JSON.stringify({ type: 'progress', stage, progress }));
    }
}

app.use(express.static(__dirname));

// Endpoint para obtener formatos de video
app.get('/formats', async (req, res) => {
    const url = req.query.url;
    console.log('URL recibida:', url);
    if (!ytdl.validateURL(url)) {
        console.error('URL inválida:', url);
        return res.status(400).json({ error: 'URL inválida' });
    }

    try {
        const info = await ytdl.getInfo(url);
        const videoFormats = ytdl.filterFormats(info.formats, 'videoonly');
        const mp4Formats = videoFormats.filter(f => f.container === 'mp4');

        if (mp4Formats.length === 0) {
            console.error('No se encontraron formatos MP4 sin audio');
            return res.status(404).json({ error: 'No se encontraron formatos MP4 sin audio' });
        }

        const resolutions = mp4Formats.map(f => ({
            itag: f.itag,
            quality: f.qualityLabel || `${f.height}p`
        })).sort((a, b) => parseInt(b.quality) - parseInt(a.quality));

        res.json(resolutions);
    } catch (error) {
        console.error('Error al obtener formatos:', error.message, error.stack);
        res.status(500).json({ error: 'Error al obtener información del video: ' + error.message });
    }
});

// Endpoint para descargar y multiplexar
app.get('/download', async (req, res) => {
    const url = req.query.url;
    const itag = req.query.itag;

    if (!ytdl.validateURL(url) || !itag) {
        console.error('Parámetros inválidos:', { url, itag });
        return res.status(400).send('Parámetros inválidos');
    }

    const videoPath = path.join(__dirname, `video-${itag}.mp4`);
    const audioPath = path.join(__dirname, `audio-${itag}.mp4`);
    const outputPath = path.join(__dirname, `output-${itag}.mp4`);

    try {
        // Descargar video
        console.log('Descargando video para itag:', itag);
        await new Promise((resolve, reject) => {
            const videoStream = ytdl(url, { filter: format => format.itag === parseInt(itag) });
            videoStream.pipe(fs.createWriteStream(videoPath))
                .on('finish', () => {
                    console.log('Video descargado en:', videoPath);
                    sendProgress('video', 100);
                    resolve();
                })
                .on('error', (err) => {
                    console.error('Error al descargar video:', err.message, err.stack);
                    reject(err);
                });
            videoStream.on('progress', (chunkLength, downloaded, total) => {
                const progress = (downloaded / total) * 100;
                console.log(`Progreso video: ${progress.toFixed(2)}%`);
                sendProgress('video', progress);
            });
        });

        // Descargar audio
        console.log('Descargando audio...');
        await new Promise((resolve, reject) => {
            const audioStream = ytdl(url, { filter: 'audioonly', quality: 'highestaudio' });
            audioStream.pipe(fs.createWriteStream(audioPath))
                .on('finish', () => {
                    console.log('Audio descargado en:', audioPath);
                    sendProgress('audio', 100);
                    resolve();
                })
                .on('error', (err) => {
                    console.error('Error al descargar audio:', err.message, err.stack);
                    reject(err);
                });
            audioStream.on('progress', (chunkLength, downloaded, total) => {
                const progress = (downloaded / total) * 100;
                console.log(`Progreso audio: ${progress.toFixed(2)}%`);
                sendProgress('audio', progress);
            });
        });

        // Verificar que los archivos temporales existen
        if (!fs.existsSync(videoPath) || !fs.existsSync(audioPath)) {
            throw new Error('No se encontraron los archivos de video o audio descargados');
        }

        // Multiplexar video y audio con FFmpeg
        console.log('Multiplexando video y audio...');
        await new Promise((resolve, reject) => {
            let lastProgress = 0;
            ffmpeg()
                .input(videoPath)
                .input(audioPath)
                .outputOptions([
                    '-c:v copy', // Copiar el video sin recodificar
                    '-c:a aac',  // Asegurar compatibilidad de audio
                    '-map 0:v:0', // Mapear el video del primer input
                    '-map 1:a:0', // Mapear el audio del segundo input
                    '-shortest'   // Usar la duración del flujo más corto
                ])
                .output(outputPath)
                .on('progress', (progress) => {
                    const percent = progress.percent || (lastProgress + 10); // Estimar progreso si no está disponible
                    lastProgress = Math.min(percent, 100);
                    console.log(`Progreso multiplexación: ${lastProgress.toFixed(2)}%`);
                    sendProgress('mux', lastProgress);
                })
                .on('end', () => {
                    console.log('Multiplexación completada en:', outputPath);
                    sendProgress('mux', 100);
                    resolve();
                })
                .on('error', (err) => {
                    console.error('Error al multiplexar:', err.message, err.stack);
                    reject(err);
                })
                .run();
        });

        // Verificar que el archivo de salida existe
        if (!fs.existsSync(outputPath)) {
            throw new Error('No se generó el archivo de salida multiplexado');
        }

        // Enviar el archivo combinado al cliente
        res.download(outputPath, 'video_con_audio.mp4', (err) => {
            if (err) {
                console.error('Error al enviar el archivo:', err.message, err.stack);
                res.status(500).send('Error al enviar el archivo');
            }

            // Limpiar archivos temporales
            [videoPath, audioPath, outputPath].forEach(file => {
                if (fs.existsSync(file)) {
                    fs.unlink(file, err => {
                        if (err) console.error(`Error al eliminar ${file}:`, err);
                    });
                }
            });
        });
    } catch (error) {
        console.error('Error en el proceso:', error.message, error.stack);
        res.status(500).send('Error al procesar el video: ' + error.message);

        // Limpiar archivos temporales en caso de error
        [videoPath, audioPath, outputPath].forEach(file => {
            if (fs.existsSync(file)) {
                fs.unlink(file, err => {
                    if (err) console.error(`Error al eliminar ${file}:`, err);
                });
            }
        });
    }
});

app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
    console.log(`WebSocket servidor corriendo en ws://localhost:3001`);
});