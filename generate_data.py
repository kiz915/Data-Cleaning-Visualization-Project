import pandas as pd
import numpy as np
import json

np.random.seed(42)
n = 500

departments = ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance', 'Operations']
cities = ['New York', 'San Francisco', 'Austin', 'Chicago', 'Boston', 'Seattle', None]

data = {
    'employee_id': [f'EMP{str(i).zfill(4)}' for i in range(1, n+1)],
    'name': [f'Employee_{i}' for i in range(1, n+1)],
    'department': np.random.choice(departments + [None], n, p=[0.22, 0.18, 0.15, 0.12, 0.14, 0.14, 0.05]),
    'salary': np.concatenate([
        np.random.normal(85000, 20000, int(n*0.9)),
        np.random.normal(350000, 50000, int(n*0.05)),  # outliers
        np.full(n - int(n*0.9) - int(n*0.05), np.nan)  # missing
    ]),
    'age': np.concatenate([
        np.random.randint(22, 65, int(n*0.92)),
        [-5, 150, 200, 999],  # invalid ages
        np.full(n - int(n*0.92) - 4, np.nan)
    ]),
    'years_experience': np.random.choice(list(range(0, 20)) + [None], n),
    'performance_score': np.random.choice([1, 2, 3, 4, 5, None], n, p=[0.08, 0.15, 0.3, 0.27, 0.15, 0.05]),
    'city': np.random.choice(cities, n),
    'hire_date': pd.date_range('2010-01-01', periods=n, freq='3D').strftime('%Y-%m-%d').tolist(),
    'remote_work': np.random.choice(['Yes', 'No', 'yes', 'no', 'YES', None, 'N/A'], n),
}

df = pd.DataFrame(data)

# Add ~5% duplicates
dup_idx = np.random.choice(df.index, size=25, replace=False)
df = pd.concat([df, df.loc[dup_idx]], ignore_index=True)
df = df.sample(frac=1, random_state=42).reset_index(drop=True)

df.to_csv('/home/claude/raw_employee_data.csv', index=False)
print(f"Raw dataset: {df.shape[0]} rows, {df.shape[1]} cols")
print(f"Missing values:\n{df.isnull().sum()}")
print(f"Duplicates: {df.duplicated().sum()}")
