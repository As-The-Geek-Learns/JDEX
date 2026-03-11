import { Fragment } from 'react';
import { Home, ChevronRight } from 'lucide-react';

function Breadcrumb({ path, onNavigate }) {
  return (
    <nav className="flex items-center gap-2 text-sm mb-4">
      <button
        onClick={() => onNavigate('home')}
        className="text-slate-400 hover:text-teal-400 transition-colors"
      >
        <Home size={16} />
      </button>
      {path.map((item, index) => (
        <Fragment key={index}>
          <ChevronRight size={14} className="text-slate-600" />
          <button
            onClick={() => onNavigate(item.type, item.data)}
            className={`transition-colors ${
              index === path.length - 1
                ? 'text-teal-400 font-medium'
                : 'text-slate-400 hover:text-teal-400'
            }`}
          >
            {item.label}
          </button>
        </Fragment>
      ))}
    </nav>
  );
}

export default Breadcrumb;
