
/**
 * Melodic Contour Perception — Prototype
 * Web Audio API tone synthesis + trial flow + CSV export
 */

const btnPlayA = document.getElementById('btnPlayA');
const btnPlayB = document.getElementById('btnPlayB');
const btnSame  = document.getElementById('btnSame');
const btnDiff  = document.getElementById('btnDiff');
const btnStart = document.getElementById('btnStart');
const btnNext  = document.getElementById('btnNext');
const btnFinish= document.getElementById('btnFinish');
const statusEl = document.getElementById('status');
const scoreEl  = document.getElementById('score');

// Audio setup
let audioCtx;
function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

// Parameters
const N_TRIALS = 10;         // keep small for prototype
const N_NOTES  = 5;
const TONE_MS  = 280;
const GAP_MS   = 90;
const BASE_MIDI_MIN = 55;    // ~G3
const BASE_MIDI_MAX = 67;    // ~G4
const STEP_OPTIONS = [-3,-2,-1,1,2,3];  // semitone steps (no 0 to enforce contour)

// State
let trials = [];
let current = -1;
let trialStartTime = null;
let lastResponseTime = null;
let responded = false;
let correctCount = 0;

// Utility: MIDI to frequency
function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }

// Make a random melody (array of MIDI) with a specific contour (sequence of +/-)
function makeMelodyWithContour(baseMidi, steps) {
  const notes = [baseMidi];
  for (let s of steps) {
    notes.push(notes[notes.length - 1] + s);
  }
  return notes;
}

// Create a random contour as a list of signed steps (no zeros)
function randomContour(nSteps) {
  const steps = [];
  for (let i = 0; i < nSteps; i++) {
    const s = STEP_OPTIONS[Math.floor(Math.random() * STEP_OPTIONS.length)];
    steps.push(s);
  }
  return steps;
}

// Make a contour-variant: flip one random step's sign to create "different"
function flippedContour(steps) {
  const idx = Math.floor(Math.random() * steps.length);
  const newSteps = steps.slice();
  newSteps[idx] = -newSteps[idx];
  return newSteps;
}

// Synthesize & play a melody (array of MIDI) with simple envelope
async function playMelody(midiNotes) {
  ensureAudio();
  let t = audioCtx.currentTime;
  for (let i = 0; i < midiNotes.length; i++) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(mtof(midiNotes[i]), t);

    // Envelope: quick attack/decay, short sustain, quick release
    const A = 0.01, D = 0.05, S = 0.75, R = 0.05;
    const dur = TONE_MS / 1000.0;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.9, t + A);
    gain.gain.linearRampToValueAtTime(0.9 * S, t + A + D);
    gain.gain.setValueAtTime(0.9 * S, t + dur - R);
    gain.gain.linearRampToValueAtTime(0.0001, t + dur);

    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + dur);

    t += dur + (GAP_MS / 1000.0);
  }
  // Wait for the total scheduled time to pass before resolving
  const totalMs = midiNotes.length * (TONE_MS + GAP_MS) + 50;
  await new Promise(res => setTimeout(res, totalMs));
}

// Build trials upfront
function buildTrials(nTrials) {
  const arr = [];
  for (let i = 0; i < nTrials; i++) {
    const baseA = BASE_MIDI_MIN + Math.floor(Math.random() * (BASE_MIDI_MAX - BASE_MIDI_MIN));
    const stepsA = randomContour(N_NOTES - 1);
    const melodyA = makeMelodyWithContour(baseA, stepsA);

    const same = Math.random() < 0.5;
    let stepsB, baseB;
    if (same) {
      // same contour, transposed base
      stepsB = stepsA.slice();
      baseB = BASE_MIDI_MIN + Math.floor(Math.random() * (BASE_MIDI_MAX - BASE_MIDI_MIN));
    } else {
      // different contour, flip one step
      stepsB = flippedContour(stepsA);
      baseB = BASE_MIDI_MIN + Math.floor(Math.random() * (BASE_MIDI_MAX - BASE_MIDI_MIN));
    }
    const melodyB = makeMelodyWithContour(baseB, stepsB);

    arr.push({
      trial: i+1,
      same,
      stepsA, stepsB,
      melodyA, melodyB
    });
  }
  return arr;
}

// CSV helper
function toCSV(rows) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === 'string' ? v : JSON.stringify(v);
    const needsQuote = /[",\n]/.test(s);
    return needsQuote ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [];
  lines.push(headers.join(","));
  for (const r of rows) {
    lines.push(headers.map(h => escape(r[h])).join(","));
  }
  return lines.join("\n");
}

// UI flow
function setButtonsPlaying(enabled) {
  btnPlayA.disabled = !enabled;
  btnPlayB.disabled = !enabled;
}
function setButtonsChoice(enabled) {
  btnSame.disabled = !enabled;
  btnDiff.disabled = !enabled;
}
function setNav(start, next, finish) {
  btnStart.disabled = !start;
  btnNext.disabled = !next;
  btnFinish.disabled = !finish;
}

function resetScore() {
  correctCount = 0;
  scoreEl.textContent = "";
}

btnStart.addEventListener('click', () => {
  trials = buildTrials(N_TRIALS);
  current = 0;
  resetScore();
  statusEl.textContent = `Trial 1 of ${N_TRIALS}. Press ▶ Play Sequence A.`;
  setButtonsPlaying(true);
  setButtonsChoice(true);
  setNav(true, true, false);
  trialStartTime = performance.now();
  responded = false;
});

btnPlayA.addEventListener('click', async () => {
  const t = trials[current];
  statusEl.textContent = "Playing Sequence A...";
  await playMelody(t.melodyA);
  statusEl.textContent = "A done. You can play A or B again, then choose.";
});

btnPlayB.addEventListener('click', async () => {
  const t = trials[current];
  statusEl.textContent = "Playing Sequence B...";
  await playMelody(t.melodyB);
  statusEl.textContent = "B done. Choose Same or Different.";
});

async function recordResponse(resp) {
  if (responded) return; // one response per trial
  responded = true;
  lastResponseTime = performance.now() - trialStartTime;
  const t = trials[current];
  const correct = (resp === (t.same ? 'same' : 'different'));
  if (correct) correctCount += 1;

  // store on the trial object
  t.response = resp;
  t.correct = correct;
  t.rt_ms = Math.round(lastResponseTime);

  scoreEl.textContent = `Accuracy so far: ${correctCount} / ${current+1}`;
  statusEl.textContent = `Recorded: ${resp.toUpperCase()} — ${correct ? 'Correct' : 'Incorrect'}. Press Next.`;
}

btnSame.addEventListener('click', () => recordResponse('same'));
btnDiff.addEventListener('click', () => recordResponse('different'));

btnNext.addEventListener('click', () => {
  if (current === -1) return;
  if (!responded) {
    statusEl.textContent = "Please choose Same or Different before continuing.";
    return;
  }
  if (current < N_TRIALS - 1) {
    current += 1;
    responded = false;
    trialStartTime = performance.now();
    statusEl.textContent = `Trial ${current+1} of ${N_TRIALS}. Press ▶ Play Sequence A.`;
  } else {
    statusEl.textContent = "All trials complete. Click Finish to download data.";
    setButtonsPlaying(false);
    setButtonsChoice(true);
    setNav(true, false, true);
  }
});

btnFinish.addEventListener('click', () => {
  // Prepare data
  const pid = `P_${Math.random().toString(36).slice(2,8)}`;
  const rows = trials.map(t => ({
    participant_id: pid,
    trial: t.trial,
    same_trial: t.same,
    response: t.response ?? '',
    correct: t.correct ?? '',
    rt_ms: t.rt_ms ?? '',
    stepsA: JSON.stringify(t.stepsA),
    stepsB: JSON.stringify(t.stepsB),
    melodyA: JSON.stringify(t.melodyA),
    melodyB: JSON.stringify(t.melodyB),
    timestamp_ms: Date.now()
  }));

  const csv = toCSV(rows);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `contour_data_${pid}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  statusEl.textContent = "CSV downloaded. Thanks!";
  setNav(true, false, true);
});
