const fs = require('fs');
const file = 'src/app/dashboard/pos/salon/page.tsx';
let txt = fs.readFileSync(file, 'utf8');

const startStr = '{/* Header - Clean Touch-Friendly Design */}';
const endStr = '{/* Main Content Area - Responsive padding */}';

const startIndex = txt.indexOf(startStr);
const endIndex = txt.indexOf(endStr);

if (startIndex !== -1 && endIndex !== -1) {
    const newHeader = `{/* =========================================================
    PREMIUM TOP RAIL / HEADER
    ========================================================= */}
<header className="px-3 py-3 bg-[#0a0a0a]">
  <div className="top-rail">
    
    {/* 1. LEFT GROUP: Navigation & Views */}
    <div className="top-rail-group top-rail-left">
      <button 
        className="rail-icon-btn"
        onClick={() => {
            const event = new CustomEvent('toggleSidebar')
            window.dispatchEvent(event)
        }}
        aria-label="Menu"
      >
        <Menu size={20} />
      </button>

      <div className="top-rail-divider" />

      <div className="rail-segment">
        <button 
          className={\`rail-btn ${view === 'POS' ? 'active' : ''}\ }
          onClick={() => setView('POS')}
        >
          <Grid size={16} />
          <span>Register</span>
        </button>
        <button 
          className={\`rail-btn ${view === 'HISTORY' ? 'active' : ''}\`}
          onClick={() => setView('HISTORY')}
        >
          <History size={16} />
          <span>History</span>
        </button>
      </div>
    </div>

    {/* 2. CENTER GROUP: Active Employee Area */}
    <div className="top-rail-group top-rail-center ml-auto mr-auto">
      <button 
        className="staff-selector"
        title="Selecting staff"
      >
        <User size={16} className="text-[#f3dfab]" />
        <select
            value={selectedBarber?.id || ''}
            onChange={(e) => {
                const barber = barberList.find(b => b.id === e.target.value)
                setSelectedBarber(barber || null)
                if (barber) setSelectedCategory('BARBER_SERVICE')
            }}
            className="bg-transparent border-none outline-none appearance-none cursor-pointer absolute inset-0 opacity-0"
        >
            <option value="">Select Staff</option>
            {barberList.map(barber => (
                <option key={barber.id} value={barber.id}>
                    {barber.name}
                </option>
            ))}
        </select>
        <span>{selectedBarber?.name || 'SELECT STAFF'}</span>
      </button>
    </div>

    {/* 3. RIGHT GROUP: Primary Actions & Utilities */}
    <div className="top-rail-group top-rail-right">
      <button 
        className="new-action-btn"
        onClick={() => {
            if (!shift) setShowShiftModal(true)
            else setShowCheckInModal(true)
        }}
      >
        <Plus size={16} className="text-[#d4a94d]" />
        <span>New Guest</span>
      </button>

      <div className="top-rail-divider" />

      <button 
        className="rail-icon-btn gold"
        onClick={() => {
            if (isDrawerManager) setShowPaidInOutModal(true)
            else setToast({ message: 'Drawer management unavailable', type: 'error' })
        }}
        title=&Drawer Options"
      >
        <Banknote size={18} />
      </button>
      
      <button 
        className={\`rail-icon-btn ${shift ? 'text-emerald-400' : 'text-stone-400'}\`}
        onClick={() => setShowShiftModal(true)} 
        title="Shift Management"
      >
        <Clock size={18} />
      </button>

      <button 
        className="rail-icon-btn"
        onClick={() => setShowStoreEodModal(true)}
        title="Z-Report / End of Day"
      >
        <Monitor size={18} />
      </button>
    </div>
    
  </div>
</header>
`;

    txt = txt.substring(0, startIndex) + newHeader + '\n' + txt.substring(endIndex);
    fs.writeFileSync(file, txt);
    console.log('Replaced successfully');
} else {
    console.log('Not found');
}
