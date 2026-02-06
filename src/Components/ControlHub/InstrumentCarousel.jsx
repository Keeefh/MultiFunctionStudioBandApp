import React, { useState } from 'react';
import { motion } from 'framer-motion';

// Instrument Carousel with Floating/3D Parallax Effect
export default function InstrumentCarousel({ selectedInstrument, onInstrumentChange }) {
  const instruments = [
    { id: 'GUITAR', name: 'Guitar', icon: '/guitarMenuIcon.png' },
    { id: 'PADS', name: 'Pads', icon: '/PadSampleIcon.png' },
  ];

  const currentIndex = instruments.findIndex(i => i.id === selectedInstrument);
  const [direction, setDirection] = useState(0);

  const slideVariants = {
    enter: (dir) => ({
      x: dir > 0 ? 1000 : -1000,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (dir) => ({
      zIndex: 0,
      x: dir < 0 ? 1000 : -1000,
      opacity: 0,
    }),
  };

  const shadowVariants = {
    hidden: { scaleX: 0.8, opacity: 0.3 },
    visible: { scaleX: 1, opacity: 0.6 },
  };

  const handleNext = () => {
    setDirection(1);
    const nextIndex = (currentIndex + 1) % instruments.length;
    onInstrumentChange(instruments[nextIndex].id);
  };

  const handlePrev = () => {
    setDirection(-1);
    const prevIndex = (currentIndex - 1 + instruments.length) % instruments.length;
    onInstrumentChange(instruments[prevIndex].id);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        gap: '40px',
        padding: '40px 20px',
      }}
    >
      {/* Carousel Container */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '400px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {/* Left Chevron - Discord style */}
        <motion.button
          onClick={handlePrev}
          whileHover={{ scale: 1.1, background: 'rgba(255, 255, 255, 0.15)' }}
          whileTap={{ scale: 0.95 }}
          style={{
            position: 'absolute',
            left: '20px',
            zIndex: 10,
            background: 'rgba(79, 84, 92, 0.6)',
            border: 'none',
            color: '#dcddde',
            width: '48px',
            height: '48px',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.15s ease',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M15 18L9 12L15 6"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </motion.button>

        {/* Instrument Display with Floating Effect */}
        <motion.div
          key={currentIndex}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: 'spring', stiffness: 300, damping: 30 },
            opacity: { duration: 0.5 },
          }}
          style={{
            position: 'absolute',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Floating Instrument Image */}
          <motion.img
            src={instruments[currentIndex].icon}
            alt={instruments[currentIndex].name}
            animate={{
              y: [0, -20, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{
              width: '340px',
              height: '340px',
              objectFit: 'contain',
              filter: 'drop-shadow(0 20px 40px rgba(0, 0, 0, 0.4))',
            }}
          />

          {/* Floating Shadow (pulsing) */}
          <motion.div
            variants={shadowVariants}
            animate="visible"
            style={{
              position: 'absolute',
              bottom: '-40px',
              width: '340px',
              height: '40px',
              borderRadius: '50%',
              background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 70%)',
            }}
          />
        </motion.div>

        {/* Right Chevron - Discord style */}
        <motion.button
          onClick={handleNext}
          whileHover={{ scale: 1.1, background: 'rgba(255, 255, 255, 0.15)' }}
          whileTap={{ scale: 0.95 }}
          style={{
            position: 'absolute',
            right: '20px',
            zIndex: 10,
            background: 'rgba(79, 84, 92, 0.6)',
            border: 'none',
            color: '#dcddde',
            width: '48px',
            height: '48px',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.15s ease',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M9 6L15 12L9 18"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </motion.button>
      </div>

      {/* Instrument Name */}
      <motion.h2
        key={`name-${currentIndex}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          color: '#fff',
          fontSize: '32px',
          fontWeight: '700',
          margin: 0,
          letterSpacing: '2px',
        }}
      >
        {instruments[currentIndex].name.toUpperCase()}
      </motion.h2>

      {/* Pagination Dots */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center',
        }}
      >
        {instruments.map((_, idx) => (
          <motion.div
            key={idx}
            animate={{
              scale: idx === currentIndex ? 1.2 : 1,
              opacity: idx === currentIndex ? 1 : 0.5,
            }}
            onClick={() => {
              setDirection(idx > currentIndex ? 1 : -1);
              onInstrumentChange(instruments[idx].id);
            }}
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: '#fff',
              cursor: 'pointer',
            }}
          />
        ))}
      </div>
    </div>
  );
}
