import React, { useState } from 'react'

export default function ControlHub({ instrumentName = 'PIANO', userCount = 0, onQuickChange = () => {}, onShareInvite = () => {} }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div style={{ position: 'fixed', top: 8, left: 8, right: 8, zIndex: 9999, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ fontWeight: '700' }}>Drummer</div>
        <div style={{ fontSize: 12, color: '#666' }}>Users: {userCount}</div>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ padding: '6px 10px', borderRadius: 6, background: '#111', color: 'white' }}>
          {instrumentName}
        </div>

        <button onClick={() => { onQuickChange(); setExpanded(false) }} style={{ padding: '6px 10px', borderRadius: 6 }}>
          Quick Guitar
        </button>

        <button onClick={() => { onShareInvite(); setExpanded(false) }} style={{ padding: '6px 10px', borderRadius: 6 }}>
          Share Invite
        </button>

        <button aria-label={expanded ? 'Collapse' : 'Expand'} onClick={() => setExpanded(s => !s)} style={{ width: 36, height: 36, borderRadius: 9999 }}>
          {expanded ? '▴' : '▾'}
        </button>
      </div>

      {expanded && (
        <div style={{ position: 'absolute', top: 48, right: 8, background: 'white', color: '#111', borderRadius: 6, padding: 12, boxShadow: '0 6px 18px rgba(0,0,0,0.12)' }}>
          <div style={{ marginBottom: 6 }}>Quick Actions</div>
          <button onClick={() => { onQuickChange(); setExpanded(false) }} style={{ display: 'block', width: '100%', padding: '8px 10px', borderRadius: 4, marginBottom: 6 }}>Go Guitar</button>
          <button onClick={() => { onShareInvite(); setExpanded(false) }} style={{ display: 'block', width: '100%', padding: '8px 10px', borderRadius: 4 }}>Copy Invite Link</button>
        </div>
      )}
    </div>
  )
}
