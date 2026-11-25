import React, { useRef, useState, useEffect } from 'react';
import { Circle, Square, Pause, Play, Download } from 'lucide-react';
import type Konva from 'konva';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { showError, showSuccess } from '@/components/ui/Toast';

interface RecordingControlsProps {
  stageRef: React.MutableRefObject<Konva.Stage | null>;
}

export function RecordingControls({ stageRef }: RecordingControlsProps) {
  const [consentOpen, setConsentOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (!recording || paused) return;
    const id = setInterval(() => setDuration((d) => d + 1), 1000);
    return () => clearInterval(id);
  }, [recording, paused]);

  const startRecording = async () => {
    setConsentOpen(false);
    const stage = stageRef.current;
    const canvas = stage?.getContent().querySelector('canvas');
    if (!canvas || typeof canvas.captureStream !== 'function') {
      showError('Canvas recording is not supported in this browser.');
      return;
    }

    try {
      const videoStream = canvas.captureStream(30);
      let combinedStream = videoStream;

      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        combinedStream = new MediaStream([
          ...videoStream.getVideoTracks(),
          ...audioStream.getAudioTracks(),
        ]);
      } catch {
        // Continue with canvas video only if mic denied
      }

      chunksRef.current = [];
      const recorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm' });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setDownloadUrl(url);
        showSuccess('Lesson recording ready to download.');
      };

      recorder.start(1000);
      recorderRef.current = recorder;
      setDuration(0);
      setRecording(true);
      setPaused(false);
      setDownloadUrl(null);
    } catch {
      showError('Unable to start recording.');
    }
  };

  const togglePause = () => {
    const rec = recorderRef.current;
    if (!rec) return;
    if (paused) {
      rec.resume();
      setPaused(false);
    } else {
      rec.pause();
      setPaused(true);
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setRecording(false);
    setPaused(false);
  };

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <>
      {!recording ? (
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setConsentOpen(true)}
            leftIcon={<Circle className="h-3 w-3 fill-red-500 text-red-500" />}
            className="hidden sm:inline-flex"
          >
            Record
          </Button>
          {downloadUrl && (
            <a
              href={downloadUrl}
              download={`rekha-lesson-${Date.now()}.webm`}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-teal-200 bg-teal-50 px-2.5 text-xs font-medium text-primary-800 hover:bg-teal-100"
            >
              <Download className="h-3.5 w-3.5" />
              Save Video
            </a>
          )}
        </div>
      ) : (
        <div className="recording-badge">
          <span className="recording-dot" />
          <span className="font-mono">{formatTime(duration)}</span>
          <button type="button" onClick={togglePause} title={paused ? 'Resume' : 'Pause'}>
            {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
          </button>
          <button type="button" onClick={stopRecording} title="Stop recording">
            <Square className="h-3.5 w-3.5 fill-red-600" />
          </button>
        </div>
      )}

      <Modal
        open={consentOpen}
        onOpenChange={setConsentOpen}
        title="Record Lesson"
        description="Please confirm recording consent before capturing classroom audio and whiteboard activity."
      >
        <p className="text-xs text-slate-600 leading-relaxed">
          Rekha will record the whiteboard canvas and optionally your microphone locally in your browser.
          Ensure students are informed if classroom audio is being recorded.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConsentOpen(false)}>
            Cancel
          </Button>
          <Button onClick={startRecording}>Start Recording</Button>
        </div>
      </Modal>
    </>
  );
}

