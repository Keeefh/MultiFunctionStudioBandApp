import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Suspended Pouch Navbar - Clean, Simple Design
export default function ControlHub({ onModeChange, activeMode = 'instruments' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState(activeMode);

  const handleToggle = () => setIsOpen(!isOpen);
  const handleMode = (m) => {
    setMode(m);
    if (onModeChange) onModeChange(m);
  };

  return (
    <>
      {/* Main navbar container */}
      <motion.div
        initial={{ y: -200 }}
        animate={{ y: isOpen ? 0 : -140 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          pointerEvents: 'auto',
          backgroundColor: 'rgba(24, 24, 27, 0.8)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(113, 113, 122, 0.3)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
        }}
      >
        {/* Content: Binary Toggle */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            justifyContent: 'center',
            width: '280px',
          }}
        >
          {/* Instruments Button */}
          <motion.button
            onClick={() => handleMode('instruments')}
            animate={{
              backgroundColor: mode === 'instruments' ? 'rgba(39, 39, 42, 0.8)' : 'transparent',
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{
              flex: 1,
              padding: '10px 20px',
              borderRadius: '999px',
              border: 'none',
              color: mode === 'instruments' ? '#fff' : '#a1a1aa',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'color 0.2s ease',
            }}
          >
            Instruments
          </motion.button>

          {/* Multiplayer Button */}
          <motion.button
            onClick={() => handleMode('multiplayer')}
            animate={{
              backgroundColor: mode === 'multiplayer' ? 'rgba(39, 39, 42, 0.8)' : 'transparent',
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{
              flex: 1,
              padding: '10px 20px',
              borderRadius: '999px',
              border: 'none',
              color: mode === 'multiplayer' ? '#fff' : '#a1a1aa',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'color 0.2s ease',
            }}
          >
            Multiplayer
          </motion.button>
        </div>
      </motion.div>

      {/* Pouch Handle - Always visible, clickable */}
      <motion.button
        onClick={handleToggle}
        animate={{ rotate: isOpen ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        style={{
          position: 'fixed',
          top: '0',
          right: '32px',
          zIndex: 101,
          width: '80px',
          height: '48px',
          padding: 0,
          border: 'none',
          borderBottomLeftRadius: '24px',
          borderBottomRightRadius: '24px',
          borderTopLeftRadius: '8px',
          borderTopRightRadius: '8px',
          backgroundColor: 'rgba(24, 24, 27, 0.9)',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: '16px',
          pointerEvents: 'auto',
        }}
      >
        ▼
      </motion.button>
    </>
  );
}
