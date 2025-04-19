import { FC } from 'react';
import { Bars3Icon } from '@heroicons/react/24/outline';

interface TopBarProps {
  onMenuClick: () => void;
}

const TopBar: FC<TopBarProps> = ({ onMenuClick }) => {
  return (
    <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6">
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 rounded-lg text-gray-600 dark:text-gray-300
            hover:bg-gray-100 dark:hover:bg-gray-700
            focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        >
          <Bars3Icon className="w-6 h-6" />
        </button>
        
        <div className="flex-1 flex justify-end">
          {/* Add any top-right actions here */}
        </div>
      </div>
    </header>
  );
};

export default TopBar;
