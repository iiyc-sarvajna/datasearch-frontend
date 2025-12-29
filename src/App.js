

import React, { useEffect, useState, useRef } from "react";
import { auth, googleProvider } from "./firebase";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./App.css";

/* ---------------- FILE ICONS ---------------- */
const getFileIcon = (name) => {
  const ext = name.split(".").pop().toLowerCase();
  if (["pdf"].includes(ext)) return "bi-file-earmark-pdf-fill text-danger";
  if (["doc", "docx"].includes(ext)) return "bi-file-earmark-word-fill text-primary";
  if (["xls", "xlsx"].includes(ext)) return "bi-file-earmark-excel-fill text-success";
  if (["ppt", "pptx"].includes(ext)) return "bi-file-earmark-slides-fill text-warning";
  if (["jpg", "jpeg", "png", "gif"].includes(ext)) return "bi-file-earmark-image-fill text-info";
  if (["mp3"].includes(ext)) return "bi-file-earmark-music-fill text-secondary";
  if (["mp4", "avi", "mov"].includes(ext)) return "bi-file-earmark-play-fill text-dark";
  if (["zip", "rar"].includes(ext)) return "bi-file-earmark-zip-fill text-muted";
  return "bi-file-earmark-fill";
};

export default function App() {
const [loadingProfile, setLoadingProfile] = useState(true);
const [loadingFiles, setLoadingFiles] = useState(true);
  const [user, setUser] = useState(null);
  const [view, setView] = useState("my");
  const [profile, setProfile] = useState({ points: 0 });
const [profileComplete, setProfileComplete] = useState(null);


  const [myFiles, setMyFiles] = useState([]);
  const [globalFiles, setGlobalFiles] = useState([]);
  const [mySearch, setMySearch] = useState("");
  const [globalSearch, setGlobalSearch] = useState("");
  const [fileFilter, setFileFilter] = useState("all"); // ✅ NEW: File filter
  const [globalLikes, setGlobalLikes] = useState({}); // ✅ NEW: Like counts
  const [selectedIds, setSelectedIds] = useState([]);
  const [showBulkDownload, setShowBulkDownload] = useState(false);
  const [filesToUpload, setFilesToUpload] = useState([]);
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const globalSearchTimeoutRef = useRef(null); // ✅ FIXED: Added ref

  /* ---------------- FILE TYPE FILTERS ✅ ---------------- */
  const fileTypes = [
    { id: 'all', label: 'All', icon: 'bi-file-earmark-fill' },
    { id: 'pdf', label: 'PDF', icon: 'bi-file-earmark-pdf-fill text-danger' },
    { id: 'doc', label: 'DOC', icon: 'bi-file-earmark-word-fill text-primary' },
    { id: 'excel', label: 'XLS', icon: 'bi-file-earmark-excel-fill text-success' },
    { id: 'image', label: 'IMG', icon: 'bi-file-earmark-image-fill text-info' },
    { id: 'video', label: 'VID', icon: 'bi-file-earmark-play-fill text-dark' }
  ];

  /* ---------------- AUTH ---------------- */
  useEffect(() => onAuthStateChanged(auth, setUser), []);

  const login = () => signInWithPopup(auth, googleProvider);
  const logout = () => signOut(auth);

  const token = async () => user ? `Bearer ${await user.getIdToken(true)}` : null;

  /* ---------------- LOAD DATA ---------------- */
const loadProfile = async () => {
  try {
    setLoadingProfile(true);

    const t = await token();
    if (!t) return;

    const profileRes = await fetch("https://profile-eic63re4uq-uc.a.run.app", {
      headers: { Authorization: t },
    });
    const profileData = await profileRes.json();

    setProfile(profileData || {});

    const isComplete =
      profileData?.name &&
      profileData?.contact &&
      profileData?.temple &&
      profileData?.zone &&
      profileData?.service;

    setProfileComplete(!!isComplete);
  } catch (e) {
    console.log("Profile load error", e);
  } finally {
    setLoadingProfile(false);
  }
};

const loadMyFiles = async (search = "") => {
  try {
    setLoadingFiles(true);

    const t = await token();
    if (!t) return;

    const res = await fetch(
      `https://myfiles-eic63re4uq-uc.a.run.app?q=${encodeURIComponent(search)}`,
      { headers: { Authorization: t } }
    );

    if (res.ok) {
      const data = await res.json();
      setMyFiles(data);
    }
  } catch (e) {
    console.log("My files load error:", e);
  } finally {
    setLoadingFiles(false);
  }
};

  const loadGlobal = async () => {
    try {
      const t = await token();
      if (!t) return;
      const res = await fetch("https://searchall-eic63re4uq-uc.a.run.app", {
        headers: { Authorization: t },
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        setGlobalFiles(data);
        
        // ✅ EXTRACT LIKE COUNTS
        const likes = {};
        data.forEach(f => {
          likes[f.fileId] = f.likes || 0;
        });
        setGlobalLikes(likes);
      }
    } catch (e) {
      console.log("Global files load error:", e);
    }
  };

/* ---------------- LIKE FUNCTION (DISABLED) ---------------- */
// const toggleLike = async (fileId) => {
//   try {
//     const t = await token();
//     if (!t) return;
//     
//     const res = await fetch(`http://localhost:4000/like/${fileId}`, {
//       method: 'POST',
//       headers: { 
//         Authorization: t,
//         'Content-Type': 'application/json'
//       }
//     });
//     
//     if (res.ok) {
//       const result = await res.json();
//       setGlobalLikes(prev => ({
//         ...prev,
//         [fileId]: result.likes
//       }));
//     }
//   } catch (e) {
//     console.log("Like error:", e);
//   }
// };

  /* ---------------- EFFECTS ---------------- */
useEffect(() => {
  if (user) {
    loadProfile();
    loadMyFiles(""); // explicit initial load
 if (view === "global") loadGlobal(); // ✅ ADD THIS LINE
  }
}, [user, view]);

/* -------- MY FILES : DEBOUNCED SEARCH (WORKING) -------- */
useEffect(() => {
  if (view !== "my") return;

  const timeout = setTimeout(() => {
    loadMyFiles(mySearch);
  }, 500);

  return () => clearTimeout(timeout);
}, [mySearch, view]);

/* -------- GLOBAL : FIXED DEBOUNCED SEARCH ✅ -------- */
useEffect(() => {
  if (view !== "global") return;

  // ✅ Clear previous timeout
  if (globalSearchTimeoutRef.current) {
    clearTimeout(globalSearchTimeoutRef.current);
  }

  // ✅ Set new timeout with ref
  globalSearchTimeoutRef.current = setTimeout(async () => {
    try {
      const authToken = await token();
      if (!authToken) return;

      if (globalSearch.trim() === "") {
        // Load all files
        const res = await fetch("https://searchall-eic63re4uq-uc.a.run.app", {
          headers: { Authorization: authToken },
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          setGlobalFiles(data);
          const likes = {};
          data.forEach(f => (likes[f.fileId] = f.likes || 0));
          setGlobalLikes(likes);
        }
        return;
      }

      if (globalSearch.length < 3) return;

      // Search files
      const res = await fetch(
        `https://searchall-eic63re4uq-uc.a.run.app?q=${encodeURIComponent(globalSearch)}`,
        {
          headers: { Authorization: authToken },
          cache: "no-store",
        }
      );

      if (res.ok) {
        const data = await res.json();
        setGlobalFiles(data);
        const likes = {};
        data.forEach(f => (likes[f.fileId] = f.likes || 0));
        setGlobalLikes(likes);
      }
    } catch (e) {
      console.error("Global search error:", e);
    }
  }, 500);

  // ✅ Cleanup on unmount/change
  return () => {
    if (globalSearchTimeoutRef.current) {
      clearTimeout(globalSearchTimeoutRef.current);
    }
  };
}, [globalSearch, view]);

/* -------- BULK DOWNLOAD VISIBILITY -------- */
useEffect(() => {
  setShowBulkDownload(selectedIds.length > 0);
}, [selectedIds.length]);

  /* ---------------- DRAG & DROP ---------------- */
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFilesToUpload(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFilesToUpload(prev => [...prev, ...Array.from(e.target.files)]);
    }
  };

  /* ---------------- UPLOAD ---------------- */
  const uploadFiles = async () => {
    if (!filesToUpload.length) {
      alert("Select files first");
      return;
    }

    const t = await token();
    if (!t) return;

    setUploading(true);
    setProgress(0);
    
    const form = new FormData();
    filesToUpload.forEach(f => form.append("file", f));

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "https://upload-eic63re4uq-uc.a.run.app");
    xhr.setRequestHeader("Authorization", t);
    xhr.setRequestHeader("x-description", description);
    xhr.setRequestHeader("x-tags", tags);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        setProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = async () => {
      setUploading(false);
      setFilesToUpload([]);
      setDescription("");
      setTags("");
      
      if (xhr.status === 200) {
        try {
          const response = JSON.parse(xhr.responseText);
          if (response.profile) setProfile(response.profile);
          if (response.uploaded && response.uploaded.length > 0) {
            setMyFiles(prev => {
              const existingIds = new Set(prev.map(f => f.fileId));
              const newFiles = response.uploaded.filter(f => !existingIds.has(f.fileId));
              return [...newFiles, ...prev];
            });
          }
        } catch (e) {
          console.log("Response parse error");
        }
      }
      
      setProgress(0);
      setTimeout(async () => {
        setView("my");
        setMySearch("");
        await loadProfile();
        await loadMyFiles("");
      }, 1500);
    };

    xhr.send(form);
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const downloadSelected = () => {
    selectedIds.forEach(id => {
      window.open(`https://drive.google.com/uc?id=${id}&export=download`, "_blank");
    });
    setSelectedIds([]);
  };

  /* ---------------- RENDER CARDS ✅ WITH LIKES & FILTERS ---------------- */
  const renderCards = (files, showUser, isGlobal = false) => {
    // ✅ FILE TYPE FILTER
    const filteredFiles = files.filter(f => {
      if (fileFilter === 'all' || view !== 'global') return true;
      const ext = (f.title || '').split('.').pop()?.toLowerCase();
      const filters = {
        pdf: ['pdf'],
        doc: ['doc', 'docx'],
        excel: ['xls', 'xlsx'],
        image: ['jpg', 'jpeg', 'png', 'gif'],
        video: ['mp4', 'avi', 'mov']
      };
      return filters[fileFilter]?.includes(ext) || false;
    });

    return (
      <div className="file-grid">
        {Array.isArray(filteredFiles) && filteredFiles.length > 0 ? (
          filteredFiles.map((f, i) => (
            <div key={f.fileId || `file-${i}`} className="file-card">
              <div className="file-card-header">
                <input
                  type="checkbox"
                  className="select-checkbox"
                  checked={selectedIds.includes(f.fileId)}
                  onChange={() => toggleSelect(f.fileId)}
                />
                <i className={`file-icon ${getFileIcon(f.title || '')}`}></i>
              </div>
              <div className="file-card-body">
                <h6 className="file-title">{f.title}</h6>
                {showUser && <div className="file-author">By {f.user}</div>}
                <div className="file-description">{f.description || 'No description'}</div>
                
                {/* ✅ LIKE BUTTON - GLOBAL ONLY */}
                {isGlobal && (
                  <div className="file-likes" style={{marginTop: '0.5rem', fontSize: '0.85rem'}}>
                    <button 
                      className="like-btn"
                      disabled
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'not-allowed',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: '0.25rem',
                        borderRadius: '4px',
                        transition: 'all 0.2s ease'
                      }}
                      title="Like"
                    >
                      <i className="bi bi-heart-fill" style={{fontSize: '1rem'}}></i>
                      <span style={{fontWeight: '600'}}>{globalLikes[f.fileId] || 0}</span>
                    </button>
                  </div>
                )}
              </div>
              <div className="file-card-actions">
                <button
                  className="btn-action btn-view"
                  onClick={() => window.open(`https://drive.google.com/file/d/${f.fileId}/view`, "_blank")}
                  title="View"
                >
                  <i className="bi bi-eye"></i>
                </button>
                <button
                  className="btn-action btn-download"
                  onClick={() => window.open(`https://drive.google.com/uc?id=${f.fileId}&export=download`, "_blank")}
                  title="Download"
                >
                  <i className="bi bi-download"></i>
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="file-card" style={{textAlign: 'center', color: '#64748b', gridColumn: '1/-1'}}>
            <i className="bi bi-folder" style={{fontSize: '3rem', marginBottom: '1rem', opacity: 0.5}}></i>
            <p>{fileFilter === 'all' || view !== 'global' ? 'No files found' : `No ${fileTypes.find(t => t.id === fileFilter)?.label.toLowerCase()} files`}</p>
          </div>
        )}
      </div>
    );
  };

if (user && (loadingProfile || profileComplete === null)) {
  return (
    <div className="login-container">
      <div className="login-card">
        <p>Loading your profile…</p>
      </div>
    </div>
  );
}

if (user && profileComplete === false) {
  return (
    <div className="login-container">
      <div className="login-card" style={{ maxWidth: 420 }}>
        <h3>Complete Your Profile</h3>
        <p>Please fill this once to continue</p>

        <form onSubmit={saveProfile}>
          <input
            className="form-input"
            placeholder="Full Name"
            value={profile.name || ""}
            onChange={e => setProfile({ ...profile, name: e.target.value })}
            required
          />

          <input
            className="form-input"
            placeholder="Contact Number"
            value={profile.contact || ""}
            onChange={e => setProfile({ ...profile, contact: e.target.value })}
            required
          />

          <input
            className="form-input"
            placeholder="Temple Name"
            value={profile.temple || ""}
            onChange={e => setProfile({ ...profile, temple: e.target.value })}
            required
          />

          <select
            className="form-input"
            value={profile.zone || ""}
            onChange={e => setProfile({ ...profile, zone: e.target.value })}
            required
          >
            <option value="">Select Zone</option>
            <option>West</option>
            <option>East</option>
            <option>North</option>
            <option>South</option>
          </select>

          <input
            className="form-input"
            placeholder="Service / Designation"
            value={profile.service || ""}
            onChange={e => setProfile({ ...profile, service: e.target.value })}
            required
          />

          <button className="btn-google-login" type="submit">
            Save & Continue
          </button>
        </form>
      </div>
    </div>
  );
}


  if (!user) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="logo">
              <i className="bi bi-cloud-arrow-up-fill"></i>
              <h1>Sarvajna</h1>
            </div>
            <h3>IIYC Data Sharing Portal</h3>
            <p>Share knowledge, earn points, grow together</p>
          </div>
          <button className="btn-google-login" onClick={login}>
            <i className="bi bi-google"></i> Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="top-bar">
        <div className="top-bar-content">
          <div className="app-brand">
            <i className="bi bi-cloud-arrow-up"></i>
            <span>Sarvajna</span>
          </div>
          <div className="user-profile">
            <img src={user.photoURL} alt="profile" className="profile-avatar" />
            <div>
              <div className="user-name">{user.displayName}</div>
              <div className="user-points">⭐ {profile.points} pts</div>
            </div>
            <button className="btn-logout" onClick={logout}>
              <i className="bi bi-box-arrow-right"></i>
            </button>
          </div>
        </div>
      </div>

      <div className="main-layout">
        <nav className="sidebar">
          <div className="nav-section">
            <button className={`nav-item ${view === "my" ? "active" : ""}`} onClick={() => setView("my")}>
              <i className="bi bi-folder-fill"></i> My Files
            </button>
            <button className={`nav-item ${view === "global" ? "active" : ""}`} onClick={() => setView("global")}>
              <i className="bi bi-globe"></i> Global
            </button>
            <button className={`nav-item ${view === "upload" ? "active" : ""}`} onClick={() => setView("upload")}>
              <i className="bi bi-cloud-upload"></i> Upload
            </button>
          </div>
        </nav>

        <main className="main-content">
          {showBulkDownload && (
            <div className="bulk-actions">
              <button className="btn-bulk-download" onClick={downloadSelected}>
                <i className="bi bi-download"></i>
                Download Selected ({selectedIds.length})
              </button>
            </div>
          )}

          {view === "my" && (
            <>
              <div className="section-header">
                <h2>My Files ({myFiles.length})</h2>
                <div className="search-container">
                  <i className="bi bi-search search-icon"></i>
                  <input
                    className="search-input"
                    placeholder="Search my files..."
                    value={mySearch}
                    onChange={e => setMySearch(e.target.value)}
                  />
                </div>
              </div>
              {loadingFiles ? <p>Loading files…</p> : renderCards(myFiles, false)}

            </>
          )}

          {view === "global" && (
            <>
              {/* ✅ FIXED GLOBAL HEADER */}
              <div className="global-header" style={{
                position: 'sticky',
                top: '0',
                background: 'white',
                zIndex: 20,
                padding: '1.5rem 0 1rem 0',
                borderBottom: '1px solid #e2e8f0',
                marginBottom: '1.5rem',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}>
                <div className="section-header">
                  <h2>Global Resources ({globalFiles.length})</h2>
                  <div style={{display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap'}}>
                    {/* Search */}
                    <div className="search-container" style={{minWidth: '280px'}}>
                      <i className="bi bi-search search-icon"></i>
                      <input
                        className="search-input"
                        placeholder="Search resources..."
                        value={globalSearch}
                        onChange={e => setGlobalSearch(e.target.value)}
                      />
                    </div>
                    
                    {/* ✅ FILE TYPE FILTERS */}
                    <div className="file-type-filters" style={{
                      display: 'flex',
                      gap: '0.25rem',
                      background: '#f8fafc',
                      padding: '0.5rem',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0'
                    }}>
                      {fileTypes.map(type => (
                        <button
                          key={type.id}
                          className={`filter-btn ${fileFilter === type.id ? 'active' : ''}`}
                          onClick={() => setFileFilter(type.id)}
                          style={{
                            background: fileFilter === type.id ? '#6366f1' : 'transparent',
                            color: fileFilter === type.id ? 'white' : '#64748b',
                            border: 'none',
                            padding: '0.5rem 0.75rem',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            fontWeight: '500',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            transition: 'all 0.2s ease',
                            whiteSpace: 'nowrap'
                          }}
                          title={type.label}
                        >
                          <i className={type.icon} style={{fontSize: '0.9rem'}} />
                          {type.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              {loadingFiles ? <p>Loading files…</p> : renderCards(globalFiles, true, true)}

            </>
          )}

          {view === "upload" && (
            <div className="upload-section">
              <div className="upload-card">
                <div className="upload-header">
                  <i className="bi bi-cloud-upload-fill upload-icon"></i>
                  <h2>Upload Resources</h2>
                  <p>Share valuable resources with the community</p>
                </div>
                
                <div className="upload-form">
                  <div 
                    className={`file-drop-zone ${dragActive ? 'drag-active' : ''}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="file-input"
                      id="file-upload"
                      onChange={handleFileInputChange}
                    />
                    <label htmlFor="file-upload" className="drop-label">
                      <i className="bi bi-cloud-arrow-up"></i>
                      <p>Drag & drop files here or click to browse</p>
                      <span>Supports PDF, DOC, XLS, Images, Videos & more</span>
                    </label>
                    {filesToUpload.length > 0 && (
                      <div className="selected-files">
                        {filesToUpload.map((file, idx) => (
                          <span key={idx} className="file-chip">
                            {file.name}
                            <i 
                              className="bi bi-x-circle-fill remove-file"
                              onClick={() => setFilesToUpload(prev => prev.filter((_, i) => i !== idx))}
                            />
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <input
                    className="form-input"
                    placeholder="Description (optional)"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                  />
                  <input
                    className="form-input"
                    placeholder="Tags (comma separated)"
                    value={tags}
                    onChange={e => setTags(e.target.value)}
                  />
                  
                  <button
                    className={`upload-btn ${uploading ? 'uploading' : ''}`}
                    disabled={uploading || !filesToUpload.length}
                    onClick={uploadFiles}
                  >
                    {uploading ? (
                      <>
                        <span className="spinner"></span>
                        Uploading... {progress}%
                      </>
                    ) : (
                      <>
                        <i className="bi bi-cloud-upload"></i>
                        Start Upload ({filesToUpload.length} files)
                      </>
                    )}
                  </button>

                  {uploading && (
                    <div className="progress-container">
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${progress}%` }} />
                      </div>
                      <div className="progress-text">{progress}%</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
