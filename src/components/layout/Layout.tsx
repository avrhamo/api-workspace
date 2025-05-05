import { FC, ReactNode, useState } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

interface LayoutProps {
  children: ReactNode;
  currentTool: string;
  setCurrentTool: (tool: string) => void;
  tabBar?: ReactNode;
}

const Layout: FC<LayoutProps> = ({ children, currentTool, setCurrentTool, tabBar }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="h-screen flex overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Sidebar 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen}
        currentTool={currentTool}
        setCurrentTool={setCurrentTool}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex flex-col">
          <TopBar onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
          {tabBar}
        </div>
        
        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
            <div className="min-h-[calc(100vh-8rem)] p-0">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
