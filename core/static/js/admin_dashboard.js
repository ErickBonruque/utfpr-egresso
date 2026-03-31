/**
 * Admin Dashboard — Chart.js interativo com suporte a tema light/dark.
 * Todos os charts são destruídos e recriados ao trocar de tema.
 */

'use strict';

// ── Helpers de tema ──────────────────────────────────────────────────────

function getCSSVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function themeColors() {
    return {
        text:   getCSSVar('--text-primary')  || '#212529',
        muted:  getCSSVar('--text-muted')    || '#6c757d',
        border: getCSSVar('--border-color')  || '#dee2e6',
        bg:     getCSSVar('--bg-card')       || '#ffffff',
        yellow: getCSSVar('--utfpr-yellow')  || '#FFC72C',
        grid:   getCSSVar('--border-color')  || '#dee2e6',
    };
}

function applyChartDefaults() {
    const t = themeColors();
    Chart.defaults.color = t.muted;
    Chart.defaults.borderColor = t.border;
    Chart.defaults.font.family = "'Inter', 'Segoe UI', sans-serif";
    Chart.defaults.font.size = 12;
}

// ── Paleta de cores ──────────────────────────────────────────────────────

const PALETTE = [
    '#6366f1', '#10b981', '#f59e0b', '#ef4444',
    '#3b82f6', '#ec4899', '#14b8a6', '#f97316',
    '#8b5cf6', '#84cc16',
];

const STATUS_COLORS = {
    ativo:    '#10b981',
    formado:  '#FFC72C',
    trancado: '#f59e0b',
    evadido:  '#ef4444',
};

const GPA_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#6366f1'];

const WORKLOAD_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981'];

// ── Instâncias dos charts (para destruição ao trocar tema) ───────────────

let allCharts = [];

function destroyAllCharts() {
    allCharts.forEach(c => { try { c.destroy(); } catch (_) {} });
    allCharts = [];
}

// ── KPI Cards (DOM, não canvas) ──────────────────────────────────────────

function renderKpiCards(kpis, statusCounts) {
    const container = document.getElementById('kpi-cards');
    if (!container) return;

    const n_ativos   = statusCounts.ativo    || 0;
    const n_formados = statusCounts.formado  || 0;
    const n_trancados= statusCounts.trancado || 0;
    const n_evadidos = statusCounts.evadido  || 0;

    const cards = [
        {
            label: 'Total de Alunos',
            value: kpis.total.toLocaleString('pt-BR'),
            sub: `${n_ativos} ativos · ${n_formados} formados`,
            icon: 'bi-people-fill',
            color: '#6366f1',
        },
        {
            label: 'Alunos Ativos',
            value: kpis.active_pct + '%',
            sub: `${n_ativos} de ${kpis.total}`,
            icon: 'bi-person-check-fill',
            color: '#10b981',
        },
        {
            label: 'Taxa de Formação',
            value: kpis.grad_rate_pct + '%',
            sub: `${n_formados} formados`,
            icon: 'bi-mortarboard-fill',
            color: '#FFC72C',
        },
        {
            label: 'Taxa de Evasão',
            value: kpis.evasion_pct + '%',
            sub: `${n_evadidos} evadidos · ${n_trancados} trancados`,
            icon: 'bi-person-x-fill',
            color: '#ef4444',
        },
    ];

    container.innerHTML = cards.map(c => `
        <div class="col-6 col-md-3">
          <div class="card admin-card kpi-card p-3 text-center">
            <i class="bi ${c.icon} kpi-icon mb-2" style="color:${c.color}"></i>
            <div class="kpi-value fw-bold">${c.value}</div>
            <div class="kpi-label small fw-semibold">${c.label}</div>
            <div class="kpi-sub text-muted" style="font-size:0.72rem">${c.sub}</div>
          </div>
        </div>
    `).join('');
}

// ── Chart: Status Donut ──────────────────────────────────────────────────

function renderStatusDonut(statusCounts) {
    const t = themeColors();
    const keys   = ['ativo', 'formado', 'trancado', 'evadido'];
    const labels = ['Ativo', 'Formado', 'Trancado', 'Evadido'];
    const data   = keys.map(k => statusCounts[k] || 0);
    const colors = keys.map(k => STATUS_COLORS[k]);

    return new Chart(document.getElementById('chartStatus'), {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: colors,
                borderWidth: 3,
                borderColor: t.bg,
                hoverBorderColor: t.bg,
            }]
        },
        options: {
            cutout: '65%',
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { position: 'bottom', labels: { padding: 16 } },
                tooltip: {
                    callbacks: {
                        label: ctx => {
                            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                            const pct = total ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
                            return ` ${ctx.label}: ${ctx.parsed.toLocaleString('pt-BR')} (${pct}%)`;
                        }
                    }
                }
            }
        }
    });
}

// ── Chart: Alunos por Período ─────────────────────────────────────────────

function renderPeriodBar(perPeriod) {
    const t = themeColors();
    const counts = Array.from({ length: 8 }, (_, i) => {
        const row = perPeriod.find(r => r.periodo_atual === i + 1);
        return row ? row.total : 0;
    });

    return new Chart(document.getElementById('chartPeriod'), {
        type: 'bar',
        data: {
            labels: ['1º', '2º', '3º', '4º', '5º', '6º', '7º', '8º'],
            datasets: [{
                label: 'Alunos Ativos',
                data: counts,
                backgroundColor: t.yellow,
                borderRadius: 6,
                borderSkipped: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: t.grid } },
                x: { grid: { display: false } },
            }
        }
    });
}

// ── Chart: Distribuição de GPA ────────────────────────────────────────────

function renderGpaHistogram(gpaBuckets) {
    const t = themeColors();
    const labels = Object.keys(gpaBuckets);
    const data   = Object.values(gpaBuckets);

    return new Chart(document.getElementById('chartGpa'), {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Alunos',
                data,
                backgroundColor: GPA_COLORS,
                borderRadius: 6,
                borderSkipped: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: t.grid } },
                x: { grid: { display: false } }
            }
        }
    });
}

// ── Chart: Carga Horária ──────────────────────────────────────────────────

function renderWorkload(workloadBuckets) {
    const t = themeColors();
    const labels = Object.keys(workloadBuckets);
    const data   = Object.values(workloadBuckets);

    return new Chart(document.getElementById('chartWorkload'), {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Alunos',
                data,
                backgroundColor: WORKLOAD_COLORS,
                borderRadius: 6,
                borderSkipped: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: t.grid } },
                x: { grid: { display: false } }
            }
        }
    });
}

// ── Chart: Top 10 Disciplinas Difíceis ───────────────────────────────────

function renderHardestSubjects(hardestSubjects) {
    const t = themeColors();
    // Ordena do pior para o melhor (já vem ASC do ORM; invertemos para horizontal bar)
    const sorted = [...hardestSubjects].reverse();

    const colors = sorted.map(s =>
        s.taxa_aprovacao < 40 ? '#ef4444' :
        s.taxa_aprovacao < 60 ? '#f97316' : '#f59e0b'
    );

    return new Chart(document.getElementById('chartHardest'), {
        type: 'bar',
        data: {
            labels: sorted.map(s => `${s.codigo}`),
            datasets: [{
                label: 'Taxa de Aprovação (%)',
                data: sorted.map(s => s.taxa_aprovacao),
                backgroundColor: colors,
                borderRadius: 4,
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: ctx => {
                            const s = sorted[ctx[0].dataIndex];
                            return `${s.codigo} – ${s.nome}`;
                        },
                        label: ctx => {
                            const s = sorted[ctx.dataIndex];
                            return [
                                ` Aprovação: ${s.taxa_aprovacao}%`,
                                ` Aprovadas: ${s.aprovadas} / ${s.total} matrículas`,
                                ` Período: ${s.periodo}º`,
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    min: 0, max: 100,
                    grid: { color: t.grid },
                    ticks: { callback: v => v + '%' }
                },
                y: { grid: { display: false } }
            }
        }
    });
}

// ── Chart: Evasão por Período ─────────────────────────────────────────────

function renderEvasionByPeriod(evasionByPeriod) {
    const t = themeColors();
    const counts = Array.from({ length: 8 }, (_, i) => {
        const row = evasionByPeriod.find(r => r.periodo_atual === i + 1);
        return row ? row.total : 0;
    });

    return new Chart(document.getElementById('chartEvasion'), {
        type: 'bar',
        data: {
            labels: ['1º', '2º', '3º', '4º', '5º', '6º', '7º', '8º'],
            datasets: [{
                label: 'Evadidos',
                data: counts,
                backgroundColor: '#ef4444',
                borderRadius: 6,
                borderSkipped: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: t.grid } },
                x: { grid: { display: false } }
            }
        }
    });
}

// ── Chart: Coorte por Ano ─────────────────────────────────────────────────

function renderCohort(cohortByYear) {
    const t = themeColors();
    const labels = cohortByYear.map(r => r.ano_curriculo.toString());
    const data   = cohortByYear.map(r => r.total);

    return new Chart(document.getElementById('chartCohort'), {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Alunos',
                data,
                backgroundColor: '#6366f1',
                borderRadius: 6,
                borderSkipped: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: t.grid } },
                x: { grid: { display: false } }
            }
        }
    });
}

// ── Chart: Top Empresas (Egressos) ────────────────────────────────────────

function renderCompanies(topCompanies) {
    const t = themeColors();
    const sorted = [...topCompanies].sort((a, b) => a.total - b.total);

    return new Chart(document.getElementById('chartCompanies'), {
        type: 'bar',
        data: {
            labels: sorted.map(c => c.empresa),
            datasets: [{
                label: 'Egressos',
                data: sorted.map(c => c.total),
                backgroundColor: PALETTE.slice(0, sorted.length),
                borderRadius: 4,
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: false } },
            scales: {
                x: { beginAtZero: true, grid: { color: t.grid } },
                y: { grid: { display: false } }
            }
        }
    });
}

// ── Chart: Trabalho Remoto ─────────────────────────────────────────────────

function renderRemoteDonut(alumni) {
    const t = themeColors();
    const remoto    = alumni.remote_count;
    const presencial = alumni.total - remoto;

    const label = document.getElementById('remoteLabel');
    if (label) label.textContent = `${alumni.remote_pct}% dos egressos trabalha remotamente`;

    return new Chart(document.getElementById('chartRemote'), {
        type: 'doughnut',
        data: {
            labels: ['Remoto', 'Presencial / Híbrido'],
            datasets: [{
                data: [remoto, presencial],
                backgroundColor: ['#10b981', t.border],
                borderWidth: 3,
                borderColor: t.bg,
            }]
        },
        options: {
            cutout: '65%',
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { position: 'bottom' } }
        }
    });
}

// ── Chart: Disponibilidade Mentoria ──────────────────────────────────────

function renderMentoringAvailability(mentoringAvailability) {
    const t = themeColors();
    const ORDER = ['alta', 'media', 'baixa'];
    const LABELS = { alta: 'Alta', media: 'Média', baixa: 'Baixa' };
    const COLORS = { alta: '#10b981', media: '#f59e0b', baixa: '#ef4444' };

    const sorted = ORDER.map(k => {
        const row = mentoringAvailability.find(r => r.disponibilidade === k);
        return { key: k, total: row ? row.total : 0 };
    });

    return new Chart(document.getElementById('chartMentoring'), {
        type: 'bar',
        data: {
            labels: sorted.map(s => LABELS[s.key]),
            datasets: [{
                label: 'Egressos',
                data: sorted.map(s => s.total),
                backgroundColor: sorted.map(s => COLORS[s.key]),
                borderRadius: 6,
                borderSkipped: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: t.grid } },
                x: { grid: { display: false } }
            }
        }
    });
}

// ── Chart: Áreas de Mentoria ──────────────────────────────────────────────

function renderMentoringAreas(topMentoringAreas) {
    const t = themeColors();
    const sorted = [...topMentoringAreas].sort((a, b) => a.count - b.count);

    return new Chart(document.getElementById('chartMentoringAreas'), {
        type: 'bar',
        data: {
            labels: sorted.map(a => a.area),
            datasets: [{
                label: 'Egressos',
                data: sorted.map(a => a.count),
                backgroundColor: PALETTE.slice(0, sorted.length),
                borderRadius: 4,
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: false } },
            scales: {
                x: { beginAtZero: true, grid: { color: t.grid } },
                y: { grid: { display: false } }
            }
        }
    });
}

// ── Build / Rebuild ───────────────────────────────────────────────────────

function buildAllCharts() {
    const m = METRICS;
    renderKpiCards(m.kpis, m.status_counts);
    allCharts.push(renderStatusDonut(m.status_counts));
    allCharts.push(renderPeriodBar(m.per_period));
    allCharts.push(renderGpaHistogram(m.gpa_buckets));
    allCharts.push(renderWorkload(m.workload_buckets));
    allCharts.push(renderHardestSubjects(m.hardest_subjects));
    allCharts.push(renderEvasionByPeriod(m.evasion_by_period));
    allCharts.push(renderCohort(m.cohort_by_year));
    allCharts.push(renderCompanies(m.alumni.top_companies));
    allCharts.push(renderRemoteDonut(m.alumni));
    allCharts.push(renderMentoringAvailability(m.alumni.mentoring_availability));
    allCharts.push(renderMentoringAreas(m.alumni.top_mentoring_areas));
}

// ── Inicialização ─────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    applyChartDefaults();
    buildAllCharts();

    // Reconstruir charts ao trocar tema (aguarda a transição CSS de ~300ms)
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('change', () => {
            setTimeout(() => {
                destroyAllCharts();
                applyChartDefaults();
                buildAllCharts();
            }, 320);
        });
    }
});
