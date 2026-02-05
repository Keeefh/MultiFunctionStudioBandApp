import { useEffect, useState } from "react";
import { getAudio } from "../Audioloader_Component/Getaudio";
import "./libraryBrowser.css";

const uploadSamples = async (fileArray, backendUrl) => {
  const formData = new FormData()
  fileArray.forEach(file => {
    formData.append('samples', file)
  })
  const response = await fetch(`${backendUrl}/upload`, {
    method: 'POST',
    body: formData
  })
  const result = await response.json()
  return result
}

const LibraryBrowser = ({
    byKit,
    kits,
    setKits,
    currentKit,
    setCurrentKit,
    selectedFiles,
    setSelectedFiles,
    picked,
    setPicked,
    selectedSamples,
    setSelectedSamples,
    isAssigningSample,
    setIsAssigningSample,
    selectedSample,
    setSelectedSample,
    libraryRef,
    onCompressComplete
}) => {
    
    const [availableKits, setAvailableKits] = useState({})
    const [selectedKitCheckboxes, setSelectedKitCheckboxes] = useState({})
    const [selectedSampleCheckboxes, setSelectedSampleCheckboxes] = useState({})
    const [expandedKits, setExpandedKits] = useState({})
    const [compressing, setCompressing] = useState(false)
    const [compressionProgress, setCompressionProgress] = useState('')
    const [compressionStatus, setCompressionStatus] = useState('Not Compressed')
    const [backendUrl] = useState('http://localhost:5000')

    // Load available kits from assets on mount
    useEffect(() => {
        const loadKits = async () => {
            const kitsData = await getAudio()
            setAvailableKits(kitsData)
        }
        loadKits()
    }, [])

    // Play sample preview
    const playPreview = (src) => {
        const audio = new Audio(src)
        audio.play().catch(err => console.log('Preview play error:', err))
    }

    // Handle kit checkbox
    const toggleKitCheckbox = (kitName) => {
        setSelectedKitCheckboxes(prev => {
            const newState = { ...prev }
            newState[kitName] = !newState[kitName]

            // If kit checked, auto-check all samples in it
            if (newState[kitName]) {
                const samples = availableKits[kitName] || []
                samples.forEach(sample => {
                    setSelectedSampleCheckboxes(p => ({
                        ...p,
                        [`${kitName}-${sample.name}`]: true
                    }))
                })
            }

            setCompressionStatus('Not Compressed')
            return newState
        })
    }

    // Handle sample checkbox
    const toggleSampleCheckbox = (kitName, sampleName) => {
        setSelectedSampleCheckboxes(prev => {
            const key = `${kitName}-${sampleName}`
            const newState = { ...prev }
            newState[key] = !newState[key]
            setCompressionStatus('Not Compressed')
            return newState
        })
    }

    // Get all selected file objects for compression
    const getSelectedFileObjects = async () => {
        const files = []
        const entries = Object.entries(selectedSampleCheckboxes).filter(([_, isSelected]) => isSelected)
        
        for (const [key] of entries) {
            const [kitName, sampleName] = key.split('-')
            const samples = availableKits[kitName] || []
            const sample = samples.find(s => s.name === sampleName)
            
            // Use fileObject directly (already a Blob) instead of fetching
            if (sample && sample.fileObject) {
                try {
                    const file = new File([sample.fileObject], sample.name, { 
                        type: sample.fileObject.type || 'audio/wav' 
                    })
                    files.push(file)
                    console.log(`✅ Added ${sample.name} for compression`)
                } catch (err) {
                    console.error(`Failed to process ${sample.name}:`, err)
                }
            } else if (sample && sample.src) {
                // Fallback: try to use src if fileObject not available
                try {
                    const response = await fetch(sample.src)
                    const blob = await response.blob()
                    const file = new File([blob], sample.name, { type: blob.type })
                    files.push(file)
                    console.log(`✅ Added ${sample.name} for compression`)
                } catch (err) {
                    console.error(`Failed to fetch ${sample.name}:`, err)
                }
            }
        }
        return files
    }

    // Compress & Share button handler
    const handleCompressAndShare = async () => {
        const filesToCompress = await getSelectedFileObjects()

        if (filesToCompress.length === 0) {
            setCompressionProgress('No samples selected or failed to load')
            return
        }

        setCompressing(true)
        setCompressionStatus('Compressing...')
        setCompressionProgress(`Compressing 0/${filesToCompress.length}...`)

        try {
            const result = await uploadSamples(filesToCompress, backendUrl)

            if (!result.success) {
                throw new Error(result.error || 'Compression failed')
            }

            setCompressionStatus('✓ Compressed & Uploaded')
            setCompressionProgress(`✓ ${result.samples.length} sample(s) uploaded`)

            // Pass compressed samples to parent for joining room
            if (onCompressComplete) {
                onCompressComplete(result.samples)
            }

        } catch (err) {
            console.error('Compression error:', err)
            setCompressionStatus('✗ Compression Failed')
            setCompressionProgress(err.message)
        } finally {
            setCompressing(false)
        }
    }

    // Handle folder pick and kit/sample management
    const handleFolderPick = (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        setSelectedFiles(prev => [...prev, ...files]);

        const folderName = files[0].webkitRelativePath?.split("/")[0] || "User Kit";

        const samples = files
            .filter(f => /\.(wav|mp3|ogg)$/i.test(f.name))
            .map(file => ({
                name: file.name.replace(/\.(wav|mp3|ogg)$/i, ""),
                src: URL.createObjectURL(file),
                fileObject:file
            }));

        setKits(prev => {
            const kitId = `kit_${folderName.toLowerCase().replace(/\s+/g, "_")}`;
            const newKit = { id: kitId, name: folderName, samples };
            const existingIndex = prev.findIndex(k => k.id === kitId);
            if (existingIndex === -1) return [...prev, newKit];
            const updated = [...prev];
            updated[existingIndex] = newKit;
            return updated;
        });

        setCurrentKit(`kit_${folderName.toLowerCase().replace(/\s+/g, "_")}`);
        e.target.value = "";
    };

    useEffect(() => {
        if (byKit) {
            const kitsArray = Object.entries(byKit).map(([kitName, samples]) => ({
                id: kitName,
                name: kitName.replace(/_/g, " "),
                samples,
            }));
            setKits(kitsArray);
            if (kitsArray.length && !currentKit) setCurrentKit(kitsArray[0].id);
        }
    }, [byKit, currentKit, setKits, setCurrentKit]);

    // Auto-select the first kit's samples on initial load so the app has defaults
    useEffect(() => {
        if (Object.keys(availableKits).length === 0) return;
        const firstKitName = Object.keys(availableKits)[0];
        // If no sample checkboxes are set yet, pre-select all samples in the first kit
        if (Object.keys(selectedSampleCheckboxes).length === 0) {
            const newSampleCheckboxes = {};
            const samples = availableKits[firstKitName] || [];
            samples.forEach(s => {
                newSampleCheckboxes[`${firstKitName}-${s.name}`] = true;
            });
            setSelectedSampleCheckboxes(newSampleCheckboxes);
            setSelectedKitCheckboxes(prev => ({ ...prev, [firstKitName]: true }));
            // Update parent with selected samples
            setSelectedSamples && setSelectedSamples(samples);
        }
    }, [availableKits]);

    // Keep parent `selectedSamples` in sync when user changes checkboxes
    useEffect(() => {
        if (!setSelectedSamples) return;
        const selected = [];
        Object.entries(selectedSampleCheckboxes).forEach(([key, isSelected]) => {
            if (!isSelected) return;
            const [kitName, sampleName] = key.split('-');
            const sample = (availableKits[kitName] || []).find(s => s.name === sampleName);
            if (sample) selected.push(sample);
        });
        setSelectedSamples(selected);
    }, [selectedSampleCheckboxes, availableKits, setSelectedSamples]);

    const handleSampleRemove = (sampleToRemove) => {
        setSelectedSamples(prev => prev.filter(s => s.src !== sampleToRemove.src));

        setPicked(prev => {
            const updatedPicked = [...prev];
            const indexToRemove = updatedPicked.findIndex(s => s?.src === sampleToRemove.src);
            if (indexToRemove !== -1) {
                updatedPicked[indexToRemove] = null;
            }
            return updatedPicked;
        });
    };

    return (
        <div id="library-browser-container" ref={libraryRef} style={{ width: "100%", display: "flex", gap: "12px", fontSize: "11px" }}>
            {/* File/Folder Picker */}
            <div style={{ border: "1px solid #ccc", padding: "12px", width: "200px" }}>
                <h3>Select Files or Folders</h3>
                <input type="file" webkitdirectory="true" multiple onChange={handleFolderPick} />
                <h4>Selected Files:</h4>
                <ul style={{ fontSize: "12px", maxHeight: "300px", overflowY: "auto" }}>
                    {selectedFiles.map((file, idx) => <li key={idx}>{file.name}</li>)}
                </ul>
            </div>

            {/* Available Kits with Checkboxes */}
            <div style={{ border: "1px solid #ccc", padding: "12px", width: "250px", overflowY: "auto", maxHeight: "500px" }}>
                <h3>Available Kits</h3>
                {Object.entries(availableKits).map(([kitName, samples]) => (
                    <div key={kitName} style={{ marginBottom: "8px", padding: "6px", borderBottom: "1px solid #eee" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <input
                                type="checkbox"
                                checked={selectedKitCheckboxes[kitName] || false}
                                onChange={() => toggleKitCheckbox(kitName)}
                            />
                            <span style={{ flex: 1, fontSize: "13px" }}>{kitName}</span>
                            <button
                                onClick={() => setExpandedKits(prev => ({
                                    ...prev,
                                    [kitName]: !prev[kitName]
                                }))}
                                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "11px" }}
                            >
                                {expandedKits[kitName] ? "▼" : "▶"}
                            </button>
                        </div>
                        {expandedKits[kitName] && (
                            <div style={{ marginLeft: "24px", marginTop: "4px" }}>
                                {samples.map((sample, idx) => (
                                    <div key={idx} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", marginBottom: "3px" }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedSampleCheckboxes[`${kitName}-${sample.name}`] || false}
                                            onChange={() => toggleSampleCheckbox(kitName, sample.name)}
                                        />
                                        <span style={{ flex: 1 }}>{sample.name}</span>
                                        <button
                                            onClick={() => playPreview(sample.src)}
                                            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "10px" }}
                                        >
                                            🔊
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Selected Samples */}
            <div style={{ border: "1px solid #ccc", padding: "12px", width: "250px", overflowY: "auto", maxHeight: "500px" }}>
                <h3>Selected Samples</h3>

                {/* Assignment Mode Indicator */}
                {isAssigningSample && selectedSample && (
                    <div style={{
                        padding: "8px",
                        backgroundColor: '#e3f2fd',
                        border: "2px solid #1976d2",
                        borderRadius: "4px",
                        marginBottom: "12px",
                        fontSize: "11px"
                    }}>
                        <p style={{ margin: "0 0 4px 0", fontWeight: "bold", color: "#1976d2" }}>
                            🎯 Assigning Sample
                        </p>
                        <p style={{ margin: 0, fontSize: "10px", color: "#0d47a1" }}>
                            <strong>{selectedSample.name}</strong>
                        </p>
                        <p style={{ margin: "4px 0 0 0", fontSize: "10px", color: "#555" }}>
                            Click any pad button to assign it
                        </p>
                    </div>
                )}

                {/* Status Bar */}
                <div style={{
                    padding: "8px",
                    backgroundColor: compressionStatus.includes('✓') ? '#e8f5e9' : '#fff3e0',
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    marginBottom: "12px",
                    fontSize: "11px"
                }}>
                    <p style={{ margin: "0 0 2px 0", fontWeight: "bold" }}>
                        {compressionStatus}
                    </p>
                    {compressionProgress && (
                        <p style={{ margin: 0, fontSize: "10px", color: "#666" }}>
                            {compressionProgress}
                        </p>
                    )}
                </div>

                {/* Selected List */}
                <div style={{ marginBottom: "12px", maxHeight: "200px", overflowY: "auto" }}>
                    {Object.entries(availableKits).map(([kitName, samples]) => {
                        const kitSamples = samples.filter(s => selectedSampleCheckboxes[`${kitName}-${s.name}`])
                        if (kitSamples.length === 0) return null
                        return (
                            <div key={kitName} style={{ marginBottom: "8px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                    <button
                                        onClick={() => setExpandedKits(prev => ({
                                            ...prev,
                                            [kitName]: !prev[kitName]
                                        }))}
                                        style={{
                                            background: "none",
                                            border: "none",
                                            cursor: "pointer",
                                            fontSize: "10px",
                                            padding: 0
                                        }}
                                    >
                                        {expandedKits[kitName] ? "▼" : "▶"}
                                    </button>
                                    <span style={{ fontSize: "12px", fontWeight: "bold", flex: 1 }}>{kitName}</span>
                                    <button
                                        onClick={() => {
                                            kitSamples.forEach(s => {
                                                setSelectedSampleCheckboxes(p => ({
                                                    ...p,
                                                    [`${kitName}-${s.name}`]: false
                                                }))
                                            })
                                            setSelectedKitCheckboxes(p => ({
                                                ...p,
                                                [kitName]: false
                                            }))
                                            setCompressionStatus('Not Compressed')
                                        }}
                                        style={{
                                            background: "none",
                                            border: "none",
                                            cursor: "pointer",
                                            color: "red",
                                            fontSize: "12px",
                                            padding: 0
                                        }}
                                    >
                                        ✕
                                    </button>
                                </div>
                                {expandedKits[kitName] && (
                                    <div style={{ marginLeft: "16px", marginTop: "3px" }}>
                                        {kitSamples.map((sample, idx) => (
                                            <div 
                                                key={idx} 
                                                onClick={() => {
                                                    setSelectedSample(sample);
                                                    setIsAssigningSample(true);
                                                    console.log(`🎯 Selected sample for assignment: ${sample.name}`);
                                                }}
                                                style={{ 
                                                    fontSize: "10px", 
                                                    padding: "4px 6px",
                                                    marginBottom: "2px",
                                                    borderRadius: "3px",
                                                    cursor: "pointer",
                                                    backgroundColor: isAssigningSample && selectedSample?.name === sample.name ? '#1976d2' : 'transparent',
                                                    color: isAssigningSample && selectedSample?.name === sample.name ? 'white' : '#333',
                                                    border: isAssigningSample && selectedSample?.name === sample.name ? '2px solid #1976d2' : '1px solid transparent',
                                                    transition: 'all 0.2s ease',
                                                    fontWeight: isAssigningSample && selectedSample?.name === sample.name ? 'bold' : 'normal'
                                                }}
                                                title="Click to assign this sample to a pad"
                                            >
                                                • {sample.name}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>

                {/* Compress & Share Button */}
                <button
                    onClick={handleCompressAndShare}
                    disabled={compressing || Object.values(selectedSampleCheckboxes).every(v => !v)}
                    style={{
                        width: "100%",
                        padding: "10px",
                        backgroundColor: compressing ? "#ccc" : "#2196F3",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: compressing ? "not-allowed" : "pointer",
                        fontWeight: "bold",
                        fontSize: "12px"
                    }}
                >
                    {compressing ? "Compressing..." : "Compress & Share"}
                </button>
            </div>
        </div>
    );
};

export default LibraryBrowser;
