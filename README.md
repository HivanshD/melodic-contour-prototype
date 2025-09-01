
# Melodic Contour Perception — Mini Web Experiment (Prototype)

This is a prototype intended to demonstrate technical capability, not a full study.
- JavaScript/HTML web experiment
- Behavioral trial structure, response logging, and RTs
- Client-side data export to CSV
- Python analysis (Pandas + basic stats + plot)

## How it works
Participants hear two 5‑note sequences (A then B) and judge **Same Contour** vs **Different Contour**.
- Tones are synthesized on the fly via the Web Audio API (no external audio files). (simplest way, can use different audios later)

## Quick start
1. Open `web/index.html` in a modern browser (Chrome recommended).
2. Click **Start**, run a few trials, then click **Finish & Download CSV** to save your data.
3. Put the CSV into `analysis/` and run the Python script below.

## Analysis
Run:
```bash
cd analysis
python analyze.py path/to/exported_data.csv
```
This prints overall accuracy, does a simple binomial test versus chance (0.5),
and saves `accuracy_plot.png`.

