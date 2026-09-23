import { NextResponse } from 'next/server';
import experimentsData from '@/lib/fixtures/experiments.json';

export async function GET() {
  const variable_ablation = [
    {
      variant_id: 'ABL-01',
      name: 'SST',
      n_variables: 1,
      test_rmse: 0.618,
      delta: '—',
      ml_rmse: 0.442,
      thermocline_rmse: 1.026,
      deep_rmse: 0.247,
      description: 'SST alone baseline for variable ablation (0.618°C RMSE).',
      variablesIncluded: ['SST']
    },
    {
      variant_id: 'ABL-02',
      name: 'SST + SLA',
      n_variables: 2,
      test_rmse: 0.536,
      delta: '-0.082 (13.2%)',
      ml_rmse: 0.441,
      thermocline_rmse: 0.850,
      deep_rmse: 0.245,
      description: 'SLA accounts for 87.5% of the total improvement gained by adding all 6 other variables to SST.',
      variablesIncluded: ['SST', 'SLA']
    },
    {
      variant_id: 'ABL-03',
      name: 'SST + SLA + SSS',
      n_variables: 3,
      test_rmse: 0.531,
      delta: '-0.087 (14.1%)',
      ml_rmse: 0.438,
      thermocline_rmse: 0.810,
      deep_rmse: 0.243,
      description: 'Sea Surface Salinity adds density stratification context, lowering thermocline error further.',
      variablesIncluded: ['SST', 'SLA', 'SSS']
    },
    {
      variant_id: 'ABL-04',
      name: 'All 7',
      n_variables: 7,
      test_rmse: 0.525,
      delta: '-0.093 (15.0%)',
      ml_rmse: 0.436,
      thermocline_rmse: 0.795,
      deep_rmse: 0.242,
      description: 'Full surface tensor (SST, SSS, SLA, u, v, uwnd, vwnd) final production model.',
      variablesIncluded: ['SST', 'SSS', 'SLA', 'u', 'v', 'uwnd', 'vwnd']
    }
  ];

  return NextResponse.json({
    experiments: experimentsData,
    variable_ablation,
    key_findings: [
      'SLA accounts for 87.5% of the total improvement gained by adding all 6 other variables to SST.',
      'U-Net encoder-decoder architecture with skip connections achieved 0.525°C RMSE on test evaluation.',
      'MSE loss objective without auxiliary terms provided optimal convergence and performance.'
    ]
  });
}
