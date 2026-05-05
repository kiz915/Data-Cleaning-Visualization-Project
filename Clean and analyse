import pandas as pd
import numpy as np
import json

df_raw = pd.read_csv('/home/claude/raw_employee_data.csv')

stats = {"raw": {"rows": len(df_raw), "cols": len(df_raw.columns)}}

# --- STEP 1: Remove duplicates ---
before = len(df_raw)
df = df_raw.drop_duplicates()
stats["duplicates_removed"] = before - len(df)

# --- STEP 2: Fix remote_work standardization ---
df['remote_work'] = df['remote_work'].str.strip().str.upper()
df['remote_work'] = df['remote_work'].map({'YES': 'Yes', 'NO': 'No'}).fillna('Unknown')

# --- STEP 3: Handle age outliers/invalid ---
df['age'] = pd.to_numeric(df['age'], errors='coerce')
outlier_ages = ((df['age'] < 18) | (df['age'] > 80)).sum()
df.loc[(df['age'] < 18) | (df['age'] > 80), 'age'] = np.nan
stats["invalid_ages_removed"] = int(outlier_ages)

# --- STEP 4: Handle salary outliers (IQR method) ---
q1, q3 = df['salary'].quantile([0.25, 0.75])
iqr = q3 - q1
lower, upper = q1 - 1.5*iqr, q3 + 1.5*iqr
salary_outliers = ((df['salary'] < lower) | (df['salary'] > upper)).sum()
df.loc[(df['salary'] < lower) | (df['salary'] > upper), 'salary'] = np.nan
stats["salary_outliers_capped"] = int(salary_outliers)

# --- STEP 5: Fill missing values ---
df['salary'].fillna(df.groupby('department')['salary'].transform('median'), inplace=True)
df['salary'].fillna(df['salary'].median(), inplace=True)
df['age'].fillna(df['age'].median(), inplace=True)
df['years_experience'].fillna(df['years_experience'].median(), inplace=True)
df['performance_score'].fillna(df['performance_score'].mode()[0], inplace=True)
df['department'].fillna('Unknown', inplace=True)
df['city'].fillna('Unknown', inplace=True)

# --- STEP 6: Feature engineering ---
df['salary_band'] = pd.cut(df['salary'], bins=[0, 60000, 90000, 120000, 999999],
                            labels=['Entry', 'Mid', 'Senior', 'Executive'])
df['hire_date'] = pd.to_datetime(df['hire_date'])
df['tenure_years'] = (pd.Timestamp('2026-01-01') - df['hire_date']).dt.days / 365

stats["clean"] = {"rows": len(df), "cols": len(df.columns)}
stats["missing_after"] = int(df.isnull().sum().sum())

# --- Compute insights for dashboard ---
by_dept = df.groupby('department').agg(
    avg_salary=('salary', 'mean'),
    count=('employee_id', 'count'),
    avg_perf=('performance_score', 'mean')
).reset_index().sort_values('avg_salary', ascending=False)

salary_dist = df['salary'].round(-3).value_counts().sort_index()
salary_hist_bins = pd.cut(df['salary'], bins=12).value_counts().sort_index()

perf_dist = df['performance_score'].value_counts().sort_index()

remote_dist = df['remote_work'].value_counts()

salary_band_dist = df['salary_band'].value_counts()

age_bins = pd.cut(df['age'], bins=[18, 25, 35, 45, 55, 65, 80]).value_counts().sort_index()

dept_perf = df.groupby('department')['performance_score'].mean().sort_values(ascending=False)

insights = {
    "stats": stats,
    "by_dept": by_dept.to_dict(orient='records'),
    "perf_dist": {str(k): int(v) for k, v in perf_dist.items()},
    "remote_dist": {str(k): int(v) for k, v in remote_dist.items()},
    "salary_band": {str(k): int(v) for k, v in salary_band_dist.items()},
    "age_bins": {str(k): int(v) for k, v in age_bins.items()},
    "dept_perf": {str(k): round(float(v), 2) for k, v in dept_perf.items()},
    "summary": {
        "avg_salary": round(df['salary'].mean(), 0),
        "median_salary": round(df['salary'].median(), 0),
        "avg_age": round(df['age'].mean(), 1),
        "avg_tenure": round(df['tenure_years'].mean(), 1),
        "avg_perf": round(df['performance_score'].mean(), 2),
        "remote_pct": round((df['remote_work'] == 'Yes').mean() * 100, 1)
    }
}

with open('/home/claude/insights.json', 'w') as f:
    json.dump(insights, f, indent=2)

df.to_csv('/home/claude/clean_employee_data.csv', index=False)
print("Done! Insights saved.")
print(json.dumps(stats, indent=2))
print("Summary:", json.dumps(insights['summary'], indent=2))
