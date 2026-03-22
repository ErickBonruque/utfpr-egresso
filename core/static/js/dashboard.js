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

    function renderSubjectBadges(subjects, containerId, predicate, styleClass, emptyText = 'Nenhuma disciplina.') {
        const el = document.getElementById(containerId);
        const filtered = subjects.filter(predicate);
        el.innerHTML = filtered.length
            ? filtered.map(x => `<span class="subject-pill ${styleClass}" title="${x.code}">${x.name}</span>`).join('')
            : `<span class="text-muted small">${emptyText}</span>`;
        return filtered.length;
    }

    function renderSubjectList(list, containerId, styleClass, emptyText = 'Nenhuma disciplina.') {
        const el = document.getElementById(containerId);
        const arr = Array.isArray(list) ? list : [];
        el.innerHTML = arr.length
            ? arr.map(x => `<span class="subject-pill ${styleClass}" title="${x.code}">${x.name}</span>`).join('')
            : `<span class="text-muted small">${emptyText}</span>`;
        return arr.length;
    }

    // Welcome
    document.getElementById('welcome-heading').textContent = `Bem-vindo de volta, ${student.name}!`;

    // Progress card
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

    // Achievements
    renderAchievements(progress);

    // Branches
    renderBranches(progress);

    const subjects = Array.isArray(student.subjects) ? student.subjects : [];
    const buckets = progress && progress.subjectBuckets ? progress.subjectBuckets : null;

    // Ongoing subjects (first)
    const ongoingCount = buckets
        ? renderSubjectList(buckets.ongoing, 'ongoing-badges', 'ongoing')
        : renderSubjectBadges(subjects, 'ongoing-badges', s => s.status === 'cursando', 'ongoing');
    document.getElementById('ongoing-title').textContent = `Disciplinas em Andamento (${ongoingCount})`;
    if (!ongoingCount) document.getElementById('ongoing-section').style.display = 'none';

    // Categoria 1: obrigatórias feitas
    const mandatoryDoneCount = buckets
        ? renderSubjectList(buckets.mandatoryDone, 'mandatory-done-badges', 'approved')
        : renderSubjectBadges(subjects, 'mandatory-done-badges', s => s.type === 'obrigatoria' && s.status === 'aprovada', 'approved');
    document.getElementById('mandatory-done-title').textContent = `Obrigatórias Feitas (${mandatoryDoneCount})`;

    // Categoria 2: optativas específicas feitas (grupo [412])
    const optSpecificCount = buckets
        ? renderSubjectList(buckets.optSpecificDone, 'opt-specific-badges', 'opt-specific')
        : renderSubjectBadges(subjects, 'opt-specific-badges', s => s.group === '[412]' && s.status === 'aprovada', 'opt-specific');
    document.getElementById('opt-specific-title').textContent = `Optativas Específicas Feitas (${optSpecificCount})`;

    // Categoria 3: optativas humanísticas feitas (grupo [413])
    const optHumanCount = buckets
        ? renderSubjectList(buckets.optHumanDone, 'opt-human-badges', 'opt-human')
        : renderSubjectBadges(subjects, 'opt-human-badges', s => s.group === '[413]' && s.status === 'aprovada', 'opt-human');
    document.getElementById('opt-human-title').textContent = `Optativas Humanísticas Feitas (${optHumanCount})`;

    // Categoria 4: obrigatórias faltantes
    const mandatoryMissingCount = buckets
        ? renderSubjectList(buckets.mandatoryMissing, 'mandatory-missing-badges', 'missing', 'Nenhuma pendência nas obrigatórias.')
        : renderSubjectBadges(subjects, 'mandatory-missing-badges', s => s.type === 'obrigatoria' && s.status !== 'aprovada', 'missing', 'Nenhuma pendência nas obrigatórias.');
    document.getElementById('mandatory-missing-title').textContent = `Obrigatórias Faltantes (${mandatoryMissingCount})`;

})();
