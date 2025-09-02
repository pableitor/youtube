# YouTube Video Downloader (Video + Audio Muxed)

This is a web application that allows users to download YouTube videos in MP4 format, combining separate video (without audio) and audio streams into a single MP4 file with audio using `ytdl-core`, `ffmpeg`, and WebSockets for real-time progress updates. The application provides a simple interface where users can input a YouTube URL, select a resolution, and download the muxed video.

**Note**: Downloading videos from YouTube may violate its [Terms of Service](https://www.youtube.com/static?template=terms). Use this tool only for educational purposes or with permission from the content owner.

## Features
- Downloads YouTube videos in MP4 format with audio.
- Displays available resolutions (e.g., 1080p, 720p).
- Real-time progress indicators for:
  - Video download.
  - Audio download.
  - Video and audio muxing.
- Automatically cleans up temporary files after download.
- Simple and responsive web interface.

## Technologies Used
- **Frontend**: HTML, CSS, JavaScript (WebSockets for real-time progress).
- **Backend**: Node.js with Express.
- **Libraries**:
  - `@distube/ytdl-core`: For downloading video and audio streams from YouTube.
  - `fluent-ffmpeg` and `ffmpeg-static`: For muxing video and audio into an MP4 file.
  - `ws`: For real-time communication via WebSockets.
- **FFmpeg**: Tool for combining video and audio streams.

## Prerequisites
- [Node.js](https://nodejs.org/) (version 14 or higher).
- [FFmpeg](https://ffmpeg.org/) (installed manually or via `ffmpeg-static`).
- Internet connection for downloading YouTube videos.

## Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/<your-username>/<your-repo-name>.git
   cd <your-repo-name>
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
   This will install:
   - `express`
   - `ytdl-core@npm:@distube/ytdl-core`
   - `ffmpeg-static`
   - `fluent-ffmpeg`
   - `ws`

3. (Optional) Install FFmpeg manually if not using `ffmpeg-static`:
   - **Windows**: Download from [ffmpeg.org](https://ffmpeg.org/download.html) and add `ffmpeg.exe` to your PATH.
   - **macOS**: `brew install ffmpeg`
   - **Linux**: `sudo apt-get install ffmpeg` (or equivalent for your distribution).
   Verify installation with:
   ```bash
   ffmpeg -version
   ```

## Usage
1. Start the server:
   ```bash
   node server.js
   ```
   This will start:
   - An HTTP server at `http://localhost:3000`.
   - A WebSocket server at `ws://localhost:3001` for progress updates.

2. Open your browser and navigate to `http://localhost:3000`.

3. Enter a YouTube URL (e.g., `https://www.youtube.com/watch?v=VD4acolLcyY`).

4. Select a resolution and click "Download Video with Audio".

5. Monitor the progress bars for video download, audio download, and muxing.

6. Once complete, the browser will download the file `video_with_audio.mp4`.

## Project Structure
- `index.html`: Frontend interface for inputting URLs and displaying progress.
- `server.js`: Backend server handling video/audio downloads, muxing, and WebSocket communication.

## Troubleshooting
- **Progress bars not updating**:
  - Check the browser console (F12 > Console) for WebSocket errors (e.g., `WebSocket connection to 'ws://localhost:3001/' failed`).
  - Ensure the WebSocket port (`3001`) is not blocked by a firewall or in use:
    ```bash
    netstat -an | grep 3001
    ```
    (Windows: `netstat -an | findstr 3001`).
  - Verify that the server logs show "Client WebSocket connected" when starting a download.
- **Download or muxing fails**:
  - Check the server console for errors (e.g., `node server.js`).
  - Ensure FFmpeg is installed and accessible (`ffmpeg -version`).
  - Try a different YouTube URL to rule out video-specific restrictions.
- **Temporary files**:
  - Temporary files (`video-<itag>.mp4`, `audio-<itag>.mp4`, `output-<itag>.mp4`) are created in the project directory and deleted after download or on error.

## Contributing
Contributions are welcome! Please submit a pull request or open an issue to suggest improvements or report bugs.

## License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Disclaimer
This tool is for educational purposes only. Downloading videos from YouTube without permission may violate its Terms of Service. The author is not responsible for any misuse of this application.