// BrightInterview - script.js (beginner-friendly, well-commented)

// Elements
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const nextQBtn = document.getElementById('nextQBtn');
const tryDemoBtn = document.getElementById('tryDemoBtn');
const learnMoreBtn = document.getElementById('learnMoreBtn');
const difficulty = document.getElementById('difficulty');

const video = document.getElementById('localVideo');
const videoOverlay = document.getElementById('videoOverlay');
const questionText = document.getElementById('questionText');
const transcriptBox = document.getElementById('transcriptBox');
const analyzeBtn = document.getElementById('analyzeBtn');
const clearTranscriptBtn = document.getElementById('clearTranscriptBtn');

const confidenceFill = document.getElementById('confidenceFill');
const stressFill = document.getElementById('stressFill');
const honestyFill = document.getElementById('honestyFill');
const confidenceVal = document.getElementById('confidenceVal');
const stressVal = document.getElementById('stressVal');
const honestyVal = document.getElementById('honestyVal');
const suggestionsList = document.getElementById('suggestionsList');

const miniConfidenceFill = document.getElementById('miniConfidenceFill');
const miniConfidence = document.getElementById('miniConfidence');
const miniStressFill = document.getElementById('miniStressFill');
const miniStress = document.getElementById('miniStress');

const reportArea = document.getElementById('reportArea');
const fetchReportBtn = document.getElementById('fetchReportBtn');

let localStream = null;
let recognition = null;
let recognizing = false;
let currentQ = 0;
let startTime = null;

// A larger list of useful interview questions (3 difficulties)
const questions = {
  basic: [
    "Tell me about yourself.",
    "Why do you want this job?",
    "What are your strengths?",
    "What are your weaknesses?",
    "Describe a challenge you faced."
  ],
  intermediate: [
    "Describe a time you solved a difficult problem.",
    "How do you prioritize work under pressure?",
    "Give an example of a team conflict and how you resolved it.",
    "Tell me about a project you led.",
    "How do you handle feedback?"
  ],
  advanced: [
    "Explain a technical decision you made and why.",
    "How would you improve our product (choose any app)?",
    "Describe a time you reduced costs or increased efficiency.",
    "How do you design for scale in systems?",
    "Where do you see yourself in 5 years?"
  ]
};

// Helpers for scrolling
const scrollToEl = (el) => window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 10, behavior: 'smooth' });
tryDemoBtn?.addEventListener('click', () => scrollToEl(document.getElementById('demo')));
learnMoreBtn?.addEventListener('click', () => scrollToEl(document.getElementById('how')));

// Update question text based on difficulty
function setQuestion(){
  const level = difficulty?.value || 'basic';
  const arr = questions[level];
  questionText.textContent = arr[currentQ % arr.length];
}

// Start camera and speech recognition
startBtn.onclick = async () => {
  try {
    if(!navigator.mediaDevices?.getUserMedia){
      alert('This browser does not support camera or microphone.');
      return;
    }
    localStream = await navigator.mediaDevices.getUserMedia({ video:true, audio:true });
    video.srcObject = localStream;
    if(videoOverlay) videoOverlay.style.display = 'none';
    stopBtn.disabled = false;
    startRecognition();
    startTime = Date.now();
  } catch(err) {
    console.error(err);
    alert('Please allow camera & microphone and use HTTPS or localhost.');
  }
};

// Stop camera and recognition
stopBtn.onclick = () => {
  if(localStream){
    localStream.getTracks().forEach(t => t.stop());
    localStream = null;
  }
  if(videoOverlay) videoOverlay.style.display = 'grid';
  stopRecognition();
  stopBtn.disabled = true;
};

// Next question
nextQBtn.onclick = () => {
  currentQ++;
  setQuestion();
  transcriptBox.textContent = '(No transcript yet)';
};

// Clear transcript
clearTranscriptBtn.onclick = () => transcriptBox.textContent = '(No transcript yet)';

// Simple analyze function (creates numeric scores, posts to server)
analyzeBtn.onclick = async () => {
  const text = transcriptBox.textContent?.trim();
  if(!text || text === '(No transcript yet)'){ alert('No transcript to analyze. Please speak first.'); return; }
  // Simple heuristics: longer answers -> more confidence; filler words -> reduce honesty
  const lengthFactor = Math.min(1, text.length / 300);
  const fillers = (text.match(/umm+|uh+|like|maybe|so|actually/gi) || []).length;
  const talkTime = ((Date.now() - (startTime || Date.now())) / 1000) || 1;
  const pace = Math.min(1, text.split(/\s+/).length / Math.max(talkTime,1)); // words per sec

  const confidence = Math.round(50 + 50 * lengthFactor + Math.min(10, pace*10));
  const stress = Math.round(Math.max(5, 60 - 40 * lengthFactor + fillers*5));
  const honesty = Math.round(Math.max(30, 90 - fillers*12));

  setMeter(confidenceFill, confidenceVal, confidence);
  setMeter(stressFill, stressVal, stress);
  setMeter(honestyFill, honestyVal, honesty);
  setMeter(miniConfidenceFill, miniConfidence, confidence);
  setMeter(miniStressFill, miniStress, stress);

  updateSuggestions(confidence, stress, honesty, fillers);

  // Send to backend to save the session score
  try {
    const payload = {
      question: questionText.textContent,
      difficulty: difficulty?.value || 'basic',
      confidence, stress, honesty, timestamp: new Date().toISOString()
    };
    const res = await fetch('/api/score', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    const j = await res.json();
    if(j.success) {
      alert('Score saved to server. You can view the report below.');
    } else {
      console.warn('Server save failed', j);
    }
  } catch(e){
    console.warn('Save failed', e);
  }
};

// Helpers to set meters and text
function setMeter(fillEl, valEl, v){
  if(!fillEl) return;
  if(fillEl.tagName === 'DIV' && valEl && valEl.tagName === 'SPAN') {
    // mini meter pair: fillEl is div, valEl is span
    fillEl.style.width = v + '%';
    valEl.textContent = v + '%';
    return;
  }
  fillEl.style.width = v + '%';
  if(valEl) valEl.textContent = v + '%';
}

// Suggestions list
function updateSuggestions(conf, stress, honesty, fillers){
  suggestionsList.innerHTML = '';
  addSuggestion(conf < 60 ? 'Use short clear sentences and structure (STAR).' : 'Clear answers — keep using examples.');
  addSuggestion(stress > 45 ? 'Slow down, breathe between points.' : 'Good calm pace.');
  addSuggestion(honesty < 70 ? 'Reduce filler words like "umm", "uh", "like".' : 'Authentic tone — add one concrete example.');
  if(fillers > 2) addSuggestion('Practice pausing instead of saying fillers.');
}

function addSuggestion(t){ const li = document.createElement('li'); li.textContent = t; suggestionsList.appendChild(li); }

// Speech recognition (Web Speech API)
function startRecognition(){
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SpeechRecognition){
    console.warn('Web Speech API not available');
    return;
  }
  recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = true;
  recognition.continuous = true;

  recognition.onresult = (event) => {
    let transcript = '';
    for(let i = event.resultIndex; i < event.results.length; i++){
      transcript += event.results[i][0].transcript;
    }
    transcript = transcript.trim();
    if(transcript){
      const existing = transcriptBox.textContent === '(No transcript yet)' ? '' : transcriptBox.textContent + ' ';
      transcriptBox.textContent = existing + transcript;
    }
  };
  recognition.onend = () => { if(recognizing) recognition.start(); };
  recognition.onerror = (e) => console.warn('Speech error', e);
  recognizing = true;
  recognition.start();
}

function stopRecognition(){ recognizing = false; if(recognition){ try{ recognition.stop(); }catch(e){} recognition = null; } }

// Report fetch
fetchReportBtn?.addEventListener('click', async () => {
  try {
    const res = await fetch('/api/summary');
    const j = await res.json();
    if(j.success){
      reportArea.innerHTML = `Saved sessions: ${j.count} <br> Average Confidence: ${j.avgConfidence}% <br> Average Stress: ${j.avgStress}% <br> Average Honesty: ${j.avgHonesty}% <br> <strong>Server suggestions:</strong><ul>${j.suggestions.map(s => '<li>'+s+'</li>').join('')}</ul>`;
    } else {
      reportArea.innerText = 'No sessions saved yet.';
    }
  } catch(e){ console.warn(e); reportArea.innerText = 'Could not fetch report.'; }
});

// Set initial question and difficulty change handler
setQuestion();
difficulty?.addEventListener('change', () => {
  currentQ = 0;
  setQuestion();
});
