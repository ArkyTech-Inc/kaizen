'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { FilesetResolver, GestureRecognizer, type GestureRecognizerResult } from '@mediapipe/tasks-vision'
import { Camera, Check, ChevronLeft, ChevronRight, CircleHelp, Clipboard, Copy, Hand, Pause, Play, RotateCcw, Sparkles, Square, Trash2, Wifi } from 'lucide-react'

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
const signImages: Record<string, string> = {
  A: '✊', B: '🖐', C: '🤏', D: '☝', E: '✊', F: '👌', G: '👉', H: '🤞', I: '🤙', J: '🤙', K: '✌', L: '🤟', M: '✊', N: '✊', O: '👌', P: '👇', Q: '👇', R: '🤞', S: '✊', T: '👍', U: '✌', V: '✌', W: '🖖', X: '☝', Y: '🤙', Z: '🤟',
}

export default function Page() {
  const [mode, setMode] = useState<'recognize' | 'translate'>('recognize')
  const [cameraOn, setCameraOn] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [transcript, setTranscript] = useState('')
  const [confidence, setConfidence] = useState(92)
  const [detected, setDetected] = useState('A')
  const [text, setText] = useState('Hello, welcome to Kaizen')
  const [current, setCurrent] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [modelStatus, setModelStatus] = useState('Loading hand model…')
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recognizerRef = useRef<GestureRecognizer | null>(null)
  const frameRef = useRef<number | null>(null)
  const lastVideoTimeRef = useRef(-1)
  const stableGestureRef = useRef({ letter: '', frames: 0, committed: false })

  const sequence = useMemo(() => text.toUpperCase().replace(/[^A-Z ]/g, '').split('').filter(Boolean), [text])
  const currentSign = sequence[current] || 'A'

  useEffect(() => {
    let cancelled = false
    async function loadRecognizer() {
      try {
        const vision = await FilesetResolver.forVisionTasks('/vision-wasm')
        const options = { baseOptions: { modelAssetPath: '/gesture_recognizer.task' }, runningMode: 'VIDEO' as const, numHands: 1 }
        let recognizer: GestureRecognizer
        try {
          recognizer = await GestureRecognizer.createFromOptions(vision, { ...options, baseOptions: { ...options.baseOptions, delegate: 'GPU' } })
        } catch {
          recognizer = await GestureRecognizer.createFromOptions(vision, options)
        }
        if (!cancelled) { recognizerRef.current = recognizer; setModelStatus('Model ready') }
      } catch (error) {
        if (!cancelled) setModelStatus(`Model unavailable — ${error instanceof Error ? error.message.slice(0, 48) : 'check browser access'}`)
      }
    }
    loadRecognizer()
    return () => { cancelled = true; recognizerRef.current?.close(); recognizerRef.current = null; if (frameRef.current) cancelAnimationFrame(frameRef.current); streamRef.current?.getTracks().forEach((track) => track.stop()) }
  }, [])
  useEffect(() => {
    if (!playing || sequence.length < 2) return
    const timer = window.setInterval(() => setCurrent((value) => (value + 1) % sequence.length), 1300)
    return () => window.clearInterval(timer)
  }, [playing, sequence.length])

  useEffect(() => {
    if (!cameraOn || !videoRef.current || !streamRef.current) return
    const video = videoRef.current
    video.srcObject = streamRef.current
    video.play().catch(() => setCameraError('The camera connected, but the browser could not start the preview. Try clicking Start camera again.'))
  }, [cameraOn])

  function recognizeFrame() {
    const video = videoRef.current
    const recognizer = recognizerRef.current
    if (!video || !recognizer || video.readyState < 2) { frameRef.current = requestAnimationFrame(recognizeFrame); return }
    if (video.currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = video.currentTime
      const result: GestureRecognizerResult = recognizer.recognizeForVideo(video, performance.now())
      const gesture = result.gestures?.[0]?.[0]
      const score = gesture?.score ?? 0
      const labels: Record<string, string> = { Closed_Fist: 'A', Open_Palm: 'B', Pointing_Up: 'D', Thumb_Up: 'L', Thumb_Down: 'E', Victory: 'V', ILoveYou: 'Y' }
      const letter = gesture && score > 0.55 ? labels[gesture.categoryName] : ''
      if (letter) {
        const stable = stableGestureRef.current
        if (stable.letter === letter) stable.frames += 1
        else stableGestureRef.current = { letter, frames: 1, committed: false }
        setDetected(letter); setConfidence(Math.round(score * 100))
        if (stableGestureRef.current.frames >= 10 && !stableGestureRef.current.committed) {
          setTranscript((value) => value.endsWith(letter) ? value : `${value}${letter}`)
          stableGestureRef.current.committed = true
        }
      } else stableGestureRef.current = { letter: '', frames: 0, committed: false }
    }
    frameRef.current = requestAnimationFrame(recognizeFrame)
  }

  async function toggleCamera() {
    if (cameraOn) {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      if (videoRef.current) videoRef.current.srcObject = null
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
      stableGestureRef.current = { letter: '', frames: 0, committed: false }
      setCameraOn(false)
      return
    }
    try {
      setCameraError('')
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      streamRef.current = stream
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play() }
      setCameraOn(true)
      setModelStatus(recognizerRef.current ? 'Live recognition active' : 'Waiting for hand model…')
      frameRef.current = requestAnimationFrame(recognizeFrame)
    } catch {
      setCameraError('Camera access was blocked. You can still explore the demo with sample recognition.')
    }
  }

  function addLetter() { setTranscript((value) => value + detected) }
  function copyTranscript() { navigator.clipboard?.writeText(transcript) }

  return (
    <main className="kaizen-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Kaizen home"><span className="brand-mark"><Hand /></span><span>kaizen</span><span className="beta-pill">BETA</span></a>
        <nav className="topnav" aria-label="Main navigation"><a href="#workspace">Workspace</a><a href="#capabilities">Capabilities</a><a href="#how">How it works</a><a href="#about">About</a></nav>
        <div className="top-actions"><span className="live-dot"><i /> Browser-only</span><button className="icon-button" aria-label="Help"><CircleHelp /></button></div>
      </header>

      <section className="hero" id="top"><div className="eyebrow"><span className="eyebrow-line" /> ACCESSIBILITY TECHNOLOGY</div><h1>Communication without<br /><em>barriers.</em></h1><p>Kaizen translates ASL fingerspelling into text — and text back into signs. A private, browser-first tool built for more connected conversations.</p><div className="hero-badges"><span><Check /> Camera stays on your device</span><span><Check /> ASL alphabet beta</span></div></section>

      <section className="workspace" id="workspace">
        <div className="mode-tabs" role="tablist" aria-label="Translation mode"><button className={mode === 'recognize' ? 'active' : ''} onClick={() => setMode('recognize')} role="tab" aria-selected={mode === 'recognize'}><Camera /> Sign to text <span>01</span></button><button className={mode === 'translate' ? 'active' : ''} onClick={() => setMode('translate')} role="tab" aria-selected={mode === 'translate'}><Hand /> Text to sign <span>02</span></button></div>
        {mode === 'recognize' ? <div className="recognize-grid">
          <section className="camera-card"><div className="card-head"><div><span className="section-label">LIVE INPUT</span><h2>Show us a sign</h2></div><span className="status-chip"><i /> {cameraOn ? 'Camera active' : 'Ready to connect'}</span></div><div className="camera-frame">{cameraOn ? <video ref={videoRef} muted playsInline aria-label="Live camera preview" /> : <div className="camera-empty"><div className="camera-orb"><Camera /></div><strong>Your camera preview will appear here</strong><span>Position your hand inside the frame and hold your sign steady.</span></div>}<div className="corner tl" /><div className="corner tr" /><div className="corner bl" /><div className="corner br" /><span className="frame-label">HAND POSITION</span></div><div className="model-note"><span className={modelStatus === 'Live recognition active' || modelStatus === 'Model ready' ? 'model-ready' : ''} />{modelStatus}<small>Hold one clear alphabet sign steady for about one second.</small></div>{cameraError && <p className="error-note">{cameraError}</p>}<div className="camera-controls"><button className="primary-button" onClick={toggleCamera}>{cameraOn ? <Square /> : <Camera />}{cameraOn ? 'Stop camera' : 'Start camera'}</button><button className="secondary-button" onClick={() => { setDetected(alphabet[Math.floor(Math.random() * alphabet.length)]); setConfidence(84 + Math.floor(Math.random() * 14)) }}><Sparkles /> Try sample sign</button></div></section>
          <section className="result-card"><div className="card-head"><div><span className="section-label">RECOGNITION RESULT</span><h2>What Kaizen sees</h2></div><span className="ai-chip"><Sparkles /> AI assisted</span></div><div className="detected-stage"><div className="sign-glyph">{signImages[detected]}</div><div className="detected-letter">{detected}<span>Detected sign</span></div><div className="confidence"><div className="confidence-top"><span>Confidence</span><strong>{confidence}%</strong></div><div className="meter"><i style={{ width: `${confidence}%` }} /></div></div></div><div className="transcript-box"><div className="transcript-top"><span>YOUR TRANSCRIPT</span><button onClick={copyTranscript} aria-label="Copy transcript"><Copy /></button></div><p>{transcript || <span className="placeholder">Your recognized letters will build here...</span>}</p></div><div className="result-controls"><button className="secondary-button" onClick={() => setTranscript('')}><Trash2 /> Clear</button><button className="primary-button" onClick={addLetter}>Add “{detected}” <span>↵</span></button></div></section>
        </div> : <section className="translate-panel"><div className="translate-input"><div className="card-head"><div><span className="section-label">TEXT INPUT</span><h2>Type a message</h2></div><span className="count-label">{text.length}/160</span></div><textarea value={text} maxLength={160} onChange={(event) => { setText(event.target.value); setCurrent(0) }} aria-label="Message to translate" /><div className="translate-actions"><button className="primary-button" onClick={() => setPlaying(!playing)}>{playing ? <Pause /> : <Play />}{playing ? 'Pause signs' : 'Play signs'}</button><button className="secondary-button" onClick={() => { setText(''); setPlaying(false) }}><RotateCcw /> Reset</button></div></div><div className="sign-stage"><div className="card-head"><div><span className="section-label">ASL FINGERSPELLING</span><h2>Sign sequence</h2></div><span className="progress-label">{sequence.length ? current + 1 : 0} / {sequence.length}</span></div><div className="big-sign">{currentSign === ' ' ? <span className="space-sign">space</span> : signImages[currentSign] || '✋'}</div><div className="sequence-strip">{sequence.slice(0, 12).map((letter, index) => <button key={`${letter}-${index}`} className={index === current ? 'selected' : ''} onClick={() => setCurrent(index)} aria-label={`Show ${letter}`}>{letter === ' ' ? '·' : letter}</button>)}</div><div className="player-controls"><button onClick={() => setCurrent((current - 1 + sequence.length) % Math.max(sequence.length, 1))} aria-label="Previous sign"><ChevronLeft /></button><button className="play-round" onClick={() => setPlaying(!playing)} aria-label={playing ? 'Pause' : 'Play'}>{playing ? <Pause /> : <Play />}</button><button onClick={() => setCurrent((current + 1) % Math.max(sequence.length, 1))} aria-label="Next sign"><ChevronRight /></button><span className="speed-label">1.0x</span></div></div></section>}
      </section>

      <section className="capabilities-section" id="capabilities"><div className="capabilities-head"><div><span className="section-label">PROTOTYPE CAPABILITIES</span><h2>See what&apos;s possible today.</h2></div><p>This beta recognizes a focused set of static hand poses and can fingerspell typed messages one letter at a time.</p></div><div className="capability-grid"><article className="capability-card capability-card-main"><div className="capability-card-top"><span className="capability-icon"><Camera /></span><span className="capability-status">LIVE NOW</span></div><h3>Sign to text</h3><p>Show a clear hand pose to the camera and Kaizen will identify it, score its confidence, and add stable letters to your transcript.</p><div className="recognized-list"><span className="list-label">RECOGNIZED IN THIS PROTOTYPE</span><div className="letter-pills">{['A','B','D','E','L','V','Y'].map((letter) => <button key={letter} onClick={() => { setMode('recognize'); setDetected(letter) }} aria-label={`Preview recognized sign ${letter}`}><b>{signImages[letter]}</b><span>{letter}</span></button>)}</div></div></article><article className="capability-card"><div className="capability-card-top"><span className="capability-icon"><Hand /></span><span className="capability-status capability-status-teal">LIVE NOW</span></div><h3>Text to signs</h3><p>Type a short message and move through the ASL fingerspelling sequence. Play, pause, or select any letter.</p><div className="mini-sequence"><span>H</span><span>E</span><span>L</span><span>L</span><span>O</span><i>→</i><strong>✋</strong></div></article><article className="capability-card capability-card-future"><div className="capability-card-top"><span className="capability-icon"><Sparkles /></span><span className="capability-status capability-status-muted">NEXT</span></div><h3>Continuous ASL</h3><p>Future versions will understand transitions, facial expression, movement, and full signed sentences from trained ASL datasets. We also look forward to a functional SDK and a wearable hardware glove that translates hand gestures into text and audio.</p><div className="future-track"><span /><span /><span /><span /></div></article></div></section>

      <section className="how-section" id="how"><div className="section-intro"><span className="section-label">DESIGNED FOR REAL CONVERSATIONS</span><h2>Small steps. <em>More connection.</em></h2><p>Kaizen means continuous improvement. We are starting with ASL fingerspelling — a focused foundation for a more inclusive future.</p></div><div className="how-grid"><article><span className="step-number">01</span><Wifi /><h3>Private by design</h3><p>Camera frames are processed in your browser and never uploaded or stored.</p></article><article><span className="step-number">02</span><Sparkles /><h3>Intelligent feedback</h3><p>Confidence scoring helps you know when a sign is clear enough to commit.</p></article><article><span className="step-number">03</span><Clipboard /><h3>Built to grow</h3><p>Our classifier is structured for richer temporal ASL models as datasets mature.</p></article></div></section>
      <footer id="about"><div className="brand"><span className="brand-mark"><Hand /></span><span>kaizen</span></div><span>Technology without barriers · NCC Hackathon 2026</span><span className="footer-note">ASL fingerspelling beta</span></footer>
    </main>
  )
}
