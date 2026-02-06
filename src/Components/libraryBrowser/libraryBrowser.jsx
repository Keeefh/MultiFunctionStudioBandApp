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
        <div id="library-browser-container" ref={libraryRef} style={{ width: "100%", display: "flex", gap: "6px", fontSize: "10px", height: "100%" }}>
            {/* Available Kits with Checkboxes - COMPACT */}
            <div style={{ border: "1px solid #ccc", padding: "6px", width: "35%", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                <h4 style={{ margin: "0 0 4px 0", fontSize: "10px", fontWeight: "bold" }}>KITS & SAMPLES</h4>
                <div style={{ flex: 1, overflow: "hidden", paddingRight: "2px", display: "flex", flexDirection: "column", gap: "2px" }}>
                    {Object.entries(availableKits).map(([kitName, samples]) => (
                        <div key={kitName} style={{ padding: "3px", borderBottom: "1px solid #eee", fontSize: "8px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "3px", marginBottom: "2px" }}>
                                <input
                                    type="checkbox"
                                    checked={selectedKitCheckboxes[kitName] || false}
                                    onChange={() => toggleKitCheckbox(kitName)}
                                    style={{ width: "12px", height: "12px", minWidth: "12px" }}
                                />
                                <span style={{ flex: 1, fontSize: "9px", fontWeight: "bold", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{kitName}</span>
                                <button
                                    onClick={() => setExpandedKits(prev => ({
                                        ...prev,
                                        [kitName]: !prev[kitName]
                                    }))}
                                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: "8px", padding: "0", minWidth: "16px" }}
                                >
                                    {expandedKits[kitName] ? "▼" : "▶"}
                                </button>
                            </div>
                            {expandedKits[kitName] && (
                                <div style={{ marginLeft: "14px", display: "grid", gridTemplateColumns: "1fr", gap: "1px", fontSize: "7px" }}>
                                    {samples.map((sample, idx) => (
                                        <div key={idx} style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                                            <input
                                                type="checkbox"
                                                checked={selectedSampleCheckboxes[`${kitName}-${sample.name}`] || false}
                                                onChange={() => toggleSampleCheckbox(kitName, sample.name)}
                                                style={{ width: "11px", height: "11px", minWidth: "11px" }}
                                            />
                                            <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sample.name.substring(0, 12)}</span>
                                            <button
                                                onClick={() => playPreview(sample.src)}
                                                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "10px", padding: "0", color: "#00d9a3", minWidth: "14px" }}
                                                title="Preview sample"
                                            >
                                                ▶
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Selected Samples - ASSIGN SECTION */}
            <div style={{ border: "1px solid #ccc", padding: "6px", width: "65%", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                <h4 style={{ margin: "0 0 4px 0", fontSize: "10px", fontWeight: "bold" }}>SELECTED & ASSIGN TO PAD</h4>

                {/* Assignment Mode Indicator */}
                {isAssigningSample && selectedSample && (
                    <div style={{
                        padding: "6px",
                        backgroundColor: 'rgba(0, 184, 217, 0.1)',
                        border: "1px solid #00b4d8",
                        borderRadius: "6px",
                        marginBottom: "4px",
                        fontSize: "9px"
                    }}>
                        <p style={{ margin: "0 0 2px 0", fontWeight: "600", color: "#00d9a3" }}>
                            🎯 ASSIGNING: <strong>{selectedSample.name}</strong>
                        </p>
                        <p style={{ margin: 0, fontSize: "8px", color: "#dbdee1" }}>
                            Click any pad button to assign this sample
                        </p>
                    </div>
                )}

                {/* Sample List for Assignment/Compression */}
                <div style={{ flex: 1, overflow: "hidden", paddingRight: "2px", marginBottom: "4px", display: "flex", flexDirection: "column", gap: "3px" }}>
                    {Object.entries(availableKits).map(([kitName, samples]) => {
                        const kitSamples = samples.filter(s => selectedSampleCheckboxes[`${kitName}-${s.name}`])
                        if (kitSamples.length === 0) return null
                        return (
                            <div key={kitName} style={{ fontSize: "7px" }}>
                                <p style={{ margin: "0 0 1px 0", fontWeight: "bold", fontSize: "8px" }}>{kitName}</p>
                                <div style={{ marginLeft: "4px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px" }}>
                                    {kitSamples.map((sample, idx) => (
                                        <div key={idx} style={{ display: "flex", gap: "2px", fontSize: "7px" }}>
                                            <button
                                                onClick={() => {
                                                    setSelectedSample(sample);
                                                    setIsAssigningSample(true);
                                                    console.log(`🎯 Selected sample for assignment: ${sample.name}`);
                                                }}
                                                style={{
                                                    flex: 1,
                                                    padding: "3px 6px",
                                                    backgroundColor: isAssigningSample && selectedSample?.name === sample.name ? '#00b4d8' : '#2b2d31',
                                                    color: isAssigningSample && selectedSample?.name === sample.name ? '#1e1f22' : '#dbdee1',
                                                    border: isAssigningSample && selectedSample?.name === sample.name ? '1px solid #00d9a3' : '1px solid #3d3f45',
                                                    borderRadius: "4px",
                                                    cursor: "pointer",
                                                    fontSize: "8px",
                                                    whiteSpace: "nowrap",
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    fontWeight: isAssigningSample && selectedSample?.name === sample.name ? "700" : "600",
                                                }}
                                                title={`Click to assign "${sample.name}" to a pad`}
                                            >
                                                ➜ {sample.name.substring(0, 8)}
                                            </button>
                                            <button
                                                onClick={() => playPreview(sample.src)}
                                                style={{
                                                    padding: "3px 6px",
                                                    background: "rgba(0, 217, 163, 0.15)",
                                                    border: "1px solid rgba(0, 217, 163, 0.3)",
                                                    borderRadius: "4px",
                                                    cursor: "pointer",
                                                    fontSize: "10px",
                                                    color: "#00d9a3",
                                                    minWidth: "22px",
                                                    transition: "all 0.15s",
                                                }}
                                                title="Preview sample"
                                            >
                                                ▶
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                    {!Object.values(selectedSampleCheckboxes).some(v => v) && (
                        <p style={{ margin: 0, fontSize: "7px", color: "#999", fontStyle: "italic", textAlign: "center" }}>
                            No samples selected - select from KITS & SAMPLES
                        </p>
                    )}
                </div>

                {/* Status & Compression */}
                <div style={{
                    padding: "8px",
                    backgroundColor: compressionStatus.includes('✓') ? 'rgba(0, 217, 163, 0.08)' : 'rgba(0, 184, 217, 0.05)',
                    border: compressionStatus.includes('✓') ? "1px solid rgba(0, 217, 163, 0.25)" : "1px solid rgba(0, 184, 217, 0.2)",
                    borderRadius: "6px",
                    marginBottom: "6px",
                    fontSize: "10px"
                }}>
                    <p style={{
                      margin: "0 0 2px 0",
                      fontWeight: "600",
                      color: compressionStatus.includes('✓') ? '#00d9a3' : '#00b4d8'
                    }}>STATUS: {compressionStatus}</p>
                    {compressionProgress && (
                        <p style={{ margin: 0, fontSize: "9px", color: "#949ba4" }}>
                            {compressionProgress}
                        </p>
                    )}
                </div>

                {/* Compress & Share Button */}
                <button
                    onClick={handleCompressAndShare}
                    disabled={compressing || Object.values(selectedSampleCheckboxes).every(v => !v)}
                    style={{
                        width: "100%",
                        padding: "10px",
                        background: compressing ? "linear-gradient(135deg, #1e1f22 0%, #1a1b1e 100%)" :
                          "linear-gradient(135deg, #00b4d8 0%, #0096b8 100%)",
                        color: compressing || Object.values(selectedSampleCheckboxes).every(v => !v) ? "#949ba4" : "#1e1f22",
                        border: compressing || Object.values(selectedSampleCheckboxes).every(v => !v) ? "1px solid #3d3f45" : "1px solid #00d9a3",
                        borderRadius: "6px",
                        cursor: compressing || Object.values(selectedSampleCheckboxes).every(v => !v) ? "not-allowed" : "pointer",
                        fontWeight: "700",
                        fontSize: "10px",
                        textTransform: "uppercase",
                        letterSpacing: "0.8px",
                        transition: "all 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
                        opacity: compressing || Object.values(selectedSampleCheckboxes).every(v => !v) ? 0.5 : 1,
                        boxShadow: compressing || Object.values(selectedSampleCheckboxes).every(v => !v) ? "none" : "0 2px 8px rgba(0, 180, 216, 0.3)",
                    }}
                >
                    {compressing ? "COMPRESSING..." : "COMPRESS & SHARE"}
                </button>
            </div>
        </div>
    );
};

export default LibraryBrowser;
