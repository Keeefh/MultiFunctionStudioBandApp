import { useState, useEffect, useRef, useCallback } from 'react';
import ChordBoard from './ChordBoard';
import StrumBoard from './StrumBoard';
import './GuitarEngine.css';

function GuitarEngine({ audioCtx, analyser, setCurrentVisualizedSample, setCurrentPlaybackTime, currentVisualizedAudioRef, socket, roomId, username, userVolumes = {}, isVisible = true }) {
  
  // WebAudioFont player refs
  const playerRef = useRef(null);
  const instrRef = useRef(null);
  // Queue for remote strums that arrive before the instrument is ready
  const pendingRemoteStrumsRef = useRef([]);
  const [pendingRemoteCount, setPendingRemoteCount] = useState(0);
  const [guitarReady, setGuitarReady] = useState(false);

  // Chord board state (10 boards with default keybinds)
  const defaultChordKeys = ['q', 'w', 'e', 'r', 't', 'a', 's', 'd', 'f', 'g'];
  const defaultChords = ['C', 'G', 'Am', 'F', 'Dm', 'Em', 'D', 'A', 'E', 'Bm'];
  
  const [chordBoards, setChordBoards] = useState(() =>
    defaultChordKeys.map((key, i) => ({ 
      key, 
      chord: defaultChords[i] || 'C', 
      strumSpeed: 0.03,
      mode: 'chord',
      octave: 3,
      index: i    
    }))
  );
  
  const [activeChordIndex, setActiveChordIndex] = useState(null);
  const [vibratingStrings, setVibratingStrings] = useState([]);
  const guitarSvgRef = useRef(null);

  // Strum keybinds (2 boards)
  const [strumDownKey, setStrumDownKey] = useState('arrowdown');
  const [strumUpKey, setStrumUpKey] = useState('arrowup');

  // Initialize WebAudioFont player
  useEffect(() => {
    const tryInit = () => {
      if (!window.WebAudioFontPlayer) {
        console.log('❌ WebAudioFontPlayer not loaded yet');
        return;
      }
      
      // Instrument variable name from the loaded script
      const instrVarName = '_tone_0253_Acoustic_Guitar_sf2_file';  // ✅ MATCHES the script
      if (!window[instrVarName]) {
        console.log('❌ Instrument not loaded yet:', instrVarName);
        return;
      }

      playerRef.current = new window.WebAudioFontPlayer();
      playerRef.current.loader.decodeAfterLoading(audioCtx, instrVarName);
      instrRef.current = window[instrVarName];
      // mark ready so queued remote strums can be flushed
      setGuitarReady(true);
      
      console.log('✅ WebAudioFont guitar initialized', playerRef.current, instrRef.current);
    };

    tryInit();
    
    // Fallback polling (extended to 30s to accommodate slow loads)
    const poll = setInterval(tryInit, 500);
    const stopPoll = setTimeout(() => clearInterval(poll), 30000);

    return () => {
      clearInterval(poll);
      clearTimeout(stopPoll);
    }; 
  }, [audioCtx]);

  // Apply vibration classes to SVG strings
  const [svgHasInternalStrings, setSvgHasInternalStrings] = useState(false)
  const overlayRef = useRef(null)

  useEffect(() => {
    const el = guitarSvgRef.current
    if (!el) return

    const tryDetect = () => {
      const svgDoc = el.contentDocument
      if (!svgDoc) {
        setSvgHasInternalStrings(false)
        return
      }
      const firstString = svgDoc.getElementById('string-1')
      if (firstString) {
        setSvgHasInternalStrings(true)
        // ensure no overlay is shown
        return
      }
      setSvgHasInternalStrings(false)
    }

    // run detection now and whenever the object fires load
    tryDetect()
    const onLoad = () => tryDetect()
    el.addEventListener && el.addEventListener('load', onLoad)
    return () => el.removeEventListener && el.removeEventListener('load', onLoad)
  }, [])

  useEffect(() => {
    // If the SVG contains internal strings we update those directly
    if (svgHasInternalStrings) {
      const svgDoc = guitarSvgRef.current?.contentDocument
      if (!svgDoc) return

      for (let i = 1; i <= 6; i++) {
        const stringEl = svgDoc.getElementById(`string-${i}`)
        if (stringEl) stringEl.classList.remove('vibrating')
      }
      vibratingStrings.forEach(num => {
        const stringEl = svgDoc.getElementById(`string-${num}`)
        if (stringEl) stringEl.classList.add('vibrating')
      })
      return
    }

    // Fallback: use overlay fake strings (positioned on top of the image)
    const overlay = overlayRef.current
    if (!overlay) return
    // clear first
    overlay.querySelectorAll('.fake-string').forEach(el => el.classList.remove('vibrating'))
    vibratingStrings.forEach(num => {
      const el = overlay.querySelector(`.fake-string.string-${num}`)
      if (el) el.classList.add('vibrating')
    })
  }, [vibratingStrings, svgHasInternalStrings])

  // Helper: map chord name to MIDI notes
  const getMidiNotesForChord = (chordName, rootOctave = 3) => {
    const rootNoteToMidi = { 
      C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 
      'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 
    };
    
    const m = chordName.match(/^([A-G]#?)(.*)/i);
    if (!m) return [48, 52, 55];
    
    const root = m[1].toUpperCase();
    const type = (m[2] || '').toLowerCase();
    const base = 12 * rootOctave + (rootNoteToMidi[root] ?? 0);
    
    // Comprehensive chord formulas
    if (type === 'm') return [base, base + 3, base + 7];
    if (type === '7') return [base, base + 4, base + 7, base + 10];
    if (type === 'm7') return [base, base + 3, base + 7, base + 10];
    if (type === 'maj7') return [base, base + 4, base + 7, base + 11];
    if (type === '5') return [base, base + 7]; // Power chord
    if (type === 'sus2') return [base, base + 2, base + 7];
    if (type === 'sus4') return [base, base + 5, base + 7];
    if (type === 'dim') return [base, base + 3, base + 6];
    if (type === 'aug') return [base, base + 4, base + 8];
    return [base, base + 4, base + 7]; // default major
  };

  const performStrum = useCallback((payload = {}, direction = 'down', { isRemote = false, userId } = {}) => {
    const player = playerRef.current;
    const instr = instrRef.current;
    const ac = audioCtx;

    if (!player || !instr || !ac) {
      console.warn('WebAudioFont not ready');
      return;
    }

    const {
      chord,
      octave = 3,
      strumSpeed = 0.03,
      activeChordIndex = null
    } = payload;

    if (!chord) {
      console.warn('No chord data provided for strum');
      return;
    }

    const midiNotes = getMidiNotesForChord(chord, octave);
    const ordered = direction === 'down' ? midiNotes : [...midiNotes].reverse();
    const start = ac.currentTime + 0.02;
    const step = strumSpeed || 0.03;
    const duration = step > 0.08 ? 2.0 : 3.5;
    const resolvedVolume = (() => {
      if (isRemote && userId && userVolumes) {
        return userVolumes[userId] ?? 1.0;
      }
      if (!isRemote && username && userVolumes) {
        return userVolumes[username] ?? 1.0;
      }
      return 1.0;
    })();
    const volume = Math.min(1, Math.max(0, resolvedVolume));

    ordered.forEach((midi, i) => {
      const when = start + i * step;
      try {
        // Create per-note GainNode so volume/mute is enforced
        const out = ac.createGain();
        out.gain.value = volume;
        out.connect(ac.destination);
        // Use out as destination for queueWaveTable so volume is controlled by the gain
        player.queueWaveTable(ac, out, instr, when, midi, duration, 1.0);
        // Disconnect after the note has finished to free resources
        setTimeout(() => {
          try { out.disconnect(); } catch (e) { /* ignore */ }
        }, (duration + 0.1) * 1000);
      } catch (err) {
        // Fallback if GainNode creation fails
        player.queueWaveTable(ac, ac.destination, instr, when, midi, duration, volume);
      }
    });

    const stringIndices = midiNotes.map((_, i) => (i % 6) + 1);
    setVibratingStrings(stringIndices);
    setTimeout(() => setVibratingStrings([]), 600);

    if (!isRemote && roomId && socket && username) {
      socket.emit('play-instrument', {
        roomId,
        instrument: 'guitar',
        userId: username,
        chordData: {
          chord,
          octave,
          strumSpeed: step,
          direction,
          activeChordIndex
        }
      });
    }

    const playStyle = step > 0.08 ? 'arpeggio' : 'strum';
    console.log(`${isRemote ? 'Remote' : 'Local'} ${playStyle} ${direction}: ${chord} Oct${octave} (speed: ${step}s)`, midiNotes);
  }, [audioCtx, roomId, socket, username, userVolumes]);

  // Strum function
  const strumActiveChord = (direction = 'down', isRemote = false) => {
    const board = (activeChordIndex !== null) ? chordBoards[activeChordIndex] : null;
    if (!board) {
      console.warn('No active chord selected');
      return;
    }

    const chordPayload = {
      chord: board.chord,
      octave: board.octave,
      strumSpeed: board.strumSpeed,
      activeChordIndex: board.index ?? activeChordIndex
    };

    performStrum(chordPayload, direction, { isRemote });
  };

  // Play single note (for note mode)
  const playNote = (chordName, octave) => {
    const player = playerRef.current;
    const instr = instrRef.current;
    const ac = audioCtx;
    
    if (!player || !instr || !ac) return;
    
    const midiNotes = getMidiNotesForChord(chordName, octave);
    const rootNote = midiNotes[0];
    
    player.queueWaveTable(ac, ac.destination, instr, ac.currentTime, rootNote, 2.0, 1.0);
    console.log(`Played note: ${chordName} Oct${octave} (MIDI: ${rootNote})`);
  };

  useEffect(() => {
    if (!socket) return;

    const handleRemoteInstrument = (data = {}) => {
      if (data.instrument !== 'guitar') return;
      if (data.userId && data.userId === username) return;
      if (data.roomId && roomId && data.roomId !== roomId) return;
      if (!data.chordData) return;

      const playerReady = !!(playerRef.current && instrRef.current && audioCtx && guitarReady);
      if (!playerReady) {
        console.log('Queuing remote guitar strum until player ready:', data.chordData);
        pendingRemoteStrumsRef.current.push(data);
        setPendingRemoteCount(pendingRemoteStrumsRef.current.length);
        return;
      }

      performStrum(data.chordData, data.chordData.direction || 'down', { isRemote: true, userId: data.userId });
    }; 

    socket.on('play-instrument', handleRemoteInstrument);
    return () => {
      socket.off('play-instrument', handleRemoteInstrument);
    };
  }, [socket, username, roomId, performStrum, guitarReady]);

  // Manual replay utility for queued remote strums (visible in UI)
  const replayQueuedRemoteStrums = useCallback(() => {
    const queued = [...pendingRemoteStrumsRef.current];
    if (!queued || queued.length === 0) return;
    console.log(`Manually replaying ${queued.length} queued remote guitar strum(s)`);
    queued.forEach((d) => {
      try {
        performStrum(d.chordData, d.chordData.direction || 'down', { isRemote: true, userId: d.userId });
      } catch (err) {
        console.error('Failed to play queued remote strum', err);
      }
    });
    pendingRemoteStrumsRef.current = [];
    setPendingRemoteCount(0);
  }, [performStrum]);

  // Automatic flush when instrument becomes ready
  useEffect(() => {
    if (!guitarReady) return;
    const queued = [...pendingRemoteStrumsRef.current];
    if (!queued || queued.length === 0) return;
    console.log(`Flushing ${queued.length} pending remote guitar strum(s)`);
    queued.forEach((d) => {
      try {
        performStrum(d.chordData, d.chordData.direction || 'down', { isRemote: true, userId: d.userId });
      } catch (err) {
        console.error('Failed to play queued remote strum', err);
      }
    });
    pendingRemoteStrumsRef.current = [];
    setPendingRemoteCount(0);
  }, [guitarReady, performStrum]);

  // Keyboard handler: left-hand chord selection, right-hand strumming
  useEffect(() => {
    const onKeyDown = (e) => {
      // Ignore if user is typing in an input field
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) {
        return;
      }

      const key = (e.key || '').toLowerCase();

      // Left-hand chord/note selection
      const idx = chordBoards.findIndex(b => b.key === key);
      if (idx !== -1) {
        setActiveChordIndex(idx);
        console.log('Active board:', chordBoards[idx].chord, 'mode:', chordBoards[idx].mode, 'oct:', chordBoards[idx].octave);
        
        // If note mode, play immediately (no strum needed)
        if (chordBoards[idx].mode === 'note') {
          playNote(chordBoards[idx].chord, chordBoards[idx].octave);
        }
        return;
      }

      // Right-hand strum keys
      if (key === strumDownKey) {
        strumActiveChord('down');
        return;
      }
      if (key === strumUpKey) {
        strumActiveChord('up');
        return;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [chordBoards, activeChordIndex, strumDownKey, strumUpKey, audioCtx]);

  // Update chord for a specific board
  const updateChordBoard = (index, newKey, newChord, newStrumSpeed, newMode, newOctave) => {
    setChordBoards(prev => prev.map((board, i) => 
      i === index ? { 
        ...board, 
        key: newKey || board.key, 
        chord: newChord || board.chord,
        strumSpeed: newStrumSpeed !== undefined ? newStrumSpeed : board.strumSpeed,
        mode: newMode || board.mode,
        octave: newOctave !== undefined ? newOctave : board.octave
      } : board
    ));
  };

  return (
    <div className="guitar-engine" style={{ display: isVisible ? 'block' : 'none' }}>
      <h2>Virtual Guitar</h2>
      
      {/* Guitar Visual */}
      <div className="guitar-visual-container" style={{ position: 'relative' }}>
        <object 
          ref={guitarSvgRef}
          data="/Frame 1.svg" 
          type="image/svg+xml"
          className="guitar-svg"
          style={{
            maxWidth: '100%',
            height: 'auto',
            filter: vibratingStrings.length > 0 ? 'drop-shadow(0 0 10px rgba(218, 150, 65, 0.5))' : 'none',
            transition: 'filter 0.1s ease',
            pointerEvents: 'none'
          }}
          aria-label="Interactive Guitar Visualization"
        />

        {/* Overlay fallback visible when the imported SVG lacks internal string elements */}
        <div ref={overlayRef} className="guitar-overlay" aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: svgHasInternalStrings ? 'none' : 'block' }}>
          {[1,2,3,4,5,6].map((i) => (
            <div key={i} className={`fake-string string-${i}`} style={{ position: 'absolute', left: `${10 + (i-1) * 13}%`, top: '10%', bottom: '10%', width: '2px', background: 'rgba(255, 255, 255, 0.6)', transformOrigin: 'center', transition: 'transform 0.12s ease' }} />
          ))}
        </div>
      </div>
      
      {/* Chord Boards (10) */}
      <div className="chord-boards-container">
        <h3>Chord Boards (Left Hand)</h3>
        <div className="queued-remote-controls" style={{ marginBottom: '8px' }}>
          <button type="button" onClick={replayQueuedRemoteStrums} disabled={pendingRemoteCount === 0}>
            Replay queued remote strums ({pendingRemoteCount})
          </button>
        </div>

        
        {chordBoards.map((board, i) => (
          <ChordBoard
            key={i}
            index={i}
            keyBind={board.key}
            chord={board.chord}
            strumSpeed={board.strumSpeed}
            mode={board.mode}
            octave={board.octave}
            isActive={activeChordIndex === i}
            onUpdate={(newKey, newChord, newStrumSpeed, newMode, newOctave) => 
              updateChordBoard(i, newKey, newChord, newStrumSpeed, newMode, newOctave)
            }
          />
        ))}
      </div>

      {/* Strum Boards (2) */}
      <div className="strum-boards-container">
        <h3>Strum Keys (Right Hand)</h3>
        <StrumBoard
          label="Strum Down"
          keyBind={strumDownKey}
          onUpdate={setStrumDownKey}
        />
        <StrumBoard
          label="Strum Up"
          keyBind={strumUpKey}
          onUpdate={setStrumUpKey}
        />
      </div>
    </div>
  );
}

export default GuitarEngine;