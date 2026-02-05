import React, { useState } from 'react';
import { motion } from 'framer-motion';
import InstrumentCarousel from './InstrumentCarousel';

// Suspended Pouch Navbar with 70-80% expanded panel
export default function ControlHub({ onModeChange, selectedInstrument, onInstrumentChange, activeMode = 'instruments' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState('instruments');

  const handleToggle = () => setIsOpen(!isOpen);
  const handleMode = (m) => {
    setMode(m);
    if (onModeChange) onModeChange(m);
  };

  return (
    <>
      {/* Overlay - Darkens background when open */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleToggle}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            zIndex: 99,
            backdropFilter: 'blur(4px)',
          }}
        />
      )}

      {/* Main Panel - 70-80% of screen height */}
      <motion.div
        initial={{ y: '-100%' }}
        animate={{ y: isOpen ? 0 : '-100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '75vh',
          zIndex: 100,
          pointerEvents: 'auto',
          backgroundColor: 'rgba(24, 24, 27, 0.95)',
          backdropFilter: 'blur(20px)',
          borderBottom: '2px solid rgba(113, 113, 122, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header with Toggle Buttons */}
        <div
          style={{
            padding: '20px',
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid rgba(113, 113, 122, 0.3)',
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
              maxWidth: '200px',
              padding: '12px 24px',
              borderRadius: '999px',
              border: 'none',
              color: mode === 'instruments' ? '#fff' : '#a1a1aa',
              fontSize: '16px',
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
              maxWidth: '200px',
              padding: '12px 24px',
              borderRadius: '999px',
              border: 'none',
              color: mode === 'multiplayer' ? '#fff' : '#a1a1aa',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'color 0.2s ease',
            }}
          >
            Multiplayer
          </motion.button>
        </div>

        {/* Content Area */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            display: mode === 'instruments' ? 'flex' : 'none',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {mode === 'instruments' && (
            <InstrumentCarousel
              selectedInstrument={selectedInstrument}
              onInstrumentChange={onInstrumentChange}
            />
          )}
        </div>

        {/* Multiplayer Content (placeholder) */}
        {mode === 'multiplayer' && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#a1a1aa',
              fontSize: '18px',
            }}
          >
            Multiplayer Panel Coming Soon
          </div>
        )}
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
