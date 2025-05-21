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
      
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden h-full">
        <div className="flex-none">
          <TopBar onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
        </div>
        <main className="flex-1 flex flex-col min-h-0 h-full">
          {tabBar}
        </main>
      </div>
    </div>
  );
};

export default Layout;
