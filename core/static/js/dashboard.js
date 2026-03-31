(function () {
    const student = window.ceaStudentData;
    const progress = window.ceaProgressData;

    if (!student) {
        document.getElementById('loading-spinner').style.display = 'none';
        document.getElementById('error-text').textContent = 'Nenhum aluno encontrado no banco de dados.';
        document.getElementById('error-msg').style.display = 'flex';
        return;
    }

    const statusMap = { ativo: 'bg-success', trancado: 'bg-warning text-dark', evadido: 'bg-danger', formado: 'bg-primary' };

    // ── Helpers ──────────────────────────────────────
    function esc(text) {
        const d = document.createElement('div');
        d.textContent = text || '';
        return d.innerHTML;
    }

    function statusLabel(s) {
        return { aprovada: 'Aprovada', cursando: 'Cursando', reprovada: 'Reprovada', nao_iniciada: 'Pendente' }[s] || s;
    }

    function statusIcon(s) {
        return {
            aprovada: 'bi-check-circle-fill',
            cursando: 'bi-play-circle-fill',
            reprovada: 'bi-x-circle-fill',
            nao_iniciada: 'bi-circle',
        }[s] || 'bi-circle';
    }

    function statusClass(s) {
        return { aprovada: 'approved', cursando: 'ongoing', reprovada: 'failed', nao_iniciada: 'pending' }[s] || 'pending';
    }

    // ── Conquistas ───────────────────────────────────
    function renderAchievements(progressData) {
        const list = (progressData && progressData.achievements) ? [...progressData.achievements] : [];
        list.sort((a, b) => (a.unlocked === b.unlocked) ? (b.progress - a.progress) : (a.unlocked ? -1 : 1));
        const shown = list.slice(0, 3);
        const row = document.getElementById('achievements-row');
        if (!shown.length) {
            row.innerHTML = '<div class="col-12"><p class="text-muted small mb-0">Sem conquistas para exibir.</p></div>';
            return;
        }
        row.innerHTML = shown.map(a => {
            const isUnlocked = !!a.unlocked;
            const achName = a.name || a.label || 'Conquista';
            const achDesc = a.desc || a.description || '';
            return `<div class="col-4">
              <div class="achievement-card">
                <i class="bi ${a.icon} achievement-icon ${isUnlocked ? 'unlocked' : 'locked'}"></i>
                <h6 class="mb-1 small fw-semibold ${isUnlocked ? '' : 'text-muted'}">${achName}</h6>
                <p class="text-muted" style="font-size:.75rem;margin:0">${achDesc}</p>
                ${!isUnlocked ? '<span class="badge bg-secondary mt-1" style="font-size:.65rem">Bloqueada</span>' : ''}
              </div>
            </div>`;
        }).join('');
    }

    // ── Ramos ────────────────────────────────────────
    function renderBranches(progressData) {
        const row = document.getElementById('branches-row');
        const list = (progressData && progressData.branches) ? progressData.branches : [];
        row.innerHTML = list.map(b => {
            const done = b.done || 0;
            const total = b.total || 1;
            const pct = total > 0 ? Math.round(done / total * 100) : 0;
            return `<div class="col-md-6">
              <div class="branch-progress">
                <div class="d-flex justify-content-between mb-1 small">
                  <span>${b.label}</span>
                  <span>${done}/${total} (${pct}%)</span>
                </div>
                <div class="progress">
                  <div class="progress-bar" style="width:${pct}%"></div>
                </div>
              </div>
            </div>`;
        }).join('');
    }

    // ═════════════════════════════════════════════════
    // MAPA CURRICULAR
    // ═════════════════════════════════════════════════
    const subjects = Array.isArray(student.subjects) ? student.subjects : [];
    const currentPeriod = student.currentPeriod || 1;

    // Separar obrigatórias (vão no grid por período) e optativas (seção separada)
    const mandatory = subjects.filter(s => s.type === 'obrigatoria');
    const optativas = subjects.filter(s => s.type === 'optativa');

    // Agrupar obrigatórias por período
    const byPeriod = {};
    for (let p = 1; p <= 8; p++) byPeriod[p] = [];
    mandatory.forEach(s => {
        const p = s.period || 1;
        if (byPeriod[p]) byPeriod[p].push(s);
        else byPeriod[p] = [s];
    });

    // Contadores
    const counts = { aprovada: 0, cursando: 0, reprovada: 0, nao_iniciada: 0 };
    subjects.forEach(s => {
        const st = s.status || 'nao_iniciada';
        if (counts[st] !== undefined) counts[st]++;
    });

    // ── Renderizar contadores rápidos ────────────────
    function renderStats() {
        const el = document.getElementById('curriculum-stats');
        el.innerHTML = `
            <div class="stat-chip">
                <span class="stat-chip-count approved">${counts.aprovada}</span> Aprovadas
            </div>
            <div class="stat-chip">
                <span class="stat-chip-count ongoing">${counts.cursando}</span> Cursando
            </div>
            <div class="stat-chip">
                <span class="stat-chip-count failed">${counts.reprovada}</span> Reprovadas
            </div>
            <div class="stat-chip">
                <span class="stat-chip-count pending">${counts.nao_iniciada}</span> Pendentes
            </div>
        `;
    }

    // ── Renderizar grade de períodos ─────────────────
    function renderPeriodsGrid() {
        const grid = document.getElementById('periods-grid');
        let html = '';

        for (let p = 1; p <= 8; p++) {
            const subs = byPeriod[p] || [];
            const isCurrent = (p === currentPeriod && student.status === 'ativo');

            html += `<div class="period-col">`;
            html += `<div class="period-header ${isCurrent ? 'current' : ''}">`;
            html += `  <div class="period-label">${p}° Per.</div>`;
            html += `  <div class="period-count">${subs.length} disc.</div>`;
            html += `</div>`;

            subs.forEach(s => {
                const sc = statusClass(s.status);
                const si = statusIcon(s.status);
                html += `<div class="subject-cell ${sc}" data-code="${esc(s.code)}" data-status="${s.status}" title="${esc(s.name)}">`;
                html += `  <span class="subject-code">${esc(s.code)}</span>`;
                html += `  <span class="subject-status-icon"><i class="bi ${si}"></i></span>`;
                html += `</div>`;
            });

            html += `</div>`;
        }

        grid.innerHTML = html;
    }

    // ── Renderizar seção de optativas ────────────────
    function renderOptativas() {
        if (!optativas.length) return;

        document.getElementById('optativas-section').style.display = '';
        const body = document.getElementById('optativas-body');
        const title = document.getElementById('optativas-title');

        // Contar por grupo
        const opt412 = optativas.filter(s => s.group === '[412]');
        const opt413 = optativas.filter(s => s.group === '[413]');
        const approved412 = opt412.filter(s => s.status === 'aprovada').length;
        const approved413 = opt413.filter(s => s.status === 'aprovada').length;

        title.textContent = `Optativas (${approved412 + approved413} aprovadas de ${optativas.length})`;

        let html = '';

        // Renderizar optativas separadas por tipo
        if (opt412.length) {
            html += `<div style="width:100%;margin-bottom:6px;"><small class="text-muted fw-semibold" style="font-size:.68rem;text-transform:uppercase;letter-spacing:.5px;">Específicas</small></div>`;
            opt412.forEach(s => {
                const sc = statusClass(s.status);
                const si = statusIcon(s.status);
                html += `<span class="opt-pill ${sc}" data-code="${esc(s.code)}" data-status="${s.status}" title="${esc(s.name)}">`;
                html += `<i class="bi ${si} opt-pill-icon"></i> ${esc(s.name)}`;
                html += `</span>`;
            });
        }

        if (opt413.length) {
            html += `<div style="width:100%;margin-top:8px;margin-bottom:6px;"><small class="text-muted fw-semibold" style="font-size:.68rem;text-transform:uppercase;letter-spacing:.5px;">Humanísticas</small></div>`;
            opt413.forEach(s => {
                const sc = statusClass(s.status);
                const si = statusIcon(s.status);
                html += `<span class="opt-pill ${sc}" data-code="${esc(s.code)}" data-status="${s.status}" title="${esc(s.name)}">`;
                html += `<i class="bi ${si} opt-pill-icon"></i> ${esc(s.name)}`;
                html += `</span>`;
            });
        }

        body.innerHTML = html;
    }

    // ── Tooltip de detalhe ───────────────────────────
    function showSubjectTooltip(subjectCode, anchorEl) {
        // Buscar dados da disciplina
        const sub = subjects.find(s => s.code === subjectCode);
        if (!sub) return;

        // Fechar tooltip anterior
        closeTooltip();

        const sc = statusClass(sub.status);

        // Overlay
        const overlay = document.createElement('div');
        overlay.className = 'subject-tooltip-overlay';
        overlay.addEventListener('click', closeTooltip);

        // Tooltip
        const tip = document.createElement('div');
        tip.className = 'subject-tooltip';

        let gradeHTML = '';
        if (sub.grade != null) {
            gradeHTML = `
                <div class="tooltip-field">
                    <span class="tooltip-field-label">Nota</span>
                    <span class="tooltip-field-value">${sub.grade.toFixed(1)}</span>
                </div>`;
        }

        let attendHTML = '';
        if (sub.attendance != null) {
            attendHTML = `
                <div class="tooltip-field">
                    <span class="tooltip-field-label">Frequência</span>
                    <span class="tooltip-field-value">${sub.attendance}%</span>
                </div>`;
        }

        let completedHTML = '';
        if (sub.completedAt) {
            completedHTML = `
                <div class="tooltip-field">
                    <span class="tooltip-field-label">Concluída em</span>
                    <span class="tooltip-field-value">${new Date(sub.completedAt).toLocaleDateString('pt-BR')}</span>
                </div>`;
        }

        tip.innerHTML = `
            <div class="tooltip-status-bar ${sc}"></div>
            <div class="tooltip-name">${esc(sub.name)}</div>
            <div class="tooltip-code">${esc(sub.code)} · ${sub.workload || '—'}h · ${sub.period || '—'}° período</div>
            <div class="tooltip-grid">
                <div class="tooltip-field">
                    <span class="tooltip-field-label">Status</span>
                    <span class="tooltip-field-value">${statusLabel(sub.status)}</span>
                </div>
                <div class="tooltip-field">
                    <span class="tooltip-field-label">Tipo</span>
                    <span class="tooltip-field-value">${sub.type === 'optativa' ? 'Optativa' : 'Obrigatória'}</span>
                </div>
                ${gradeHTML}
                ${attendHTML}
                ${completedHTML}
            </div>
        `;

        document.body.appendChild(overlay);
        document.body.appendChild(tip);

        // Posicionar perto do elemento clicado
        const rect = anchorEl.getBoundingClientRect();
        const tipW = 280;
        let left = rect.left + rect.width / 2 - tipW / 2;
        let top = rect.bottom + 8;

        // Ajustar se sair da tela
        if (left < 8) left = 8;
        if (left + tipW > window.innerWidth - 8) left = window.innerWidth - tipW - 8;
        if (top + 200 > window.innerHeight) top = rect.top - 200;

        tip.style.left = left + 'px';
        tip.style.top = top + 'px';
    }

    function closeTooltip() {
        document.querySelectorAll('.subject-tooltip-overlay, .subject-tooltip').forEach(el => el.remove());
    }

    // ── Filtros ──────────────────────────────────────
    let activeFilter = 'all';

    function applyFilter(filter) {
        activeFilter = filter;

        // Atualizar chips ativos
        document.querySelectorAll('#curriculum-filters .filter-chip').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });

        // Aplicar dimmed nas células
        document.querySelectorAll('.subject-cell').forEach(cell => {
            const st = cell.dataset.status;
            if (filter === 'all') {
                cell.classList.remove('dimmed');
            } else {
                cell.classList.toggle('dimmed', st !== filter);
            }
        });

        // Aplicar dimmed nas pills de optativa
        document.querySelectorAll('.opt-pill').forEach(pill => {
            const st = pill.dataset.status;
            if (filter === 'all') {
                pill.classList.remove('dimmed');
            } else {
                pill.classList.toggle('dimmed', st !== filter);
            }
        });
    }

    document.getElementById('curriculum-filters').addEventListener('click', (e) => {
        const chip = e.target.closest('.filter-chip');
        if (!chip) return;
        applyFilter(chip.dataset.filter);
    });

    // ── Toggle optativas ─────────────────────────────
    document.getElementById('optativas-toggle').addEventListener('click', () => {
        const body = document.getElementById('optativas-body');
        const chevron = document.getElementById('optativas-chevron');
        body.classList.toggle('collapsed');
        chevron.classList.toggle('collapsed');
    });

    // ── Clique em matéria (delegação) ────────────────
    document.getElementById('periods-grid').addEventListener('click', (e) => {
        const cell = e.target.closest('.subject-cell');
        if (!cell || cell.classList.contains('dimmed')) return;
        showSubjectTooltip(cell.dataset.code, cell);
    });

    document.getElementById('optativas-body').addEventListener('click', (e) => {
        const pill = e.target.closest('.opt-pill');
        if (!pill || pill.classList.contains('dimmed')) return;
        showSubjectTooltip(pill.dataset.code, pill);
    });

    // ═════════════════════════════════════════════════
    // INICIALIZAR
    // ═════════════════════════════════════════════════

    // Boas-vindas
    document.getElementById('welcome-heading').textContent = `Bem-vindo de volta, ${student.name}!`;

    // Card de progresso
    const statusBadge = document.getElementById('status-badge');
    statusBadge.textContent = student.status;
    statusBadge.className   = `badge fs-6 px-3 py-2 ${statusMap[student.status] || 'bg-secondary'}`;
    document.getElementById('period-text').textContent = `Período ${student.currentPeriod}/8`;
    document.getElementById('gpa-text').textContent    = `CR: ${student.gpa.toFixed(1)}`;
    document.getElementById('campus-text').textContent = `${student.course} — ${student.campus}`;

    const pct = student.totalCourseWorkload > 0
        ? Math.round(student.completedWorkload / student.totalCourseWorkload * 100) : 0;
    document.getElementById('workload-text').textContent = `${student.completedWorkload} / ${student.totalCourseWorkload} h concluídas`;
    document.getElementById('completion-pct').textContent = `${pct}%`;
    document.getElementById('completion-bar').style.width = `${pct}%`;
    if (progress && progress.xp) {
        const next = progress.xp.nextAchievement ? ` | Próxima: ${progress.xp.nextAchievement}` : '';
        document.getElementById('xp-text').textContent = `XP: ${progress.xp.total}${next}`;
    }

    // Renderizar seções
    renderAchievements(progress);
    renderBranches(progress);
    renderStats();
    renderPeriodsGrid();
    renderOptativas();

})();
