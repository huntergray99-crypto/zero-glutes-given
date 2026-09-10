const TABS = [
  { key: 'home', label: 'Home' },
  { key: 'delivery', label: 'Delivery' },
];

export default function NavTabs({ tab, onChange }) {
  return (
    <nav className="navtabs" aria-label="Sections">
      {TABS.map((t) => (
        <button
          key={t.key}
          className={`navtab ${tab === t.key ? 'on' : ''}`}
          aria-current={tab === t.key ? 'page' : undefined}
          onClick={() => onChange(t.key)}
        >
          {t.label}
        </button>
      ))}
    </nav>
  );
}
