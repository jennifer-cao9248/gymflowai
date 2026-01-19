import React, { useState, useEffect } from 'react';
import { User, TrendingUp, Plus, Dumbbell, Mic, MicOff, X, Camera, Upload, Loader } from 'lucide-react';

export default function GymFlowApp() {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [view, setView] = useState('clients');
  const [insights, setInsights] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [showAddClient, setShowAddClient] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState('');
  
  const [workout, setWorkout] = useState([
    { id: 1, exerciseName: '', sets: [] },
    { id: 2, exerciseName: '', sets: [] },
    { id: 3, exerciseName: '', sets: [] },
    { id: 4, exerciseName: '', sets: [] },
    { id: 5, exerciseName: '', sets: [] },
    { id: 6, exerciseName: '', sets: [] },
    { id: 7, exerciseName: '', sets: [] },
    { id: 8, exerciseName: '', sets: [] }
  ]);
  
  const [isListening, setIsListening] = useState(false);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(null);
  const [recognition, setRecognition] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState('');

  const exerciseLibrary = {
    'Chest': ['Bench Press', 'Incline Bench Press', 'Decline Bench Press', 'Dumbbell Fly', 'Cable Fly', 'Push-ups', 'Chest Press Machine'],
    'Back': ['Deadlift', 'Barbell Row', 'Lat Pulldown', 'Pull-ups', 'Chin-ups', 'Seated Cable Row', 'T-Bar Row', 'Single Arm Dumbbell Row'],
    'Legs': ['Squat', 'Front Squat', 'Leg Press', 'Lunges', 'Bulgarian Split Squat', 'Leg Extension', 'Leg Curl', 'Romanian Deadlift', 'Calf Raises'],
    'Shoulders': ['Overhead Press', 'Arnold Press', 'Lateral Raises', 'Front Raises', 'Rear Delt Fly', 'Shrugs'],
    'Arms': ['Bicep Curls', 'Hammer Curls', 'Preacher Curls', 'Tricep Extensions', 'Tricep Dips', 'Skull Crushers'],
    'Core': ['Planks', 'Crunches', 'Russian Twists', 'Leg Raises', 'Ab Wheel']
  };

  useEffect(() => {
    loadFromStorage();
    initSpeechRecognition();
  }, []);

  // Auto-save whenever workout changes
  useEffect(() => {
    if (selectedClient && workout.some(ex => ex.exerciseName && ex.sets.length > 0)) {
      const timer = setTimeout(() => {
        autoSaveSession();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [workout, selectedClient]);

  const autoSaveSession = () => {
    if (!selectedClient) return;

    const session = {
      id: Date.now(),
      date: new Date().toISOString(),
      exercises: workout.filter(ex => ex.exerciseName && ex.sets.length > 0)
    };

    if (session.exercises.length === 0) return;

    const updatedClients = clients.map(c => {
      if (c.id === selectedClient.id) {
        const today = new Date().toDateString();
        const otherSessions = (c.sessions || []).filter(s => 
          new Date(s.date).toDateString() !== today
        );
        return { ...c, sessions: [...otherSessions, session] };
      }
      return c;
    });

    setClients(updatedClients);
    saveToStorage(updatedClients);
    setSelectedClient(updatedClients.find(c => c.id === selectedClient.id));
    setAutoSaveStatus('✓ Saved');
    setTimeout(() => setAutoSaveStatus(''), 2000);
  };

  const initSpeechRecognition = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'en-US';
      
      recognitionInstance.onstart = () => setIsListening(true);
      
      recognitionInstance.onresult = (event) => {
        const transcript = event.results[0][0].transcript.toLowerCase();
        parseVoiceInput(transcript);
      };

      recognitionInstance.onerror = () => setIsListening(false);
      recognitionInstance.onend = () => setIsListening(false);

      setRecognition(recognitionInstance);
    }
  };

  const parseVoiceInput = (transcript) => {
    if (currentExerciseIndex === null) return;

    const words = transcript.split(' ');
    let numSets = null, reps = null, weight = null;

    words.forEach((word, i) => {
      const num = parseInt(word);
      if (!isNaN(num)) {
        const next = words[i + 1]?.toLowerCase() || '';
        if (next.includes('set')) numSets = num;
        else if (next.includes('rep')) reps = num;
        else if (next.includes('pound') || next.includes('lb') || next.includes('kg')) weight = num;
      }
    });

    if (numSets && reps) {
      const sets = [];
      for (let i = 0; i < numSets; i++) {
        sets.push({ id: Date.now() + i, reps: reps.toString(), weight: weight ? weight.toString() : '' });
      }
      
      const updated = [...workout];
      updated[currentExerciseIndex] = { ...updated[currentExerciseIndex], sets: sets };
      setWorkout(updated);
    }
  };

  const toggleVoice = (index) => {
    if (!recognition) return;
    setCurrentExerciseIndex(index);
    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  };

  const loadFromStorage = () => {
    const saved = localStorage.getItem('gymflow-clients');
    if (saved) setClients(JSON.parse(saved));
  };

  const saveToStorage = (data) => {
    localStorage.setItem('gymflow-clients', JSON.stringify(data));
  };

  const addClient = () => {
    if (!newClientName.trim()) return;
    const newClient = { id: Date.now(), name: newClientName.trim(), sessions: [] };
    const updated = [...clients, newClient];
    setClients(updated);
    saveToStorage(updated);
    setNewClientName('');
    setShowAddClient(false);
  };

  const updateExerciseName = (index, name) => {
    const updated = [...workout];
    updated[index] = { ...updated[index], exerciseName: name };
    setWorkout(updated);
  };

  const addSet = (exerciseIndex) => {
    const updated = [...workout];
    updated[exerciseIndex].sets.push({ id: Date.now(), reps: '', weight: '' });
    setWorkout(updated);
  };

  const updateSet = (exerciseIndex, setIndex, field, value) => {
    const updated = [...workout];
    updated[exerciseIndex].sets[setIndex][field] = value;
    setWorkout(updated);
  };

  const removeSet = (exerciseIndex, setIndex) => {
    const updated = [...workout];
    updated[exerciseIndex].sets.splice(setIndex, 1);
    setWorkout(updated);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !selectedClient) return;

    setIsScanning(true);
    setScanError('');

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Image = e.target.result.split(',')[1];
        
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1000,
            messages: [{
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: { type: 'base64', media_type: file.type, data: base64Image }
                },
                {
                  type: 'text',
                  text: `Extract workout data from this paper log. Return ONLY a JSON array in this exact format:
[
  {
    "date": "2024-01-15",
    "exercises": [
      {
        "exerciseName": "Bench Press",
        "sets": [
          {"reps": "10", "weight": "135"},
          {"reps": "8", "weight": "145"}
        ]
      }
    ]
  }
]

Extract all visible workout sessions with dates, exercise names, sets, reps, and weights. If no date is visible, use "Unknown". Return only the JSON array, no other text.`
                }
              ]
            }]
          })
        });

        const data = await response.json();
        const content = data.content[0].text;
        
        let sessions;
        try {
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          sessions = JSON.parse(jsonMatch ? jsonMatch[0] : content);
        } catch (e) {
          throw new Error('Could not parse workout data from image');
        }

        if (!Array.isArray(sessions) || sessions.length === 0) {
          throw new Error('No workout data found in image');
        }

        const updatedClients = clients.map(c => {
          if (c.id === selectedClient.id) {
            const newSessions = sessions.map(s => ({
              id: Date.now() + Math.random(),
              date: s.date === 'Unknown' ? new Date().toISOString() : new Date(s.date).toISOString(),
              exercises: s.exercises.map(ex => ({
                ...ex,
                sets: ex.sets.map((set, i) => ({ ...set, id: Date.now() + i }))
              })),
              scanned: true
            }));
            return { ...c, sessions: [...(c.sessions || []), ...newSessions] };
          }
          return c;
        });

        setClients(updatedClients);
        saveToStorage(updatedClients);
        setSelectedClient(updatedClients.find(c => c.id === selectedClient.id));
        
        alert(`✅ Successfully imported ${sessions.length} workout session(s)!`);
        setIsScanning(false);
      };
      
      reader.onerror = () => {
        setScanError('Failed to read image file');
        setIsScanning(false);
      };
      
      reader.readAsDataURL(file);
      
    } catch (error) {
      setScanError(error.message || 'Failed to scan image');
      setIsScanning(false);
    }
  };

  const startNewSession = () => {
    setWorkout([
      { id: 1, exerciseName: '', sets: [] },
      { id: 2, exerciseName: '', sets: [] },
      { id: 3, exerciseName: '', sets: [] },
      { id: 4, exerciseName: '', sets: [] },
      { id: 5, exerciseName: '', sets: [] },
      { id: 6, exerciseName: '', sets: [] },
      { id: 7, exerciseName: '', sets: [] },
      { id: 8, exerciseName: '', sets: [] }
    ]);
    setAutoSaveStatus('');
  };

  const generateInsights = async () => {
    if (!selectedClient || !selectedClient.sessions || selectedClient.sessions.length === 0) return;

    setLoadingInsights(true);
    setInsights(null);

    try {
      const historyText = selectedClient.sessions.map(session => {
        const date = new Date(session.date).toLocaleDateString();
        const exercises = session.exercises.map(ex => {
          const sets = ex.sets.map((s, i) => `Set ${i+1}: ${s.reps} reps @ ${s.weight}lbs`).join(', ');
          return `${ex.exerciseName}: ${sets}`;
        }).join('; ');
        return `${date}: ${exercises}`;
      }).join('\n');

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1500,
          messages: [{
            role: 'user',
            content: `You are a professional personal trainer analyzing workout history for ${selectedClient.name}. 

Workout History:
${historyText}

Provide a comprehensive analysis with:
1. **Progress Summary**: Overall trends (strength gains, consistency, improvements)
2. **Exercise-Specific Insights**: For each major exercise, note progression or plateaus
3. **Areas of Concern**: Stagnation, imbalances, potential overtraining
4. **Recommendations**: Specific actionable advice to improve training

Be encouraging but honest. Use data to support your insights. Format in clear sections with bullet points.`
          }]
        })
      });

      const data = await response.json();
      const analysis = data.content[0].text;
      setInsights(analysis);
      setLoadingInsights(false);
    } catch (error) {
      setInsights('Failed to generate insights. Please try again.');
      setLoadingInsights(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900">
      <div className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-800">GymFlow AI</h1>
          <p className="text-sm text-gray-600">Smart Training Management</p>
        </div>
      </div>

      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            <button
              onClick={() => setView('clients')}
              className={`flex items-center gap-2 px-6 py-3 font-medium whitespace-nowrap ${
                view === 'clients' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'
              }`}
            >
              <User size={18} />
              Clients
            </button>
            <button
              onClick={() => setView('training')}
              className={`flex items-center gap-2 px-6 py-3 font-medium whitespace-nowrap ${
                view === 'training' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'
              }`}
              disabled={!selectedClient}
            >
              <Dumbbell size={18} />
              Training
            </button>
            <button
              onClick={() => setView('history')}
              className={`flex items-center gap-2 px-6 py-3 font-medium whitespace-nowrap ${
                view === 'history' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'
              }`}
              disabled={!selectedClient}
            >
              <TrendingUp size={18} />
              History
            </button>
            <button
              onClick={() => { setView('insights'); if (!insights) generateInsights(); }}
              className={`flex items-center gap-2 px-6 py-3 font-medium whitespace-nowrap ${
                view === 'insights' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'
              }`}
              disabled={!selectedClient}
            >
              <TrendingUp size={18} />
              AI Insights
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {view === 'clients' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Your Clients</h2>
              <button
                onClick={() => setShowAddClient(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                <Plus size={20} />
                Add Client
              </button>
            </div>

            {showAddClient && (
              <div className="mb-6 p-4 bg-purple-50 rounded-lg">
                <input
                  type="text"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Client name"
                  className="w-full px-4 py-2 border rounded-lg mb-3"
                  onKeyPress={(e) => e.key === 'Enter' && addClient()}
                />
                <div className="flex gap-2">
                  <button onClick={addClient} className="flex-1 bg-blue-600 text-white py-2 rounded-lg">Add</button>
                  <button onClick={() => { setShowAddClient(false); setNewClientName(''); }} className="flex-1 bg-gray-300 py-2 rounded-lg">Cancel</button>
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-3 gap-4">
              {clients.length === 0 ? (
                <div className="col-span-3 text-center py-12 text-gray-500">
                  <User size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No clients yet</p>
                </div>
              ) : (
                clients.map(client => (
                  <div
                    key={client.id}
                    onClick={() => { setSelectedClient(client); setView('training'); }}
                    className={`p-6 rounded-lg cursor-pointer border-2 ${
                      selectedClient?.id === client.id ? 'bg-blue-50 border-blue-600' : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                        {client.name[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{client.name}</p>
                        <p className="text-sm text-gray-600">{client.sessions?.length || 0} sessions</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {view === 'training' && selectedClient && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-800">{selectedClient.name}'s Workout</h2>
              <div className="flex items-center gap-3">
                {autoSaveStatus && (
                  <span className="text-sm text-green-600 font-medium">{autoSaveStatus}</span>
                )}
                <label className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 cursor-pointer">
                  {isScanning ? <Loader size={18} className="animate-spin" /> : <Camera size={18} />}
                  {isScanning ? 'Scanning...' : 'Scan Paper Log'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isScanning}
                  />
                </label>
              </div>
            </div>

            {scanError && (
              <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-lg text-sm">
                {scanError}
              </div>
            )}

            <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
              💡 Auto-saves as you type. Use "Scan Paper Log" to import old workout records.
            </div>

            <div className="space-y-3">
              {workout.map((exercise, idx) => (
                <div key={exercise.id} className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {idx + 1}
                    </div>
                    <select
                      value={exercise.exerciseName}
                      onChange={(e) => updateExerciseName(idx, e.target.value)}
                      className="flex-1 px-3 py-2 border rounded-lg text-sm"
                    >
                      <option value="">Select Exercise...</option>
                      {Object.entries(exerciseLibrary).map(([category, exercises]) => (
                        <optgroup key={category} label={category}>
                          {exercises.map(ex => (
                            <option key={ex} value={ex}>{ex}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <button
                      onClick={() => toggleVoice(idx)}
                      disabled={!exercise.exerciseName}
                      className={`p-2 rounded-lg ${
                        isListening && currentExerciseIndex === idx
                          ? 'bg-red-600 text-white' 
                          : exercise.exerciseName ? 'bg-cyan-600 text-white hover:bg-cyan-700' : 'bg-gray-300 text-gray-500'
                      }`}
                    >
                      {isListening && currentExerciseIndex === idx ? <MicOff size={18} /> : <Mic size={18} />}
                    </button>
                    <button
                      onClick={() => addSet(idx)}
                      disabled={!exercise.exerciseName}
                      className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium ${
                        exercise.exerciseName ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-300 text-gray-500'
                      }`}
                    >
                      <Plus size={16} />
                      Add Set
                    </button>
                  </div>

                  {exercise.sets.length > 0 && (
                    <div className="space-y-2 pl-11">
                      {exercise.sets.map((set, setIdx) => (
                        <div key={set.id} className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-600 w-12">Set {setIdx + 1}</span>
                          <input
                            type="number"
                            value={set.reps}
                            onChange={(e) => updateSet(idx, setIdx, 'reps', e.target.value)}
                            placeholder="Reps"
                            className="w-16 px-2 py-1 border rounded text-sm text-center"
                          />
                          <span className="text-xs text-gray-600">reps</span>
                          <input
                            type="number"
                            value={set.weight}
                            onChange={(e) => updateSet(idx, setIdx, 'weight', e.target.value)}
                            placeholder="lbs"
                            className="w-16 px-2 py-1 border rounded text-sm text-center"
                          />
                          <span className="text-xs text-gray-600">lbs</span>
                          <button onClick={() => removeSet(idx, setIdx)} className="ml-auto text-red-600 hover:text-red-800">
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'history' && selectedClient && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">{selectedClient.name}'s History</h2>

            {!selectedClient.sessions || selectedClient.sessions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <TrendingUp size={48} className="mx-auto mb-4 opacity-50" />
                <p>No sessions yet</p>
              </div>
            ) : (
              <div className="space-y-6">
                {selectedClient.sessions.slice().reverse().map((session) => (
                  <div key={session.id} className="p-5 bg-gray-50 rounded-lg border">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-bold text-gray-800">
                        {new Date(session.date).toLocaleDateString('en-US', { 
                          weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </h3>
                      {session.scanned && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          📷 Scanned
                        </span>
                      )}
                    </div>
                    <div className="space-y-3">
                      {session.exercises.map((ex, idx) => (
                        <div key={idx} className="p-3 bg-white rounded border">
                          <p className="font-semibold text-gray-800 mb-2">{idx + 1}. {ex.exerciseName}</p>
                          <div className="space-y-1 text-sm text-gray-700 pl-4">
                            {ex.sets.map((set, setIdx) => (
                              <p key={set.id}>Set {setIdx + 1}: {set.reps} reps @ {set.weight} lbs</p>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'insights' && selectedClient && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">AI Insights - {selectedClient.name}</h2>
              <button
                onClick={generateInsights}
                disabled={loadingInsights || !selectedClient.sessions || selectedClient.sessions.length === 0}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
              >
                {loadingInsights ? <Loader size={18} className="animate-spin" /> : <TrendingUp size={18} />}
                {loadingInsights ? 'Analyzing...' : 'Refresh Insights'}
              </button>
            </div>

            {!selectedClient.sessions || selectedClient.sessions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <TrendingUp size={48} className="mx-auto mb-4 opacity-50" />
                <p>No workout history to analyze yet</p>
              </div>
            ) : loadingInsights ? (
              <div className="text-center py-12">
                <Loader size={48} className="mx-auto mb-4 opacity-50 animate-spin text-blue-600" />
                <p className="text-gray-600">AI analyzing workout history...</p>
              </div>
            ) : insights ? (
              <div className="prose max-w-none">
                <div className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border-2 border-blue-200">
                  <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                    {insights}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-600 mb-4">Click "Refresh Insights" to generate AI analysis</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}