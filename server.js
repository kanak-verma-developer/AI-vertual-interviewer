// Simple Node.js backend (Express) to save scores and provide a summary
const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DATA_FILE = path.join(__dirname, 'scores.json');

// Ensure file exists
if(!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify([]));

app.post('/api/score', (req, res) => {
  try {
    const score = req.body;
    if(!score || typeof score.confidence === 'undefined') {
      return res.json({ success:false, error:'Invalid payload' });
    }
    const arr = JSON.parse(fs.readFileSync(DATA_FILE));
    arr.push(score);
    fs.writeFileSync(DATA_FILE, JSON.stringify(arr, null, 2));
    return res.json({ success:true });
  } catch(err) {
    console.error(err);
    return res.json({ success:false, error:err.message });
  }
});

app.get('/api/summary', (req, res) => {
  try {
    const arr = JSON.parse(fs.readFileSync(DATA_FILE));
    if(!arr.length) return res.json({ success:false, count:0 });
    const count = arr.length;
    const avgConfidence = Math.round(arr.reduce((s,x)=>s+x.confidence,0)/count);
    const avgStress = Math.round(arr.reduce((s,x)=>s+x.stress,0)/count);
    const avgHonesty = Math.round(arr.reduce((s,x)=>s+x.honesty,0)/count);

    const suggestions = [];
    if(avgConfidence < 60) suggestions.push('Work on structuring answers (STAR) and give specific examples.');
    else suggestions.push('Your confidence is good; maintain concise examples.');
    if(avgStress > 45) suggestions.push('Practice breathing exercises before interviews.');
    else suggestions.push('Stress levels are low — good control.');
    if(avgHonesty < 70) suggestions.push('Reduce filler words; practice with a timer.');
    else suggestions.push('Tone looks authentic.');

    return res.json({ success:true, count, avgConfidence, avgStress, avgHonesty, suggestions });
  } catch(err) {
    console.error(err);
    return res.json({ success:false, error:err.message });
  }
});

app.listen(PORT, () => console.log('Server running on http://localhost:'+PORT));
