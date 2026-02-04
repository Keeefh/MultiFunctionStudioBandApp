import React, { useCallback, useEffect, useRef, useState } from 'react';
import './MultiplayerPanel.css';

function MultiplayerPanel({ socket, isConnected, roomId, setRoomId, username, setUsername, users = [], userVolumes = {}, onUserVolumeChange }) {
    const [inputRoomId, setInputRoomId] = useState('');
    const [inputUsername, setInputUsername] = useState('');
    const [isJoining, setIsJoining] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [draftVolume, setDraftVolume] = useState(1);
    const [isVoiceActive, setIsVoiceActive] = useState(false);
    const [voiceStatus, setVoiceStatus] = useState('idle');
    const [voiceError, setVoiceError] = useState('');
    const pcRef = useRef(null);
    const localStreamRef = useRef(null);
    const remoteAudioRef = useRef(null);

    const handleJoinRoom = () => {
        if (inputRoomId.trim() && inputUsername.trim()) {
            setIsJoining(true);
            setRoomId(inputRoomId);
            setUsername(inputUsername);
            
            console.log(`🚀 Joining room: ${inputRoomId}`);
            
            socket.emit('join-room', { 
                roomId: inputRoomId, 
                userId: inputUsername,
                activeSamples: []  // Join with empty samples (will receive from other users)
            });
            
            setInputRoomId('');
            setInputUsername('');
            setIsJoining(false);
        }
    };

    const cleanupVoiceChat = useCallback(() => {
        pcRef.current?.getSenders().forEach(sender => {
            if (sender.track) {
                sender.track.stop();
            }
        });
        pcRef.current?.close();
        pcRef.current = null;

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
        }

        if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = null;
        }

        setIsVoiceActive(false);
        setVoiceStatus('idle');
    }, []);

    const handleLeaveRoom = () => {
        cleanupVoiceChat();
        socket.disconnect();
        socket.connect();
        setRoomId('');
        setUsername('');
    };

    const handleUserDoubleClick = (user) => {
        if (!user || !user.username) {
            return;
        }
        const currentVolume = userVolumes[user.username] ?? 1;
        setEditingUser(user.username);
        setDraftVolume(currentVolume);
    };

    const handleVolumeChange = (userId, value) => {
        if (!userId) {
            return;
        }
        const parsed = Number(value);
        setDraftVolume(parsed);
        if (onUserVolumeChange) {
            onUserVolumeChange(userId, parsed);
        }
    };

    const ensureLocalStream = useCallback(async () => {
        if (localStreamRef.current) {
            return localStreamRef.current;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            localStreamRef.current = stream;
            return stream;
        } catch (err) {
            setVoiceError('Microphone permission required for voice chat.');
            throw err;
        }
    }, []);

    const attachLocalTracks = useCallback((pc) => {
        const stream = localStreamRef.current;
        if (!stream) {
            return;
        }

        const existingTrackIds = pc.getSenders()
            .map(sender => sender.track?.id)
            .filter(Boolean);

        stream.getTracks().forEach(track => {
            if (!existingTrackIds.includes(track.id)) {
                pc.addTrack(track, stream);
            }
        });
    }, []);

    const createPeerConnection = useCallback(() => {
        if (pcRef.current) {
            return pcRef.current;
        }

        const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        pc.onicecandidate = (event) => {
            if (event.candidate && roomId) {
                socket.emit('voice-ice-candidate', {
                    roomId,
                    candidate: event.candidate,
                    from: username,
                });
            }
        };

        pc.ontrack = (event) => {
            const [stream] = event.streams;
            if (remoteAudioRef.current && stream) {
                remoteAudioRef.current.srcObject = stream;
            }
        };

        pc.onconnectionstatechange = () => {
            setVoiceStatus(pc.connectionState);
            if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
                cleanupVoiceChat();
            }
        };

        if (localStreamRef.current) {
            attachLocalTracks(pc);
        }

        pcRef.current = pc;
        return pc;
    }, [attachLocalTracks, cleanupVoiceChat, roomId, socket, username]);

    const startVoiceChat = useCallback(async () => {
        if (!roomId || !username) {
            return;
        }

        try {
            setVoiceError('');
            setVoiceStatus('starting');
            await ensureLocalStream();
            const pc = createPeerConnection();
            attachLocalTracks(pc);

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            setIsVoiceActive(true);
            socket.emit('voice-offer', {
                roomId,
                offer: pc.localDescription,
                from: username,
            });
        } catch (error) {
            console.error('Failed to start voice chat', error);
            setVoiceError(error.message || 'Unable to start voice chat.');
            cleanupVoiceChat();
        }
    }, [attachLocalTracks, cleanupVoiceChat, createPeerConnection, ensureLocalStream, roomId, socket, username]);

    const stopVoiceChat = useCallback(() => {
        cleanupVoiceChat();
        if (roomId) {
            socket.emit('voice-hangup', { roomId, from: username });
        }
    }, [cleanupVoiceChat, roomId, socket, username]);

    const closeEditor = () => setEditingUser(null);

    useEffect(() => {
        if (!roomId) {
            cleanupVoiceChat();
        }
    }, [cleanupVoiceChat, roomId]);

    useEffect(() => {
        const handleOffer = async ({ roomId: targetRoomId, offer, from }) => {
            if (targetRoomId !== roomId || from === username) {
                return;
            }

            try {
                setVoiceError('');
                await ensureLocalStream();
                const pc = createPeerConnection();
                attachLocalTracks(pc);
                await pc.setRemoteDescription(new RTCSessionDescription(offer));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                setIsVoiceActive(true);
                socket.emit('voice-answer', {
                    roomId,
                    answer: pc.localDescription,
                    from: username,
                });
            } catch (error) {
                console.error('Failed to handle incoming offer', error);
                setVoiceError(error.message || 'Unable to accept call.');
                cleanupVoiceChat();
            }
        };

        const handleAnswer = async ({ roomId: targetRoomId, answer, from }) => {
            if (targetRoomId !== roomId || from === username) {
                return;
            }
            const pc = pcRef.current;
            if (!pc) {
                return;
            }
            try {
                await pc.setRemoteDescription(new RTCSessionDescription(answer));
                setVoiceStatus('connected');
            } catch (error) {
                console.error('Failed to handle voice answer', error);
                setVoiceError(error.message || 'Unable to finalize call.');
            }
        };

        const handleIceCandidate = async ({ roomId: targetRoomId, candidate, from }) => {
            if (targetRoomId !== roomId || from === username || !candidate) {
                return;
            }
            try {
                const pc = createPeerConnection();
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (error) {
                console.error('Failed to add ICE candidate', error);
            }
        };

        const handleHangup = ({ roomId: targetRoomId }) => {
            if (targetRoomId !== roomId) {
                return;
            }
            cleanupVoiceChat();
        };

        socket.on('voice-offer', handleOffer);
        socket.on('voice-answer', handleAnswer);
        socket.on('voice-ice-candidate', handleIceCandidate);
        socket.on('voice-hangup', handleHangup);

        return () => {
            socket.off('voice-offer', handleOffer);
            socket.off('voice-answer', handleAnswer);
            socket.off('voice-ice-candidate', handleIceCandidate);
            socket.off('voice-hangup', handleHangup);
        };
    }, [attachLocalTracks, cleanupVoiceChat, createPeerConnection, ensureLocalStream, roomId, socket, username]);

    useEffect(() => () => cleanupVoiceChat(), [cleanupVoiceChat]);

    return (
        <div className="multiplayer-panel">
            <h2>🎵 Multiplayer Room</h2>
            
            <div className="connection-status">
                <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></span>
                {isConnected ? 'Connected' : 'Disconnected'}
            </div>

            {!roomId ? (
                <div className="join-room-section">
                    <input 
                        type="text" 
                        placeholder="Your Name" 
                        value={inputUsername}
                        onChange={(e) => setInputUsername(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
                        disabled={isJoining}
                    />
                    <input 
                        type="text" 
                        placeholder="Room ID (e.g., jam-session-1)" 
                        value={inputRoomId}
                        onChange={(e) => setInputRoomId(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
                        disabled={isJoining}
                    />
                    <button 
                        onClick={handleJoinRoom}
                        disabled={isJoining || !isConnected}
                        style={{
                            opacity: isJoining || !isConnected ? 0.6 : 1,
                            cursor: isJoining || !isConnected ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {isJoining ? 'Joining...' : 'Join Room'}
                    </button>
                    {!isConnected && <p style={{ color: 'red', fontSize: '12px' }}>⚠️ Disconnected from server</p>}
                </div>
            ) : (
                <div className="room-info-section">
                    <div className="room-details">
                        <p><strong>Room:</strong> {roomId}</p>
                        <p><strong>You:</strong> {username}</p>
                    </div>
                    
                    <div className="users-list">
                        <h3>Users in Room ({users.length})</h3>
                        <p className="users-hint">Double-click a name to adjust their volume.</p>
                        <ul>
                            {users.map((user, index) => {
                                const volumePercent = Math.round(((userVolumes[user.username] ?? 1) * 100));
                                const isEditing = editingUser === user.username;
                                return (
                                    <li 
                                        key={user.username || index}
                                        onDoubleClick={() => handleUserDoubleClick(user)}
                                        className={isEditing ? 'editing' : ''}
                                    >
                                        <div className="user-row">
                                            <span>
                                                {user.username} {user.username === username && '(You)'}
                                            </span>
                                            <span className="user-volume-tag">{volumePercent}%</span>
                                        </div>
                                        {isEditing && (
                                            <div className="user-volume-editor">
                                                <input 
                                                    type="range"
                                                    min="0"
                                                    max="1"
                                                    step="0.05"
                                                    value={draftVolume}
                                                    onChange={(e) => handleVolumeChange(user.username, e.target.value)}
                                                />
                                                <span className="user-volume-value">{Math.round(draftVolume * 100)}%</span>
                                                <button type="button" onClick={closeEditor}>Done</button>
                                            </div>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </div>

                    <div className="voice-chat-section">
                        <h3>Voice Chat</h3>
                        <p className="users-hint">Two users can click start to open a shared mic session.</p>
                        <div className="voice-controls">
                            <button
                                type="button"
                                onClick={isVoiceActive ? stopVoiceChat : startVoiceChat}
                                disabled={!isConnected || !roomId}
                            >
                                {isVoiceActive ? 'Stop Voice Chat' : 'Start Voice Chat'}
                            </button>
                            <span className="voice-status">Status: {voiceStatus}</span>
                        </div>
                        <audio ref={remoteAudioRef} autoPlay playsInline />
                        {voiceError && <p className="voice-error">{voiceError}</p>}
                    </div>

                    <button onClick={handleLeaveRoom} className="leave-button">
                        Leave Room
                    </button>
                </div>
            )}
        </div>
    );
}

export default MultiplayerPanel;
