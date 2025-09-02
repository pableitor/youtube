const ytdl = require('ytdl-core');

async function testVideo(url) {
    try {
        const info = await ytdl.getInfo(url);
        const videoFormats = ytdl.filterFormats(info.formats, 'videoonly');
        const mp4Formats = videoFormats.filter(f => f.container === 'mp4');
        console.log('Formatos MP4 sin audio:', mp4Formats.map(f => ({
            itag: f.itag,
            quality: f.qualityLabel || `${f.height}p`
        })));
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testVideo('https://www.youtube.com/watch?v=VD4acolLcyY');