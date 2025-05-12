import { FC, useState } from 'react';
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
  ChevronDownIcon,
  ChevronRightIcon,
  FaceSmileIcon,
} from '@heroicons/react/24/outline';
import { useTheme } from '../../hooks/useTheme';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  currentTool: string;
  setCurrentTool: (tool: string) => void;
}

const groupedTools = [
  {
    group: 'API & Network',
    id: 'api-network',
    tools: [
      { id: 'api-tester', name: 'API Tester', icon: CloudIcon },
      { id: 'kafka', name: 'Kafka Tester', icon: CommandLineIcon },
    ],
  },
  {
    group: 'Data & Format',
    id: 'data-format',
    tools: [
      { id: 'base64', name: 'Base64', icon: CodeBracketIcon },
      { id: 'bson', name: 'BSON Tools', icon: CubeTransparentIcon },
      { id: 'regex', name: 'Regex', icon: DocumentTextIcon },
      { id: 'time', name: 'Time Units', icon: ClockIcon },
    ],
  },
  {
    group: 'Security & Auth',
    id: 'security-auth',
    tools: [
      { id: 'rsa', name: 'RSA', icon: LockClosedIcon },
      { id: 'keytab', name: 'Keytab', icon: KeyIcon },
      { id: 'helm-secrets', name: 'Helm Secrets', icon: ShieldCheckIcon },
    ],
  },
  {
    group: 'Utilities',
    id: 'utilities',
    tools: [
      { id: 'port-killer', name: 'Port Killer', icon: KeyIcon },
    ],
  },
];

const Sidebar: FC<SidebarProps> = ({ isOpen, setIsOpen, currentTool, setCurrentTool }) => {
  const { theme, setTheme } = useTheme();
  const [openGroups, setOpenGroups] = useState(() => groupedTools.map(g => g.id));

  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    );
  };

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

      {/* Navigation - Grouped */}
      <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
        {groupedTools.map((group) => (
          <div key={group.id} className="mb-2">
            <button
              onClick={() => toggleGroup(group.id)}
              className="flex items-center w-full px-2 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-300 focus:outline-none"
              aria-expanded={openGroups.includes(group.id)}
              title={`Toggle ${group.group} group`}
            >
              {openGroups.includes(group.id) ? (
                <ChevronDownIcon className="w-4 h-4 mr-2" />
              ) : (
                <ChevronRightIcon className="w-4 h-4 mr-2" />
              )}
              {group.group}
            </button>
            {openGroups.includes(group.id) && (
              <div className="space-y-1 ml-2 mt-1">
                {group.tools.map((tool) => (
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
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex flex-col gap-2">
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
        <button
          onClick={() => setCurrentTool('waiting-room')}
          className="w-full px-4 py-3 text-sm font-medium rounded-xl
            transition-all duration-150 ease-in-out
            text-gray-600 dark:text-gray-300
            hover:bg-green-50 dark:hover:bg-gray-700
            hover:text-green-600 dark:hover:text-green-400
            focus:outline-none focus:ring-2 focus:ring-green-500/40
            flex items-center justify-center"
          title="Waiting Room: Play a game while you wait!"
        >
          <FaceSmileIcon className="w-5 h-5 mr-2" />
          Waiting Room
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
