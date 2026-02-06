import { useState } from 'react';

function ChordBoard({ index, keyBind, chord, strumSpeed = 0.03, mode = 'chord', octave = 3, arpeggio = false, isActive, onUpdate }) {
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [isEditingChord, setIsEditingChord] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  // Comprehensive chord/note library
  const allChordsNotes = [
    'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
    'Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'A#m', 'Bm',
    'C7', 'D7', 'E7', 'F7', 'G7', 'A7', 'B7',
    'Cm7', 'Dm7', 'Em7', 'Fm7', 'Gm7', 'Am7', 'Bm7',
    'Cmaj7', 'Dmaj7', 'Emaj7', 'Fmaj7', 'Gmaj7', 'Amaj7', 'Bmaj7',
    'C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5',
    'Csus2', 'Dsus2', 'Esus2', 'Fsus2', 'Gsus2', 'Asus2', 'Bsus2',
    'Csus4', 'Dsus4', 'Esus4', 'Fsus4', 'Gsus4', 'Asus4', 'Bsus4',
    'Cdim', 'Ddim', 'Edim', 'Fdim', 'Gdim', 'Adim', 'Bdim',
    'Caug', 'Daug', 'Eaug', 'Faug', 'Gaug', 'Aaug', 'Baug'
  ];
  
  const filteredChords = searchValue
    ? allChordsNotes.filter(c => c.toLowerCase().includes(searchValue.toLowerCase()))
    : allChordsNotes.slice(0, 12); // Show first 12 by default

  const handleKeyChange = (e) => {
    const newKey = e.target.value.toLowerCase();
    if (newKey) {
      onUpdate(newKey, chord);
      setIsEditingKey(false);
    }
  };

  const handleChordChange = (selectedChord) => {
    if (selectedChord) {
      onUpdate(keyBind, selectedChord, strumSpeed, mode, octave);
      setIsEditingChord(false);
      setSearchValue('');
    }
  };

  const handleSearchChange = (e) => {
    setSearchValue(e.target.value);
  };

  const handleStrumSpeedChange = (e) => {
    const newSpeed = parseFloat(e.target.value);
    onUpdate(keyBind, chord, newSpeed, mode, octave);
  };

  const toggleMode = () => {
    const newMode = mode === 'chord' ? 'note' : 'chord';
    onUpdate(keyBind, chord, strumSpeed, newMode, octave);
  };

  const handleOctaveChange = (direction) => {
    const newOctave = direction === 'up' ? Math.min(5, octave + 1) : Math.max(2, octave - 1);
    onUpdate(keyBind, chord, strumSpeed, mode, newOctave);
  };

  return (
    <div className={`chord-board ${isActive ? 'active' : ''}`}>
      <span className="board-label">Board {index + 1}:</span>
      
      {/* Keybind Input */}
      {isEditingKey ? (
        <input
          type="text"
          maxLength="1"
          defaultValue={keyBind}
          onBlur={handleKeyChange}
          onKeyDown={(e) => e.key === 'Enter' && handleKeyChange(e)}
          autoFocus
          className="key-input"
        />
      ) : (
        <button onClick={() => setIsEditingKey(true)} className="key-button">
          Key: {keyBind.toUpperCase()}
        </button>
      )}

      {/* Chord Selector */}
      {isEditingChord ? (
        <div className="chord-search-container">
          <input
            type="text"
            value={searchValue}
            onChange={handleSearchChange}
            onBlur={() => setTimeout(() => setIsEditingChord(false), 200)}
            placeholder="Search chord/note..."
            autoFocus
            className="chord-search-input"
          />
          <div className="chord-suggestions">
            {filteredChords.slice(0, 8).map(c => (
              <button
                key={c}
                onClick={() => handleChordChange(c)}
                className="chord-suggestion"
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <button onClick={() => setIsEditingChord(true)} className="chord-button">
          {mode === 'chord' ? 'Chord' : 'Note'}: {chord}
        </button>
      )}

      {/* Mode Toggle - Clear Tabs */}
      <div className="mode-toggle-container">
        <button
          onClick={() => mode !== 'chord' && toggleMode()}
          className={`mode-tab ${mode === 'chord' ? 'active' : ''}`}
        >
          CHORD
        </button>
        <button
          onClick={() => mode !== 'note' && toggleMode()}
          className={`mode-tab ${mode === 'note' ? 'active' : ''}`}
        >
          NOTE
        </button>
      </div>

      {/* Octave Control */}
      <div className="octave-control">
        <button onClick={() => handleOctaveChange('down')} className="octave-btn" disabled={octave <= 2}>−</button>
        <span className="octave-display">Oct {octave}</span>
        <button onClick={() => handleOctaveChange('up')} className="octave-btn" disabled={octave >= 5}>+</button>
      </div>

      {/* Unified Speed Slider - only show in chord mode */}
      {mode === 'chord' && (
      <div className="strum-speed-container">
        <input
          type="range"
          min="0.01"
          max="0.5"
          step="0.01"
          value={strumSpeed}
          onChange={handleStrumSpeedChange}
          className="strum-speed-slider"
          title={`Speed: ${strumSpeed < 0.08 ? 'Fast Strum' : 'Slow Arpeggio'}`}
        />
      </div>
      )}
    </div>
  );
}

export default ChordBoard;