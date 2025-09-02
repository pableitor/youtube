// server.js (Node.js backend)
const express = require('express');
const ytdl = require('ytdl-core');
const app = express();
const port = 3000;

// Servir archivos estáticos (como el HTML)
app.use(express.static(__dirname)); // Asume que index.html está en el mismo directorio

// Endpoint para obtener formatos disponibles (solo video MP4 sin audio)
app.get('/formats', async (req, res) => {
    const url = req.query.url;
    console.log('URL recibida:', url); // Depuración
    if (!ytdl.validateURL(url)) {
        console.error('URL inválida:', url);
        return res.status(400).json({ error: 'URL inválida' });
    }

    try {
        const info = await ytdl.getInfo(url);
        console.log('Formatos obtenidos:', info.formats); // Depuración
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
        console.error('Error al obtener información:', error.message); // Depuración
        res.status(500).json({ error: 'Error al obtener información del video: ' + error.message });
    }
});

// Endpoint para descargar el video
app.get('/download', (req, res) => {
    const url = req.query.url;
    const itag = req.query.itag;

    if (!ytdl.validateURL(url) || !itag) {
        return res.status(400).send('Parámetros inválidos');
    }

    res.header('Content-Disposition', 'attachment; filename="video_sin_audio.mp4"');
    ytdl(url, { filter: format => format.itag === parseInt(itag) }).pipe(res);
});

app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});