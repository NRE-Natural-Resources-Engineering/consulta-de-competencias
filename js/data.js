/**
 * Synthetic demonstration data only. No production records.
 */
window.NRE_COMPETENCIAS_DATA = {
  demoHints: {
    personId: '1001234567',
    secondPersonId: '1009876543',
    missingId: '1990000001',
    unavailableId: '1880000001',
    recaptchaFailId: '1770000001',
    contractCode: 'C-4801',
    missingContractCode: 'C-0000',
    contractorAccess: 'portafolio',
  },
  people: {
    '1001234567': {
      username: '1001234567',
      userFullname: 'Ana María Restrepo Gómez',
      contractor: 'Andes Servicios S.A.S.',
      contract: 'C-4801',
      job: 'Técnica de mantenimiento',
      locationName: 'Estación Norte',
      qualifications: [
        {
          programName: 'OQ',
          courseFullname: 'Operación segura de válvulas de bloqueo',
          availabilityStatus: 2,
          availabilityStatusName: 'VIGENTE HASTA: 2027-03-31',
          hasContract: 1,
        },
        {
          programName: 'HSE',
          courseFullname: 'Trabajo en alturas — módulo teórico',
          availabilityStatus: 1,
          availabilityStatusName: 'VENCE EN: 2026-10-15',
          hasContract: 1,
        },
        {
          programName: 'HSE',
          courseFullname: 'Espacios confinados',
          availabilityStatus: 0,
          availabilityStatusName: 'VENCIDO EN: 2026-04-30',
          hasContract: 1,
        },
        {
          programName: 'SRE',
          courseFullname: 'Inducción al sistema de referencia',
          availabilityStatus: 2,
          availabilityStatusName: 'VIGENTE HASTA: 2027-12-31',
          hasContract: 0,
        },
      ],
    },
    '1009876543': {
      username: '1009876543',
      userFullname: 'Carlos Eduardo Niño Ruiz',
      contractor: 'Andes Servicios S.A.S.',
      contract: 'C-4801',
      job: 'Supervisor de campo',
      locationName: 'Estación Norte',
      qualifications: [
        {
          programName: 'OQ',
          courseFullname: 'Inspección visual de línea',
          availabilityStatus: 2,
          availabilityStatusName: 'VIGENTE HASTA: 2027-01-20',
          hasContract: 1,
        },
        {
          programName: 'HSE',
          courseFullname: 'Primeros auxilios en campo',
          availabilityStatus: 2,
          availabilityStatusName: 'VIGENTE HASTA: 2026-11-30',
          hasContract: 1,
        },
      ],
    },
  },
  contracts: {
    'C-4801': {
      contractId: 4801,
      contractCode: 'C-4801',
      contractorName: 'Andes Servicios S.A.S.',
      displayName: 'C-4801 — Andes Servicios S.A.S.',
      roster: ['1001234567', '1009876543'],
    },
  },
  programs: ['OQ', 'HSE', 'SRE'],
};
