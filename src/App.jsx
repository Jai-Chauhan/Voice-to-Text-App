import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [text, setText] = useState("");
  const [liveText, setLiveText] = useState("");

  const audioContextRef = useRef(null);
  const processorRef = useRef(null);
  const inputRef = useRef(null);
  const streamRef = useRef(null);
  const audioDataRef = useRef([]);
  const intervalRef = useRef(null);
  const textareaRef = useRef(null);

  /* ---------------- Recording ---------------- */

  const startRecording = async () => {
    if (isRecording) return;

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    const audioContext = new AudioContext({ sampleRate: 16000 });
    audioContextRef.current = audioContext;

    const source = audioContext.createMediaStreamSource(stream);
    inputRef.current = source;

    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    audioDataRef.current = [];

    processor.onaudioprocess = (e) => {
      audioDataRef.current.push(
        new Float32Array(e.inputBuffer.getChannelData(0))
      );
    };

    source.connect(processor);
    processor.connect(audioContext.destination);

    // Streaming-like partial transcription
    intervalRef.current = setInterval(async () => {
      if (audioDataRef.current.length === 0) return;

      const wavBlob = encodeWAV(audioDataRef.current, 16000);
      const buffer = await wavBlob.arrayBuffer();
      const audioBytes = Array.from(new Uint8Array(buffer));

      try {
        const partial = await invoke("transcribe_audio", { audioBytes });
        if (partial && partial.trim()) setLiveText(partial);
      } catch {
        /* ignore partial errors */
      }
    }, 1000);

    setIsRecording(true);
  };

  const stopRecording = async () => {
    if (!isRecording) return;

    clearInterval(intervalRef.current);
    intervalRef.current = null;

    processorRef.current.disconnect();
    inputRef.current.disconnect();
    audioContextRef.current.close();
    streamRef.current.getTracks().forEach((t) => t.stop());

    setIsRecording(false);

    const wavBlob = encodeWAV(audioDataRef.current, 16000);
    const buffer = await wavBlob.arrayBuffer();
    const audioBytes = Array.from(new Uint8Array(buffer));

    try {
      const transcript = await invoke("transcribe_audio", { audioBytes });

      if (transcript && transcript.trim()) {
        setText((prev) =>
          prev.length === 0 ? transcript : prev + " " + transcript
        );
      }
      setLiveText("");
    } catch (e) {
      console.error("Transcription failed:", e);
    }
  };

  /* ---------------- Keyboard Push-to-Talk ---------------- */

  useEffect(() => {
    const down = (e) => {
      if (
        e.code === "Space" &&
        !e.repeat &&
        document.activeElement !== textareaRef.current
      ) {
        e.preventDefault();
        startRecording();
      }
    };

    const up = (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        stopRecording();
      }
    };

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);

    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [isRecording]);

  /* ---------------- UI Helpers ---------------- */

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      console.error("Copy failed", e);
    }
  };

  const buttonStyle = {
    padding: "8px 14px",
    borderRadius: 6,
    border: "none",
    cursor: "pointer",
    fontSize: 14,
    background: "#4f46e5",
    color: "white",
  };

  /* ---------------- UI ---------------- */

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f5f7fb",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <div
        style={{
          width: 520,
          background: "white",
          borderRadius: 12,
          padding: 24,
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
        }}
      >
        <h2 style={{ marginBottom: 6 }}>Voice to Text</h2>
        <p style={{ color: "#555", marginTop: 0 }}>
          Hold <b>SPACE</b> and speak
        </p>

        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            backgroundColor: isRecording ? "#ff3b3b" : "#bbb",
            marginBottom: 12,
          }}
        />

        <textarea
          ref={textareaRef}
          value={text + (liveText ? " " + liveText : "")}
          readOnly
          placeholder="Your transcribed text will appear here..."
          style={{
            width: "100%",
            height: 160,
            padding: 14,
            fontSize: 15,
            lineHeight: 1.5,
            borderRadius: 8,
            border: "1px solid #ddd",
            outline: "none",
            resize: "none",
            background: "#fafafa",
            boxSizing: "border-box"
          }}
        />

        <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
          <button onClick={copyToClipboard} style={buttonStyle}>
            Copy
          </button>
          <button
            onClick={() => setText("")}
            style={{ ...buttonStyle, background: "#eee", color: "#333" }}
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;

/* ================= WAV ENCODER ================= */

function encodeWAV(buffers, sampleRate) {
  const samples = flatten(buffers);
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, samples.length * 2, true);

  floatTo16BitPCM(view, 44, samples);
  return new Blob([view], { type: "audio/wav" });
}

function flatten(buffers) {
  const length = buffers.reduce((s, b) => s + b.length, 0);
  const result = new Float32Array(length);
  let offset = 0;
  buffers.forEach((b) => {
    result.set(b, offset);
    offset += b.length;
  });
  return result;
}

function floatTo16BitPCM(view, offset, input) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
}

function writeString(view, offset, str) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}