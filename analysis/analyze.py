
import sys
import pandas as pd
import numpy as np
import math
import matplotlib.pyplot as plt

def binomial_test(k, n, p=0.5):
    """Simple two-sided binomial test using normal approximation (fine for quick prototype)."""
    if n == 0:
        return 1.0
    mean = n * p
    var = n * p * (1 - p)
    if var == 0:
        return 1.0
    z = (k - mean) / math.sqrt(var)
    # two-sided
    from math import erf, sqrt
    # normal CDF
    def norm_cdf(x): return 0.5 * (1 + erf(x / math.sqrt(2)))
    p_two_sided = 2 * min(norm_cdf(z), 1 - norm_cdf(z))
    return p_two_sided

def main():
    if len(sys.argv) < 2:
        print("Usage: python analyze.py path/to/exported_data.csv")
        sys.exit(1)
    path = sys.argv[1]
    df = pd.read_csv(path)
    # clean booleans if they come in as strings
    if df['correct'].dtype == object:
        df['correct'] = df['correct'].astype(str).str.lower().isin(['true','1','yes'])
    acc = df['correct'].mean()
    n = len(df)
    k = int(df['correct'].sum())
    pval = binomial_test(k, n, p=0.5)

    print(f"Trials: {n}")
    print(f"Correct: {k}")
    print(f"Accuracy: {acc:.3f}")
    print(f"Binomial test vs 0.5 (approx): p = {pval:.4f}")

    # RT summary by correctness
    if 'rt_ms' in df.columns:
        print("\nResponse time (ms):")
        print(df.groupby('correct')['rt_ms'].describe())

    # Save a tiny plot
    fig = plt.figure(figsize=(4,3))
    plt.bar(['Accuracy'], [acc])
    plt.axhline(0.5, linestyle='--')
    plt.ylim(0,1)
    plt.ylabel('Proportion correct')
    plt.title('Melodic Contour — Accuracy')
    plt.tight_layout()
    out_path = 'accuracy_plot.png'
    plt.savefig(out_path, dpi=160)
    print(f"Saved plot to {out_path}")

if __name__ == '__main__':
    main()
