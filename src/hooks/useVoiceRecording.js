// src/hooks/useVoiceRecording.js - Complete Voice recording hook for POC
// Handles browser MediaRecorder API and audio blob creation

import { useState, useRef, useCallback } from 'react';
import apiClient from '../utils/apiClient';

export function useVoiceRecording() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [isSupported, setIsSupported] = useState(true);
  
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const selectedFormatRef = useRef(null);
  
  // Check browser support
  const checkSupport = useCallback(() => {
    const supported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
    setIsSupported(supported);
    return supported;
  }, []);
  
  // Start recording
  const startRecording = useCallback(async () => {
    if (!checkSupport()) {
      setError({
        message: 'Voice recording not supported in this browser. Please use Chrome, Firefox, or Safari.',
        type: 'browser_support'
      });
      return false;
    }
    
    try {
      console.log('[Voice] Requesting microphone access...');
      setError(null);
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000 // Optimize for speech
        }
      });
      
      streamRef.current = stream;
      chunksRef.current = [];
      
      // Try different formats in order of preference
      const preferredFormats = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/wav'
      ];
      
      let selectedFormat = null;
      for (const format of preferredFormats) {
        if (MediaRecorder.isTypeSupported(format)) {
          selectedFormat = format;
          console.log(`[Voice] Using audio format: ${format}`);
          break;
        }
      }
      
      if (!selectedFormat) {
        throw new Error('No supported audio format found');
      }
      
      selectedFormatRef.current = selectedFormat;
      
      // Create MediaRecorder with explicit format
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: selectedFormat
      });
      
      mediaRecorderRef.current = mediaRecorder;
      
      // Handle data available
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
          console.log(`[Voice] Audio chunk received: ${event.data.size} bytes`);
        }
      };
      
      // Handle recording stop
      mediaRecorder.onstop = () => {
        console.log('[Voice] Recording stopped, processing audio...');
        setIsRecording(false);
      };
      
      // Handle errors
      mediaRecorder.onerror = (event) => {
        console.error('[Voice] MediaRecorder error:', event.error);
        setError({
          message: 'Recording error occurred. Please try again.',
          type: 'recording_error'
        });
        setIsRecording(false);
      };
      
      // Start recording
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      console.log('[Voice] Recording started');
      
      return true;
      
    } catch (error) {
      console.error('[Voice] Error starting recording:', error);
      
      let errorMessage = 'Could not access microphone.';
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Microphone access denied. Please allow microphone access and try again.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No microphone found. Please connect a microphone and try again.';
      }
      
      setError({
        message: errorMessage,
        type: 'microphone_access'
      });
      
      return false;
    }
  }, [checkSupport]);
  
  // Stop recording
  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
      console.warn('[Voice] No active recording to stop');
      return null;
    }
    
    try {
      setIsProcessing(true);
      console.log('[Voice] Stopping recording...');
      
      // Stop the recorder
      mediaRecorderRef.current.stop();
      
      // Stop the stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      // Wait for ondataavailable to complete
      await new Promise(resolve => {
        const checkForData = () => {
          if (chunksRef.current.length > 0) {
            resolve();
          } else {
            setTimeout(checkForData, 100);
          }
        };
        checkForData();
      });
      
      // Create audio blob with proper format
      if (chunksRef.current.length === 0) {
        throw new Error('No audio data recorded');
      }
      
      const selectedFormat = selectedFormatRef.current;
      const audioBlob = new Blob(chunksRef.current, { type: selectedFormat });
      console.log(`[Voice] Created audio blob: ${audioBlob.size} bytes, type: ${selectedFormat}`);
      
      if (audioBlob.size < 1000) { // Less than 1KB likely means no audio
        throw new Error('Recording too short or no audio detected');
      }
      
      // Determine file extension based on format
      let fileExtension = 'webm';
      if (selectedFormat.includes('mp4')) fileExtension = 'mp4';
      else if (selectedFormat.includes('wav')) fileExtension = 'wav';
      else if (selectedFormat.includes('webm')) fileExtension = 'webm';
      
      // Transcribe audio
      console.log('[Voice] Sending audio for transcription...');
      const transcriptionResult = await apiClient.transcribeAudio(
        audioBlob, 
        `voice-recording.${fileExtension}`
      );
      
      if (!transcriptionResult.success) {
        throw new Error(transcriptionResult.error);
      }
      
      const transcription = transcriptionResult.data.transcription;
      console.log(`[Voice] Transcription received: "${transcription}"`);
      
      if (!transcription || transcription.trim().length === 0) {
        throw new Error('No speech detected in recording. Please try speaking more clearly.');
      }
      
      setIsProcessing(false);
      return transcription.trim();
      
    } catch (error) {
      console.error('[Voice] Error processing recording:', error);
      
      setError({
        message: error.message || 'Failed to process voice recording. Please try again.',
        type: 'processing_error'
      });
      
      setIsProcessing(false);
      return null;
    }
  }, []);
  
  // Cancel recording
  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    setIsRecording(false);
    setIsProcessing(false);
    setError(null);
    chunksRef.current = [];
    
    console.log('[Voice] Recording cancelled');
  }, []);
  
  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  return {
    // State
    isRecording,
    isProcessing,
    error,
    isSupported,
    
    // Actions
    startRecording,
    stopRecording,
    cancelRecording,
    clearError,
    
    // Computed
    isActive: isRecording || isProcessing,
    canRecord: isSupported && !isRecording && !isProcessing
  };
}