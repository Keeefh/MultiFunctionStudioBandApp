import { useState } from 'react';

function StrumBoard({ label, keyBind, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);

  const handleKeyChange = (e) => {
    if (e.key && e.key.length > 0) {
      onUpdate(e.key.toLowerCase());
      setIsEditing(false);
    }
  };

  return (
    <div className="strum-board">
      <span className="strum-label">{label}:</span>
      
      {isEditing ? (
        <input
          type="text"
          placeholder="Press a key..."
          onKeyDown={handleKeyChange}
          onBlur={() => setIsEditing(false)}
          autoFocus
          className="strum-input"
        />
      ) : (
        <button onClick={() => setIsEditing(true)} className="strum-button">
          Key: {keyBind.toUpperCase()}
        </button>
      )}
    </div>
  );
}

export default StrumBoard;