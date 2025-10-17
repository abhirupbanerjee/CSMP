// api/speech-express.js - FIXED Speech-to-Text for Railway
// Fixed audio format handling for Whisper API compatibility

const express = require('express');
const multer = require('multer');
const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Configure multer for audio file uploads
const upload = multer({
  dest: '/tmp/audio-uploads/', // Railway temp directory
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for POC
  },
  fileFilter: (req, file, cb) => {
    // Accept audio files only
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'), false);
    }
  }
});

// Ensure temp directory exists
const tempDir = '/tmp/audio-uploads';
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// POST /api/speech - Audio upload and transcription
router.post('/', upload.single('audio'), async (req, res) => {
  console.log(`[${new Date().toISOString()}] POST /api/speech`);
  
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        error: 'No audio file provided',
        status: 'failed'
      });
    }
    
    const audioFile = req.file;
    console.log(`[Speech] Received audio file: ${audioFile.filename}, size: ${audioFile.size} bytes, mimetype: ${audioFile.mimetype}`);
    
    // Validate file size
    if (audioFile.size === 0) {
      // Cleanup empty file
      fs.unlinkSync(audioFile.path);
      return res.status(400).json({
        error: 'Audio file is empty',
        status: 'failed'
      });
    }
    
    // FIXED: Add proper file extension based on mimetype for Whisper API
    let correctedPath = audioFile.path;
    let extension = '';
    
    if (audioFile.mimetype) {
      if (audioFile.mimetype.includes('webm')) extension = '.webm';
      else if (audioFile.mimetype.includes('wav')) extension = '.wav';
      else if (audioFile.mimetype.includes('mp4')) extension = '.mp4';
      else if (audioFile.mimetype.includes('mpeg') || audioFile.mimetype.includes('mp3')) extension = '.mp3';
      else if (audioFile.mimetype.includes('ogg')) extension = '.ogg';
      else if (audioFile.mimetype.includes('m4a')) extension = '.m4a';
      else extension = '.webm'; // Default fallback
      
      correctedPath = audioFile.path + extension;
      fs.renameSync(audioFile.path, correctedPath);
      console.log(`[Speech] Added file extension: ${extension} (MIME: ${audioFile.mimetype})`);
    }
    
    console.log(`[Speech] Calling Whisper API for transcription with file: ${correctedPath}`);
    
    // Call OpenAI Whisper API with corrected file path
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(correctedPath),
      model: 'whisper-1',
      language: 'en', // English for Trinidad & Tobago
      response_format: 'text'
    });
    
    console.log(`[Speech] Transcription successful: "${transcription.substring(0, 50)}..."`);
    
    // Cleanup temp file immediately after successful transcription
    try {
      fs.unlinkSync(correctedPath);
      console.log(`[Speech] Cleaned up temp file: ${audioFile.filename}${extension}`);
    } catch (cleanupError) {
      console.warn(`[Speech] Could not cleanup temp file: ${cleanupError.message}`);
    }
    
    // Return transcribed text
    return res.status(200).json({
      transcription: transcription.trim(),
      original_filename: audioFile.originalname,
      file_size: audioFile.size,
      mimetype: audioFile.mimetype,
      extension_added: extension,
      status: 'success',
      processing_time: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[Speech] Transcription error:', error);
    
    // Cleanup temp file on error
    if (req.file) {
      try {
        // Try to cleanup both original and corrected paths
        const originalPath = req.file.path;
        const correctedPath = req.file.path + (req.file.mimetype?.includes('webm') ? '.webm' : '.mp3');
        
        if (fs.existsSync(originalPath)) {
          fs.unlinkSync(originalPath);
        }
        if (fs.existsSync(correctedPath)) {
          fs.unlinkSync(correctedPath);
        }
        console.log(`[Speech] Cleaned up temp files after error`);
      } catch (cleanupError) {
        console.warn(`[Speech] Could not cleanup temp files: ${cleanupError.message}`);
      }
    }
    
    // Handle specific OpenAI errors
    if (error.code === 'insufficient_quota') {
      return res.status(429).json({
        error: 'OpenAI API quota exceeded. Please try again later.',
        status: 'failed'
      });
    }
    
    if (error.message && error.message.includes('file format')) {
      return res.status(400).json({
        error: 'Unsupported audio format. Please use WAV, MP3, or M4A.',
        status: 'failed',
        supported_formats: ['flac', 'm4a', 'mp3', 'mp4', 'mpeg', 'mpga', 'oga', 'ogg', 'wav', 'webm']
      });
    }
    
    return res.status(500).json({
      error: 'Speech transcription failed',
      status: 'failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/speech - Health check for speech service
router.get('/', (req, res) => {
  res.json({
    message: 'Speech-to-Text Service (POC)',
    status: 'active',
    whisper_model: 'whisper-1',
    max_file_size: '5MB',
    supported_formats: ['audio/wav', 'audio/mp3', 'audio/m4a', 'audio/webm', 'audio/ogg'],
    temp_directory: tempDir,
    openai_configured: !!process.env.OPENAI_API_KEY
  });
});

module.exports = router;