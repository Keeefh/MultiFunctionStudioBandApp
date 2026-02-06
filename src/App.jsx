import { useMemo, useState, useEffect } from 'react';
import './App.css'
import './index.css'
import './Components/PadsSection/PadsSection.css'
import PadButton from "./Components/PadButton Component/PadButton.jsx";
import { getAudio } from './Components/Audioloader_Component/Getaudio.jsx'
import LibraryBrowser from './Components/libraryBrowser/libraryBrowser.jsx';
import { useRef } from 'react';
import { LiveAudioVisualizer } from './Components/liveAudioVisualizer/LiveAudioVisualizer';
import GuitarEngine from './Components/GuitarEngine/GuitarEngine';
import MultiplayerPanel from './Components/MultiplayerPanel/MultiplayerPanel';
import ControlHub from './Components/ControlHub/ControlHub';
import { initSocket } from './utils/socketClient';

function App() {
  const [byKit, setByKit] = useState({});
  const [kits, setKits] = useState([]);  
  const [currentKit, setCurrentKit] = useState(null);  
  const [selectedFiles, setSelectedFiles] = useState([]);  
  const [picked, setPicked] = useState([]);  
  const [selectedSamples, setSelectedSamples] = useState([]); // For Selected  section
  const [selectedSample, setSelectedSample] = useState(null); // Sample being assigned
  const [isAssigningSample, setIsAssigningSample] = useState(false);  
  const padButtonRef=useRef(null)
  const noteBook=useRef(null)
  const[currentVisualizedSample,setCurrentVisualizedSample]=useState(null)
  const currentVisualizedAudioRef = useRef(null);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0); 
  const [selectedInstrument, setSelectedInstrument] = useState('PADS');
  const [activeMode, setActiveMode] = useState('instruments');

  // Multiplayer/socket state
  const [socket, setSocket] = useState(null);
  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState('');
  const [users, setUsers] = useState([]);
  const [userVolumes, setUserVolumes] = useState({});

  // Sync picked pads from selectedSamples on initial load (only if no picks exist yet)
  useEffect(() => {
    if (selectedSamples && selectedSamples.length > 0) {
      const hasAssigned = picked && picked.some(Boolean);
      if (!hasAssigned) {
        const maxPads = 9;
        const newPicked = Array.from({ length: maxPads }).map((_, i) => selectedSamples[i] || null);
        setPicked(newPicked);
      }
    }
  }, [selectedSamples]);

  // Initialize socket once (used by MultiplayerPanel)
  useEffect(() => {
    const s = initSocket();
    setSocket(s);

    // Normalize users array - convert strings to objects if needed
    const normalizeUsers = (arr) => {
      if (!Array.isArray(arr)) return [];
      return arr.map(u => typeof u === 'string' ? { username: u } : u);
    };

    // Handle room-users event (user list updates)
    const handleRoomUsers = (payload) => {
      console.log('📋 room-users event received:', payload);
      // Handle different payload formats from server
      if (Array.isArray(payload)) {
        // Server sends array directly
        setUsers(normalizeUsers(payload));
      } else if (payload && Array.isArray(payload.users)) {
        // Server sends { users: [...] }
        setUsers(normalizeUsers(payload.users));
      }
    };

    // Handle room-joined event (when joining a room)
    const handleRoomJoined = (payload) => {
      console.log('🚪 room-joined event received:', payload);
      // Update users if the payload includes a users array
      if (payload && Array.isArray(payload.users)) {
        setUsers(payload.users);
      }
    };

    // Handle user-joined event (when another user joins)
    const handleUserJoined = (payload) => {
      console.log('👋 user-joined event received:', payload);
      if (payload && payload.user) {
        setUsers(prev => {
          // Avoid duplicates
          const exists = prev.some(u => u.username === payload.user.username);
          if (exists) return prev;
          return [...prev, payload.user];
        });
      } else if (payload && payload.users) {
        setUsers(payload.users);
      }
    };

    // Handle user-left event (when a user leaves)
    const handleUserLeft = (payload) => {
      console.log('👋 user-left event received:', payload);
      if (payload && payload.username) {
        setUsers(prev => prev.filter(u => u.username !== payload.username));
      } else if (payload && payload.userId) {
        setUsers(prev => prev.filter(u => u.username !== payload.userId));
      } else if (payload && Array.isArray(payload.users)) {
        setUsers(payload.users);
      }
    };

    s.on && s.on('room-users', handleRoomUsers);
    s.on && s.on('room-joined', handleRoomJoined);
    s.on && s.on('user-joined', handleUserJoined);
    s.on && s.on('user-left', handleUserLeft);

    return () => {
      s.off && s.off('room-users', handleRoomUsers);
      s.off && s.off('room-joined', handleRoomJoined);
      s.off && s.off('user-joined', handleUserJoined);
      s.off && s.off('user-left', handleUserLeft);
      try { s.disconnect(); } catch (e) { /* ignore */ }
    };
  }, []);


  //for liveAudioVisualization
  const [audioCtx]= useState(()=>new(window.AudioContext||window.webkitAudioContext)()); //basically operating system for the audio
  const [analyser]= useState(()=>{
    const analyserNode= audioCtx.createAnalyser()
    analyserNode.fftSize = 1024;
  analyserNode.smoothingTimeConstant = 0.4;
  return analyserNode;
  })

  // Listen for pad-pressed events from other users in the room
  useEffect(() => {
    if (!socket) return;

    const handleRemotePadPress = async (data) => {
      const { sampleName, userId } = data;

      // Don't play if it's from ourselves
      if (userId === username) return;

      console.log(`🎵 ${userId} played: ${sampleName}`);

      // Find the sample in picked array by name
      const sample = picked.find(p => p && p.name === sampleName);
      if (sample && sample.src) {
        // Apply user volume if set
        const volume = userVolumes[userId] ?? 1;

        // Resume audio context if suspended
        if (audioCtx.state === 'suspended') {
          try { await audioCtx.resume(); } catch (e) { /* ignore */ }
        }

        const audio = new Audio(sample.src);
        audio.volume = volume;
        audio.play().catch(err => console.warn('Failed to play remote sample:', err));
      }
    };

    socket.on('pad-pressed', handleRemotePadPress);

    return () => {
      socket.off('pad-pressed', handleRemotePadPress);
    };
  }, [socket, username, picked, userVolumes, audioCtx]);

  useEffect(() => {
  console.log("Picked array has been updated:", picked);
}, [picked]);  // Log when picked state changes


   useEffect(() => {
   console.log("isAssigningSample has been updated:", isAssigningSample);
   console.log("selectedSample has been updated:", selectedSample);

}, [selectedSample, isAssigningSample]); // Log the state every time it updates

 useEffect(() => {
  const handleClickOutside = (event) => {
    const outsideLibrary = noteBook.current && !noteBook.current.contains(event.target);
    const outsidePad = padButtonRef.current && !padButtonRef.current.contains(event.target);

    if (outsideLibrary && outsidePad) {
      console.log("✅ Click detected outside both LibraryBrowser and PadButton!");
      
      if (isAssigningSample) {
        console.log("Resetting assignment mode and selected sample");
        setIsAssigningSample(false);
        setSelectedSample(null);
      }
    }
  };

  window.addEventListener("mouseup", handleClickOutside);

  return () => {
    window.removeEventListener("mouseup", handleClickOutside);
  };
}, [isAssigningSample]);
const handlePadButtonClick = async (index) => {
  
    if (isAssigningSample && selectedSample) {
        // Create a new copy of the picked array
        const updatedPicked = [...picked];
        
        // Check if index is valid and update the sample for the clicked pad button
        if (index >= 0 && index < updatedPicked.length) {
            updatedPicked[index] = selectedSample;
        }

        // Log the updated array for debugging purposes
        console.log("Updated picked array:", updatedPicked);

        // Update the picked state immutably
        setPicked(updatedPicked); 

        // Reset assignment mode and selected sample
        setIsAssigningSample(false);
        setSelectedSample(null);
    } else {
      const sampleToPlay = picked[index];
    console.log("handlePadButtonClick - sampleToPlay:", sampleToPlay); // Check what's here
    if (sampleToPlay && sampleToPlay.src && sampleToPlay.fileObject) {
      // Ensure the AudioContext is resumed (browsers require user gesture to start audio)
      if (audioCtx.state === 'suspended') {
        try {
          await audioCtx.resume();
          console.log('AudioContext resumed');
        } catch (e) {
          console.warn('Failed to resume AudioContext', e);
        }
      }
      console.log("handlePadButtonClick - fileObject found:", sampleToPlay.fileObject);
      console.log("handlePadButtonClick - type of fileObject:", typeof sampleToPlay.fileObject, sampleToPlay.fileObject instanceof Blob); // Is it a Blob?

  const audio = new Audio(sampleToPlay.src);
  // allow the audio to be used as a MediaElementSource without CORS tainting
  audio.crossOrigin = 'anonymous';
      const track = audioCtx.createMediaElementSource(audio) //deems  padButton audio  valid in  audioCTX operating system
      track.connect(analyser);
      analyser.connect(audioCtx.destination);
      
      if(currentVisualizedAudioRef.current){//removes the previous visualized audio , this context only runs if the user clicks on the padButton when the audio hasne end already hence the hadleAduioEnded didnt run 
        currentVisualizedAudioRef.current.removeEventListener('timeupdate',currentVisualizedAudioRef.current.handleTimeUpdate);
        currentVisualizedAudioRef.current.removeEventListener('ended',currentVisualizedAudioRef.current.handleAudioEnded);
      }

      currentVisualizedAudioRef.current= audio  
      setCurrentVisualizedSample(sampleToPlay.fileObject);
      setCurrentPlaybackTime(0);
      console.log("handlePadButtonClick - currentVisualizedSample set to:", sampleToPlay.fileObject);
      
      const handleTimeUpdate=()=>{
        if(currentVisualizedAudioRef.current===audio){
          setCurrentPlaybackTime(audio.currentTime)//currentTime represents the live countup
              console.log("Time update:", audio.currentTime); // Add this!

        }
      }

      const handleAudioEnded=()=>{
        setCurrentPlaybackTime(0);
        currentVisualizedAudioRef.current=null;
        setCurrentVisualizedSample(null);

        audio.removeEventListener("timeupdate", handleTimeUpdate);
        audio.removeEventListener("ended",handleAudioEnded);
      }

      //this is to reference the fucntions at the current Audio so it can be used later at the removeEventListeener since they need to use the same current function to work 
      audio.handleTimeUpdate=handleTimeUpdate;
      audio.handleAudioEnded=handleAudioEnded;
      

      //this stars the audio and for the function to wrok
      audio.addEventListener("timeupdate",handleTimeUpdate)
      audio.addEventListener("ended",handleAudioEnded)
      audio.play();

      // Broadcast pad press to other users in the room
      if (socket && roomId && username) {
        socket.emit('pad-pressed', {
          roomId,
          sampleName: sampleToPlay.name,
          userId: username,
        });
      }

    }

                else if(sampleToPlay && sampleToPlay.src && !sampleToPlay.fileObject){
                    console.warn(`Sample at index ${index} (${sampleToPlay.name}) has no 'fileObject'. Cannot visualize.`);
                    if (audioCtx.state === 'suspended') {
                      try { await audioCtx.resume(); } catch (e) { console.warn('Failed to resume AudioContext', e); }
                    }
             const audio = new Audio(sampleToPlay.src);
             audio.crossOrigin = 'anonymous';
             audio.play(); // Still play, but warn about visualization

             // Broadcast pad press to other users in the room
             if (socket && roomId && username) {
               socket.emit('pad-pressed', {
                 roomId,
                 sampleName: sampleToPlay.name,
                 userId: username,
               });
             }
    }
            else{            console.warn(`No sample assigned to pad ${index}.`);
}
};}



useEffect(() => {
    const loadAudioData = async () => { // Define an async function inside useEffect
        const result = await getAudio(); // AWAIT the Promise returned by getAudio
        setByKit(result); // Update state once the data is fully loaded
    };

    loadAudioData(); // Call the async function
}, []); 

  useEffect(() => {
    if (byKit && Object.keys(byKit).length > 0) {
      const firstKitSamples = byKit[Object.keys(byKit)[0]];
      setPicked(firstKitSamples); 
      setSelectedSamples(firstKitSamples)
    }
  }, [byKit]);

  const buttonKey = ['t','y','u','g','h','j','v','b','n']
  const buttonKeyIndex = buttonKey.length;  

  useEffect(() => {
    const onKeyDown = (e) => {
      const active= document.activeElement
      if(active && (active.tagName ==="INPUT" || active.tagName ==="TEXTAREA" || active.isContentEditable)) {
        return; // Ignore ui interactions
    }
  const key = (e.key || '').toLowerCase();
    const idx = buttonKey.indexOf(key);
    if (idx !== -1) {
      // Trigger visual feedback for keyboard press
      const padButtons = document.querySelectorAll('.pad-btn');
      if (padButtons[idx]) {
        padButtons[idx].classList.add('keyboard-pressed');
        setTimeout(() => {
          padButtons[idx].classList.remove('keyboard-pressed');
        }, 150);
      }
      void handlePadButtonClick(idx);
      e.preventDefault
    }
   }  
  
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [buttonKey,handlePadButtonClick]);

  if (!byKit || Object.keys(byKit).length === 0) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <ControlHub
        selectedInstrument={selectedInstrument}
        onInstrumentChange={setSelectedInstrument}
        activeMode={activeMode}
        onModeChange={setActiveMode}
        socket={socket}
        isConnected={socket ? socket.connected : false}
        roomId={roomId}
        setRoomId={setRoomId}
        username={username}
        setUsername={setUsername}
        users={users}
        userVolumes={userVolumes}
        onUserVolumeChange={(id, val) => setUserVolumes(prev => ({ ...prev, [id]: val }))}
      />
      <div id="main" className="w-100 vh-100 m-0">

      {activeMode === 'MULTIPLAYER' ? (
        <div style={{ padding: '16px', height: 'calc(100vh - 64px)', overflow: 'auto' }}>
          <MultiplayerPanel
            socket={socket}
            isConnected={socket ? socket.connected : false}
            roomId={roomId}
            setRoomId={setRoomId}
            username={username}
            setUsername={setUsername}
            users={users}
            userVolumes={userVolumes}
            onUserVolumeChange={(id, val) => setUserVolumes(prev => ({ ...prev, [id]: val }))}
          />
        </div>
      ) : selectedInstrument === 'GUITAR' ? (
        <div className="d-flex align-items-center justify-content-center w-100 h-100">
          <GuitarEngine
            audioCtx={audioCtx}
            analyser={analyser}
            setCurrentVisualizedSample={setCurrentVisualizedSample}
            setCurrentPlaybackTime={setCurrentPlaybackTime}
            currentVisualizedAudioRef={currentVisualizedAudioRef}
            socket={socket}
            roomId={roomId}
            username={username}
            userVolumes={userVolumes}
            isVisible={true}
          />
        </div>
      ) : selectedInstrument === 'PADS' ? (
        <div className="pads-section">
          {/* LEFT: Pad Grid Device */}
          <div id="keyboard-section" className="pads-keyboard-section">
            <h3 className="pads-section-title">DRUM PADS</h3>

            <div ref={padButtonRef} className="pads-grid" id="pad-page">
              {Array.from({ length: buttonKeyIndex }).map((_, index) => (
                <PadButton
                  padButtonRef={padButtonRef}
                  key={buttonKey[index]}
                  audioSrc={picked[index] ? picked[index].src : null}
                  buttName={picked[index] ? `${picked[index].name}  \nButton ${buttonKey[index]}` : `Button ${buttonKey[index]}`}
                  onClick={() => handlePadButtonClick(index)}
                />
              ))}
            </div>

            {isAssigningSample && selectedSample && (
              <div className="pads-assign-indicator">
                ▸ ASSIGN: {selectedSample.name}
              </div>
            )}
          </div>

          {/* TOP-RIGHT: Library Browser Device */}
          <div id="instrument-section" className="pads-library-section">
            <h3 className="pads-section-title">SAMPLE LIBRARY</h3>

            <div className="pads-library-content">
              <div className="pads-library-inner">
                <LibraryBrowser
                  libraryRef={noteBook}
                  byKit={byKit}
                  kits={kits}
                  setKits={setKits}
                  currentKit={currentKit}
                  setCurrentKit={setCurrentKit}
                  selectedFiles={selectedFiles}
                  setSelectedFiles={setSelectedFiles}
                  picked={picked}
                  setPicked={setPicked}
                  selectedSamples={selectedSamples}
                  setSelectedSamples={setSelectedSamples}
                  isAssigningSample={isAssigningSample}
                  setIsAssigningSample={setIsAssigningSample}
                  selectedSample={selectedSample}
                  setSelectedSample={setSelectedSample}
                />
              </div>
            </div>
          </div>

          {/* BOTTOM-RIGHT: Audio Visualizer Device */}
          <div id="wave-page" className="pads-visualizer-section">
            <h3 className="pads-section-title">SPECTRUM ANALYZER</h3>

            <div className="pads-visualizer-content">
              <div className="pads-visualizer-inner">
                <LiveAudioVisualizer
                  analyser={analyser}
                  width="100%"
                  height="100%"
                  barColor="rgba(0, 217, 163, 0.8)"
                  backgroundColor="transparent"
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', color: '#fff', fontSize: '18px' }}>
          Select an instrument from the Control Hub
        </div>
      )}
    </div>
    </>
  ) 
}

export default App;
