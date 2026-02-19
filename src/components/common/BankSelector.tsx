import { useState, useRef, useEffect } from 'react';

const MEXICAN_BANKS = [
  { code: '133', name: 'ACTINVER' },
  { code: '062', name: 'AFIRME' },
  { code: '721', name: 'Albo' },
  { code: '127', name: 'AZTECA' },
  { code: '030', name: 'BAJÍO' },
  { code: '002', name: 'BANAMEX (Citibanamex)' },
  { code: '137', name: 'BANCOPPEL' },
  { code: '160', name: 'BANCO S3' },
  { code: '152', name: 'BANCREA' },
  { code: '006', name: 'BANCOMEXT' },
  { code: '019', name: 'BANJERCITO' },
  { code: '147', name: 'BANKAOOL' },
  { code: '072', name: 'BANORTE' },
  { code: '058', name: 'BANREGIO' },
  { code: '060', name: 'BANSI' },
  { code: '145', name: 'BBASE' },
  { code: '012', name: 'BBVA MÉXICO' },
  { code: '112', name: 'BMONEX' },
  { code: '715', name: 'CASHI' },
  { code: '631', name: 'CI BOLSA' },
  { code: '124', name: 'CITI MÉXICO' },
  { code: '130', name: 'COMPARTAMOS' },
  { code: '140', name: 'CONSUBANCO' },
  { code: '723', name: 'Cuenca' },
  { code: '151', name: 'DONDE' },
  { code: '616', name: 'FINAMEX' },
  { code: '634', name: 'FINCOMUN' },
  { code: '699', name: 'FONDEADORA' },
  { code: '601', name: 'GBM' },
  { code: '167', name: 'HEY BANCO' },
  { code: '021', name: 'HSBC' },
  { code: '036', name: 'INBURSA' },
  { code: '150', name: 'INMOBILIARIO' },
  { code: '136', name: 'INTERCAM BANCO' },
  { code: '059', name: 'INVEX' },
  { code: '110', name: 'JP MORGAN' },
  { code: '128', name: 'KAPITAL' },
  { code: '661', name: 'KLAR' },
  { code: '722', name: 'Mercado Pago' },
  { code: '042', name: 'MIFEL' },
  { code: '132', name: 'MULTIVA BANCO' },
  { code: '638', name: 'NU MÉXICO' },
  { code: '148', name: 'PAGATODO' },
  { code: '014', name: 'SANTANDER' },
  { code: '044', name: 'SCOTIABANK' },
  { code: '728', name: 'SPIN BY OXXO' },
  { code: '646', name: 'STP' },
  { code: '684', name: 'TRANSFER' },
  { code: '138', name: 'UALÁ' },
  { code: '113', name: 'VE POR MAS' },
  { code: 'OTRO', name: 'Otro' },
];

interface BankSelectorProps {
  value: string;
  onChange: (bankName: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
}

export function BankSelector({
  value,
  onChange,
  label = 'Banco',
  placeholder = 'Buscar banco...',
  required = false,
}: BankSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredBanks = MEXICAN_BANKS.filter((bank) =>
    bank.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedBank = MEXICAN_BANKS.find((b) => b.name === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (bankName: string) => {
    onChange(bankName);
    setSearch('');
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="label mb-2 block">
          {label}
          {required && <span className="text-coral-500 ml-1">*</span>}
        </label>
      )}
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="input-field flex items-center justify-between text-left"
      >
        <span className={selectedBank ? 'text-sage-900' : 'text-sage-400'}>
          {selectedBank?.name || placeholder}
        </span>
        <svg
          className={`w-5 h-5 text-sage-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-sage-200 rounded-lg shadow-lg max-h-60 overflow-hidden">
          <div className="p-2 border-b border-sage-100">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-sage-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={placeholder}
                className="w-full pl-10 pr-3 py-2 text-sm border border-sage-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="overflow-y-auto max-h-40">
            {filteredBanks.length === 0 ? (
              <div className="px-4 py-3 text-sm text-sage-500 text-center">
                No se encontraron bancos
              </div>
            ) : (
              filteredBanks.map((bank) => (
                <button
                  key={bank.code}
                  type="button"
                  onClick={() => handleSelect(bank.name)}
                  className={`w-full px-4 py-2.5 text-left text-sm hover:bg-sage-50 transition-colors ${
                    bank.name === value ? 'bg-teal-50 text-teal-700 font-medium' : 'text-sage-700'
                  }`}
                >
                  {bank.name}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
