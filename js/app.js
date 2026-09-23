(() => {
  'use strict';

  const DATA = window.NRE_COMPETENCIAS_DATA;
  const HINTS = DATA.demoHints;
  const CONTRACTOR_KEY = 'nreConsultaCompetenciasContractor';

  const el = document.getElementById('app');
  const guideEl = document.getElementById('guide');
  const toastEl = document.getElementById('toast');

  const state = {
    splash: true,
    view: 'home',
    recaptcha: false,
    idInput: '',
    password: '',
    passwordError: false,
    passwordOk: false,
    contractCode: '',
    contractError: '',
    selectedContract: null,
    results: [],
    profileId: null,
    verifyId: null,
    compareIds: [],
    showCard: false,
    showAdd: false,
    addId: '',
    filters: {
      OQ: true,
      HSE: true,
      SRE: true,
      vigente: true,
      cerca: true,
      faltante: true,
      requerida: true,
      noRequerida: false,
    },
    showFilters: false,
    retryable: true,
    recaptchaMessage: '',
    loading: false,
    guideOpen: window.matchMedia('(min-width: 961px)').matches,
    toast: '',
  };

  const escapeHtml = (value) =>
    String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const displayName = (person) => person.userFullname;
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const toast = (message) => {
    state.toast = message;
    toastEl.textContent = message;
    toastEl.classList.toggle('hidden', !message);
    if (message) {
      setTimeout(() => {
        if (state.toast === message) {
          state.toast = '';
          toastEl.classList.add('hidden');
        }
      }, 3800);
    }
  };

  const setLoading = async (work) => {
    state.loading = true;
    renderProduct();
    await sleep(520);
    try {
      await work();
    } finally {
      state.loading = false;
      renderProduct();
    }
  };

  const go = (view, extra = {}) => {
    Object.assign(state, extra, { view, recaptcha: extra.recaptcha ?? false });
    const hashMap = {
      home: '#/',
      searchId: '#/cedula',
      results: '#/resultados',
      profile: `#/perfil/${state.profileId || ''}`,
      verify: `#/verificar/${state.verifyId || ''}`,
      contractGate: '#/contrato',
      contractCode: '#/contrato/codigo',
      contractRoster: '#/contrato/grupo',
      unavailable: '#/servicio-no-disponible',
      notFound: '#/sin-resultados',
      recaptchaFail: '#/actividad-sospechosa',
    };
    const nextHash = hashMap[view] || '#/';
    if (location.hash !== nextHash) {
      history.pushState({ view }, '', nextHash);
    }
    renderProduct();
  };

  const personVisibleQuals = (person) =>
    person.qualifications.filter((item) => {
      if (!state.filters[item.programName]) {
        return false;
      }
      if (item.availabilityStatus === 2 && !state.filters.vigente) {
        return false;
      }
      if (item.availabilityStatus === 1 && !state.filters.cerca) {
        return false;
      }
      if (item.availabilityStatus === 0 && !state.filters.faltante) {
        return false;
      }
      if (item.hasContract === 1 && !state.filters.requerida) {
        return false;
      }
      if (item.hasContract === 0 && !state.filters.noRequerida) {
        return false;
      }
      return true;
    });

  const statusClass = (status) => {
    if (status === 2) {
      return 'status-ok';
    }
    if (status === 1) {
      return 'status-warn';
    }
    return 'status-bad';
  };

  const statusIcon = (status) => {
    if (status === 2) {
      return '✓';
    }
    if (status === 1) {
      return '!';
    }
    return '×';
  };

  const qrCells = (seed) => {
    let n = 0;
    for (let i = 0; i < seed.length; i += 1) {
      n = (n * 33 + seed.charCodeAt(i)) >>> 0;
    }
    const cells = [];
    for (let y = 0; y < 21; y += 1) {
      for (let x = 0; x < 21; x += 1) {
        const finder =
          (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
        const finderOn =
          finder &&
          (x === 0 ||
            x === 6 ||
            y === 0 ||
            y === 6 ||
            x === 14 ||
            x === 20 ||
            y === 14 ||
            (x > 1 && x < 5 && y > 1 && y < 5) ||
            (x > 15 && x < 19 && y > 1 && y < 5) ||
            (x > 1 && x < 5 && y > 15 && y < 19));
        n = (n * 1103515245 + 12345) >>> 0;
        const on = finder ? finderOn : n % 3 !== 0;
        cells.push(on);
      }
    }
    return cells;
  };

  const wordmark = (onDark = false) => `
    <div class="wordmark ${onDark ? 'on-dark' : ''}">
      <img class="nre-logo" src="img/nre-logo-${onDark ? 'light' : 'dark'}.svg" alt="NRE" />
      <div class="wordmark-text">
        <span class="product-name">Consulta de Competencias</span>
        <span class="product-tag">Competencias del personal</span>
      </div>
    </div>
  `;

  const siteFoot = () => `
    <footer class="site-foot">
      <div class="brand-dots" aria-hidden="true"><i class="d1"></i><i class="d2"></i><i class="d3"></i><i class="d4"></i></div>
      Natural Resources Engineering
    </footer>
  `;

  const recaptchaMarkup = () => `
    <label class="recaptcha-box">
      <input type="checkbox" id="recaptcha" ${state.recaptcha ? 'checked' : ''} />
      <span>No soy un robot</span>
      <span class="recaptcha-brand">reCAPTCHA<br />prototipo</span>
    </label>
  `;

  const topbar = (title, { back = true, filter = false } = {}) => `
    <header class="topbar">
      ${
        back
          ? `<button class="icon-btn" data-action="back" aria-label="Volver">←</button>`
          : ''
      }
      <div class="title">${escapeHtml(title)}</div>
      ${
        filter
          ? `<button class="icon-btn" data-action="toggle-filters" aria-label="Filtros">☰</button>`
          : ''
      }
    </header>
  `;

  const qualList = (items) => {
    if (items.length === 0) {
      return `<p class="muted">No hay calificaciones visibles con los filtros actuales.</p>`;
    }
    return items
      .map(
        (item) => `
      <div class="qual-item">
        <div>
          <div class="muted">${escapeHtml(item.programName)}</div>
          <div>${escapeHtml(item.courseFullname)}</div>
          <div class="${statusClass(item.availabilityStatus)}">
            ${item.hasContract === 0 ? '<strong style="color:#ef6c00">No requerida</strong> · ' : ''}
            ${escapeHtml(item.availabilityStatusName.charAt(0) + item.availabilityStatusName.slice(1).toLowerCase())}
          </div>
        </div>
        <div class="${statusClass(item.availabilityStatus)}" aria-hidden="true">${statusIcon(item.availabilityStatus)}</div>
      </div>`
      )
      .join('');
  };

  const personCard = (person, { expanded = true, showProfile = true } = {}) => `
    <article class="card person-card" style="margin-bottom:12px">
      <div class="head">
        <div class="avatar" aria-hidden="true">${escapeHtml(person.userFullname.charAt(0))}</div>
        <div style="flex:1">
          <strong>${escapeHtml(displayName(person))}</strong>
          <div class="muted">${escapeHtml(person.username)}</div>
        </div>
      </div>
      ${
        expanded
          ? `<div style="margin-top:8px">${qualList(personVisibleQuals(person))}
        ${
          showProfile
            ? `<div class="actions"><button class="btn btn-text" data-action="open-profile" data-id="${escapeHtml(person.username)}">IR AL PERFIL</button></div>`
            : ''
        }</div>`
          : ''
      }
    </article>
  `;

  const filterPanel = () => {
    if (!state.showFilters) {
      return '';
    }
    const chip = (key, label) =>
      `<button type="button" class="chip ${state.filters[key] ? '' : 'off'}" data-action="chip" data-chip="${key}">${escapeHtml(label)}</button>`;
    return `
      <section class="filter-panel">
        <strong>Filtros</strong>
        <p class="muted">Programa</p>
        <div class="chip-row">${chip('OQ', 'OQ')}${chip('HSE', 'HSE')}${chip('SRE', 'SRE')}</div>
        <p class="muted">Estado</p>
        <div class="chip-row">${chip('vigente', 'Vigente')}${chip('faltante', 'Faltante')}${chip('cerca', 'Cerca a vencer')}</div>
        <p class="muted">Exigencia del contrato</p>
        <div class="chip-row">${chip('requerida', 'Requerida')}${chip('noRequerida', 'No requerida')}</div>
      </section>
    `;
  };

  const idCard = (person) => {
    const cells = qrCells(person.username)
      .map((on) => `<i class="${on ? 'on' : ''}"></i>`)
      .join('');
    const parts = person.userFullname.split(' ');
    return `
      <div class="id-card" id="printable-card">
        <div class="qr" title="QR de demostracion hacia /user/{referencia}/verify">${cells}</div>
        <div class="name">${escapeHtml(parts.slice(0, 2).join(' '))}</div>
        <div class="name">${escapeHtml(parts.slice(2).join(' '))}</div>
        <p class="muted">${escapeHtml(person.username)}</p>
        <p class="muted">${escapeHtml(person.contractor)}</p>
        <p class="muted">${escapeHtml(person.job)}</p>
      </div>
    `;
  };

  const views = {
    home: () => `
      ${topbar('Consulta de Competencias', { back: false })}
      <div class="page">
        <div class="logo-row">${wordmark()}</div>
        <div class="service-label">✓ Elija el servicio</div>
        <div class="options">
          <button class="option-card" data-action="choose-id">
            <div class="row">
              <div class="row" style="gap:12px">
                <div class="avatar">●</div>
                <div>
                  <div>Consulta por cédula</div>
                  <div class="muted">Consulte las calificaciones<br />y/o descargue el carné de una persona.</div>
                </div>
              </div>
              <span aria-hidden="true">🔍</span>
            </div>
            <div class="actions"><span class="btn btn-primary">Consultar por cédula</span></div>
          </button>
          <button class="option-card" data-action="choose-contract">
            <div class="row">
              <div class="row" style="gap:12px">
                <div class="avatar">▣</div>
                <div>
                  <div>Consulta por contrato</div>
                  <div class="muted">Consulte las calificaciones<br />y/o descargue el carné de un grupo de personas.</div>
                </div>
              </div>
              <span aria-hidden="true">🔍</span>
            </div>
            <div class="actions"><span class="btn btn-primary">Consultar por contrato</span></div>
          </button>
        </div>
        ${siteFoot()}
      </div>
    `,
    searchId: () => `
      ${topbar('Consulta de Competencias')}
      <div class="page">
        <div class="logo-row">${wordmark()}</div>
        <div class="service-label">● Consulta por cédula</div>
        <div class="center-stack">
          <div class="field">
            <label for="matchValues">Número de cédula</label>
            <input id="matchValues" inputmode="numeric" maxlength="20" value="${escapeHtml(state.idInput)}" />
          </div>
          ${recaptchaMarkup()}
          <div class="actions">
            <button class="btn btn-secondary" data-action="home">Volver</button>
            <button class="btn btn-primary" data-action="search-id" ${
              state.recaptcha && state.idInput.trim() ? '' : 'disabled'
            }>Consultar</button>
          </div>
        </div>
      </div>
    `,
    results: () => `
      ${topbar('Resultados', { filter: true })}
      <div class="page">
        <nav class="breadcrumbs">
          <button type="button" data-action="home">Inicio</button> / Resultados
        </nav>
        ${filterPanel()}
        ${state.results.map((id) => personCard(DATA.people[id])).join('')}
        <div class="actions">
          <button class="btn btn-secondary" data-action="open-add">Añadir persona</button>
        </div>
      </div>
      ${
        state.showAdd
          ? `<div class="modal-backdrop" data-action="close-add">
        <div class="modal" role="dialog" aria-labelledby="add-title">
          <h2 id="add-title">Buscar otra persona</h2>
          <div class="field">
            <label for="addId">Número de cédula</label>
            <input id="addId" value="${escapeHtml(state.addId)}" />
          </div>
          ${recaptchaMarkup()}
          <div class="actions">
            <button class="btn btn-secondary" data-action="close-add">Cancelar</button>
            <button class="btn btn-primary" data-action="add-person">Consultar</button>
          </div>
        </div>
      </div>`
          : ''
      }
    `,
    profile: () => {
      const person = DATA.people[state.profileId];
      if (!person) {
        return views.notFound();
      }
      return `
      ${topbar('Perfil', { filter: true })}
      <div class="page">
        <nav class="breadcrumbs">
          <button type="button" data-action="home">Inicio</button> /
          <button type="button" data-action="to-results">Resultados</button> / Perfil
        </nav>
        ${filterPanel()}
        <div class="card" style="margin-bottom:12px">
          <div class="head">
            <div class="avatar">${escapeHtml(person.userFullname.charAt(0))}</div>
            <div>
              <strong>${escapeHtml(displayName(person))}</strong>
              <div class="muted">${escapeHtml(person.username)}</div>
            </div>
          </div>
        </div>
        <div class="card" style="margin-bottom:12px">
          <div class="head">
            <div class="avatar">▣</div>
            <div>
              <strong>${escapeHtml(person.contractor)}</strong>
              <div class="muted">${escapeHtml(person.contract)} · ${escapeHtml(person.job)}</div>
              <div class="muted">${escapeHtml(person.locationName)}</div>
            </div>
          </div>
        </div>
        <div class="card">${qualList(personVisibleQuals(person))}</div>
        <div class="actions">
          <button class="btn btn-primary" data-action="toggle-card">${state.showCard ? 'Ocultar carné' : 'Ver carné / QR'}</button>
          <button class="btn btn-secondary" data-action="print-card">Descargar (imprimir)</button>
        </div>
        ${state.showCard ? `<div class="center-stack" style="margin-top:16px">${idCard(person)}
          <p class="muted">El QR del producto apunta a <code>/user/{cédula}/verify</code>.</p>
          <button class="btn btn-text" data-action="scan-qr" data-id="${escapeHtml(person.username)}">Simular lectura del QR</button>
        </div>` : ''}
      </div>`;
    },
    verify: () => `
      <div class="page" style="min-height:80vh;display:flex;align-items:center;justify-content:center">
        <div class="card" style="max-width:460px;width:100%">
          <h1 style="text-align:center;font-size:1.4rem">Verificación de Acceso</h1>
          <p class="muted" style="text-align:center">Por favor, complete la verificación para acceder al perfil</p>
          <div class="center-stack">
            ${recaptchaMarkup()}
            ${state.recaptchaMessage ? `<p class="status-bad">${escapeHtml(state.recaptchaMessage)}</p>` : ''}
            <button class="btn btn-primary" style="width:100%" data-action="verify-continue" ${
              state.recaptcha ? '' : 'disabled'
            }>Continuar</button>
          </div>
        </div>
      </div>
    `,
    contractGate: () => `
      ${topbar('Consulta de Competencias')}
      <div class="page">
        <div class="logo-row">${wordmark()}</div>
        <div class="service-label">● Consulta por contrato</div>
      </div>
      <div class="modal-backdrop">
        <div class="modal" role="dialog" aria-labelledby="pass-title">
          <h2 id="pass-title" style="margin-top:0">Ingrese el código de acceso</h2>
          ${
            state.passwordError
              ? `<p class="status-bad">El código de acceso que ingresó es incorrecto.</p>`
              : ''
          }
          ${
            state.passwordOk
              ? `<p class="status-ok">El código de acceso que ingresó es correcto.</p>`
              : ''
          }
          <div class="field">
            <label for="accessCode">Código de acceso</label>
            <input id="accessCode" type="password" value="${escapeHtml(state.password)}" ${
              state.passwordOk ? 'disabled' : ''
            } />
          </div>
          <div class="actions">
            <button class="btn btn-secondary" data-action="home">Volver</button>
            <button class="btn btn-primary" data-action="check-password" ${
              state.password.trim() && !state.passwordOk ? '' : 'disabled'
            }>Validar</button>
          </div>
        </div>
      </div>
    `,
    contractCode: () => `
      ${topbar('Consulta de Competencias')}
      <div class="page">
        <div class="logo-row">${wordmark()}</div>
        <div class="service-label">● Consulta por contrato</div>
        <div class="stepper">
          <span class="active">1. Ingrese el número de contrato</span>
          <span>2. Elija el contrato</span>
        </div>
        <div class="center-stack">
          <div class="field">
            <label for="contractCode">Código de contrato</label>
            <input id="contractCode" value="${escapeHtml(state.contractCode)}" />
            ${state.contractError ? `<span class="status-bad">${escapeHtml(state.contractError)}</span>` : ''}
          </div>
          <div class="actions">
            <button class="btn btn-secondary" data-action="home">Volver</button>
            <button class="btn btn-primary" data-action="lookup-contract">Buscar</button>
          </div>
        </div>
      </div>
    `,
    contractRoster: () => {
      const contract = state.selectedContract;
      return `
      ${topbar(contract ? contract.displayName : 'Contrato', { filter: true })}
      <div class="page">
        <nav class="breadcrumbs">
          <button type="button" data-action="home">Inicio</button> / Contrato
        </nav>
        ${filterPanel()}
        <p class="muted">${escapeHtml(contract?.displayName || '')}</p>
        ${state.results.map((id) => personCard(DATA.people[id])).join('')}
      </div>`;
    },
    unavailable: () => `
      <div class="unavailable">
        <h1>El servicio no está disponible en este momento</h1>
        <p class="muted">${
          state.retryable
            ? 'Estamos presentando una intermitencia temporal. Por favor intente nuevamente en unos minutos.'
            : 'No fue posible completar la consulta. Por favor intente nuevamente más tarde.'
        }</p>
        <button class="btn btn-primary" data-action="home">Volver al inicio</button>
      </div>
    `,
    notFound: () => `
      ${topbar('Resultados')}
      <div class="page">
        <h2>Sin resultados</h2>
        <p class="muted">No se encontró una persona con la referencia consultada. Use una cédula de demostración del panel de atajos.</p>
        <button class="btn btn-primary" data-action="home">Volver al inicio</button>
      </div>
    `,
    recaptchaFail: () => `
      ${topbar('Inicio')}
      <div class="page">
        <div class="card">
          <h2>Validación</h2>
          <p>La actividad parece sospechosa. Por favor intente nuevamente.</p>
          <pre style="background:#f5f5f5;padding:12px;border-radius:6px;overflow:auto">errors.recaptchaResponse[0] = "La actividad parece sospechosa. Por favor intente nuevamente."</pre>
          <p class="muted">Así se informa cuando la verificación automática considera la actividad poco habitual.</p>
          <button class="btn btn-primary" data-action="home">Volver al inicio</button>
        </div>
      </div>
    `,
  };

  const renderGuide = () => {
    const openClass = state.guideOpen ? 'open' : '';
    document.querySelector('.app-shell').classList.toggle('guide-collapsed', !state.guideOpen);
    guideEl.className = `guide ${openClass}`;
    guideEl.innerHTML = `
      <h2>Prototipo para portafolio</h2>
      <p>Recorre el flujo público de <strong>Consulta de Competencias</strong>: consulta de calificaciones y carné digital. Todo lo que ves es de demostración.</p>
      <div class="flow">
        <span>1. La persona consulta en el navegador</span>
        <span>2. Consulta de Competencias recibe la solicitud</span>
        <span>3. Un servicio de formación entrega persona, contrato y calificaciones</span>
        <span>4. El resultado se muestra en pantalla</span>
      </div>
      <p>Esta página <strong>no</strong> se conecta a sistemas internos ni usa datos reales.</p>
      <p><strong>Atajos de demostración</strong></p>
      <button class="hint-btn" data-demo="person">Cédula de ejemplo → ${HINTS.personId}</button>
      <button class="hint-btn" data-demo="second">Segunda persona → ${HINTS.secondPersonId}</button>
      <button class="hint-btn" data-demo="missing">Persona no encontrada → ${HINTS.missingId}</button>
      <button class="hint-btn" data-demo="down">Servicio no disponible → ${HINTS.unavailableId}</button>
      <button class="hint-btn" data-demo="captcha">Verificación rechazada → ${HINTS.recaptchaFailId}</button>
      <button class="hint-btn" data-demo="qr">Acceso por QR</button>
      <button class="hint-btn" data-demo="contract">Contrato ${HINTS.contractCode} / acceso <code>${HINTS.contractorAccess}</code></button>
    `;
  };

  const renderProduct = () => {
    const splash = state.splash
      ? `<div class="splash" role="status">${wordmark(true)}</div>`
      : '';
    const loader = state.loading ? `<div class="loading"><div class="spinner" aria-label="Cargando"></div></div>` : '';
    const body = views[state.view] ? views[state.view]() : views.home();
    el.innerHTML = `
      <div class="demo-banner">Prototipo interactivo · Consulta de Competencias · datos de demostración</div>
      ${splash}
      <div class="product">${loader}${body}</div>
    `;
    bindProduct();
    renderGuide();
  };

  const bindProduct = () => {
    el.querySelector('#recaptcha')?.addEventListener('change', (event) => {
      const match = el.querySelector('#matchValues');
      const addId = el.querySelector('#addId');
      if (match) {
        state.idInput = match.value.replace(/\D/g, '').slice(0, 20);
      }
      if (addId) {
        state.addId = addId.value.replace(/\D/g, '').slice(0, 20);
      }
      state.recaptcha = event.target.checked;
      renderProduct();
    });
    el.querySelector('#matchValues')?.addEventListener('input', (event) => {
      state.idInput = event.target.value.replace(/\D/g, '').slice(0, 20);
      event.target.value = state.idInput;
      const btn = el.querySelector('[data-action="search-id"]');
      if (btn) {
        btn.disabled = !(state.recaptcha && state.idInput.trim());
      }
    });
    el.querySelector('#addId')?.addEventListener('input', (event) => {
      state.addId = event.target.value.replace(/\D/g, '').slice(0, 20);
      event.target.value = state.addId;
    });
    el.querySelector('#accessCode')?.addEventListener('input', (event) => {
      state.password = event.target.value;
      const can = state.password.trim() && !state.passwordOk;
      const btn = el.querySelector('[data-action="check-password"]');
      if (btn) {
        btn.disabled = !can;
      }
    });
    el.querySelector('#contractCode')?.addEventListener('input', (event) => {
      state.contractCode = event.target.value.toUpperCase();
    });

    el.querySelectorAll('[data-action]').forEach((node) => {
      node.addEventListener('click', (event) => {
        const action = node.getAttribute('data-action');
        if (action === 'close-add' && event.target !== node) {
          return;
        }
        handleAction(action, node);
      });
    });

    el.querySelector('.modal')?.addEventListener('click', (event) => {
      event.stopPropagation();
    });

    el.querySelector('.splash')?.addEventListener('click', () => {
      state.splash = false;
      renderProduct();
    });
  };

  const searchPerson = async (rawId, { fromAdd = false } = {}) => {
    const id = String(rawId || '').replace(/\D/g, '');
    if (!id) {
      toast('Ingrese un número de cédula.');
      return;
    }
    if (!state.recaptcha) {
      toast('Por favor, complete la verificación "No soy un robot"');
      return;
    }
    await setLoading(async () => {
      if (id === HINTS.unavailableId) {
        state.retryable = true;
        go('unavailable');
        return;
      }
      if (id === HINTS.recaptchaFailId) {
        go('recaptchaFail');
        return;
      }
      const person = DATA.people[id];
      if (!person) {
        go('notFound');
        return;
      }
      if (fromAdd) {
        if (!state.results.includes(id)) {
          state.results = [...state.results, id];
        }
        state.showAdd = false;
        go('results');
        return;
      }
      state.results = [id];
      go('results');
    });
  };

  const handleAction = (action, node) => {
    if (action === 'back' || action === 'home') {
      state.password = '';
      state.passwordError = false;
      state.passwordOk = false;
      go('home');
      return;
    }
    if (action === 'choose-id') {
      state.idInput = '';
      go('searchId');
      return;
    }
    if (action === 'choose-contract') {
      const remembered = sessionStorage.getItem(CONTRACTOR_KEY) === '1';
      if (remembered) {
        go('contractCode');
      } else {
        go('contractGate');
      }
      return;
    }
    if (action === 'search-id') {
      searchPerson(state.idInput || el.querySelector('#matchValues')?.value);
      return;
    }
    if (action === 'open-profile') {
      state.profileId = node.getAttribute('data-id');
      state.showCard = false;
      go('profile');
      return;
    }
    if (action === 'to-results') {
      go('results');
      return;
    }
    if (action === 'toggle-filters') {
      state.showFilters = !state.showFilters;
      renderProduct();
      return;
    }
    if (action === 'chip') {
      const key = node.getAttribute('data-chip');
      state.filters[key] = !state.filters[key];
      renderProduct();
      return;
    }
    if (action === 'toggle-card') {
      state.showCard = !state.showCard;
      renderProduct();
      return;
    }
    if (action === 'print-card') {
      window.print();
      return;
    }
    if (action === 'scan-qr') {
      state.verifyId = node.getAttribute('data-id');
      state.recaptcha = false;
      state.recaptchaMessage = '';
      go('verify');
      return;
    }
    if (action === 'verify-continue') {
      if (!state.recaptcha) {
        state.recaptchaMessage = 'Por favor, complete la verificación "No soy un robot"';
        renderProduct();
        return;
      }
      state.profileId = state.verifyId;
      go('profile');
      return;
    }
    if (action === 'check-password') {
      const value = el.querySelector('#accessCode')?.value ?? state.password;
      state.password = value;
      if (value === HINTS.contractorAccess) {
        state.passwordOk = true;
        state.passwordError = false;
        sessionStorage.setItem(CONTRACTOR_KEY, '1');
        renderProduct();
        setTimeout(() => go('contractCode'), 700);
      } else {
        state.passwordError = true;
        state.passwordOk = false;
        renderProduct();
      }
      return;
    }
    if (action === 'lookup-contract') {
      const code = (el.querySelector('#contractCode')?.value || state.contractCode).trim().toUpperCase();
      state.contractCode = code;
      setLoading(async () => {
        const found = DATA.contracts[code];
        if (!found) {
          state.contractError =
            code === ''
              ? 'Ingrese un código.'
              : 'No encontramos contratos con el código ingresado';
          go('contractCode');
          return;
        }
        state.contractError = '';
        state.selectedContract = found;
        state.results = [...found.roster];
        go('contractRoster');
      });
      return;
    }
    if (action === 'open-add') {
      state.showAdd = true;
      state.addId = '';
      state.recaptcha = false;
      renderProduct();
      return;
    }
    if (action === 'close-add') {
      state.showAdd = false;
      renderProduct();
      return;
    }
    if (action === 'add-person') {
      searchPerson(state.addId || el.querySelector('#addId')?.value, { fromAdd: true });
    }
  };

  guideEl.addEventListener('click', (event) => {
    const demo = event.target.closest('[data-demo]')?.getAttribute('data-demo');
    if (!demo) {
      return;
    }
    state.splash = false;
    state.recaptcha = true;
    if (demo === 'person') {
      state.idInput = HINTS.personId;
      state.results = [HINTS.personId];
      go('results');
    } else if (demo === 'second') {
      state.results = [HINTS.personId, HINTS.secondPersonId];
      go('results');
    } else if (demo === 'missing') {
      state.idInput = HINTS.missingId;
      go('notFound');
    } else if (demo === 'down') {
      state.retryable = true;
      go('unavailable');
    } else if (demo === 'captcha') {
      go('recaptchaFail');
    } else if (demo === 'qr') {
      state.verifyId = HINTS.personId;
      state.recaptcha = false;
      go('verify');
    } else if (demo === 'contract') {
      sessionStorage.setItem(CONTRACTOR_KEY, '1');
      state.contractCode = HINTS.contractCode;
      state.selectedContract = DATA.contracts[HINTS.contractCode];
      state.results = [...DATA.contracts[HINTS.contractCode].roster];
      go('contractRoster');
    }
  });

  document.getElementById('guide-toggle').addEventListener('click', () => {
    state.guideOpen = !state.guideOpen;
    renderGuide();
    document.getElementById('guide-toggle').setAttribute(
      'aria-expanded',
      String(state.guideOpen)
    );
  });

  window.addEventListener('popstate', () => {
    state.splash = false;
    const hash = location.hash || '#/';
    if (hash.startsWith('#/perfil/')) {
      state.profileId = hash.replace('#/perfil/', '');
      state.view = 'profile';
    } else if (hash.startsWith('#/verificar/')) {
      state.verifyId = hash.replace('#/verificar/', '');
      state.view = 'verify';
    } else if (hash === '#/cedula') {
      state.view = 'searchId';
    } else if (hash === '#/resultados') {
      state.view = 'results';
    } else if (hash === '#/contrato') {
      state.view = 'contractGate';
    } else if (hash === '#/contrato/codigo') {
      state.view = 'contractCode';
    } else if (hash === '#/contrato/grupo') {
      state.view = 'contractRoster';
    } else if (hash === '#/servicio-no-disponible') {
      state.view = 'unavailable';
    } else if (hash === '#/sin-resultados') {
      state.view = 'notFound';
    } else if (hash === '#/actividad-sospechosa') {
      state.view = 'recaptchaFail';
    } else {
      state.view = 'home';
    }
    renderProduct();
  });

  renderProduct();
  setTimeout(() => {
    state.splash = false;
    renderProduct();
  }, 1800);
})();
