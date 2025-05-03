import { FC } from 'react';
import { 
  CodeBracketIcon,
  KeyIcon,
  LockClosedIcon,
  CommandLineIcon,
  ClockIcon,
  DocumentTextIcon,
  CloudIcon,
  CubeTransparentIcon,
  XMarkIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { useTheme } from '../../hooks/useTheme';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  currentTool: string;
  setCurrentTool: (tool: string) => void;
}

const Sidebar: FC<SidebarProps> = ({ isOpen, setIsOpen, currentTool, setCurrentTool }) => {
  const { theme, setTheme } = useTheme();

  const tools = [
    { id: 'base64', name: 'Base64', icon: CodeBracketIcon },
    { id: 'rsa', name: 'RSA', icon: LockClosedIcon },
    { id: 'keytab', name: 'Keytab', icon: KeyIcon },
    { id: 'api-tester', name: 'API Tester', icon: CloudIcon },
    { id: 'kafka', name: 'Kafka Tester', icon: CommandLineIcon },
    { id: 'regex', name: 'Regex', icon: DocumentTextIcon },
    { id: 'time', name: 'Time Units', icon: ClockIcon },
    { id: 'bson', name: 'BSON Tools', icon: CubeTransparentIcon },
    { id: 'helm-secrets', name: 'Helm Secrets', icon: ShieldCheckIcon },
  ];

  return (
    <div 
      className={`
        fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0
        bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg
        border-r border-gray-200 dark:border-gray-700
        flex flex-col
      `}
    >
      {/* Logo Area */}
      <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-700">
        <span className="text-xl font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          API Workspace
        </span>
        <button
          onClick={() => setIsOpen(false)}
          className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setCurrentTool(tool.id)}
            className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl
              transition-all duration-150 ease-in-out
              ${currentTool === tool.id
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400'
              }
              focus:outline-none focus:ring-2 focus:ring-blue-500/40
              group`}
          >
            <tool.icon className="w-5 h-5 mr-3 transition-transform group-hover:scale-110" />
            <span className="truncate">{tool.name}</span>
          </button>
        ))}
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="w-full px-4 py-3 text-sm font-medium rounded-xl
            transition-all duration-150 ease-in-out
            text-gray-600 dark:text-gray-300
            hover:bg-blue-50 dark:hover:bg-gray-700
            hover:text-blue-600 dark:hover:text-blue-400
            focus:outline-none focus:ring-2 focus:ring-blue-500/40
            flex items-center justify-center"
        >
          {theme === 'dark' ? '🌞 Light Mode' : '🌙 Dark Mode'}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
